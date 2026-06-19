// scripts/etl/migrate.mjs
// -----------------------------------------------------------------------------
// B3 ETL — migrate Learning Hub data INTO the unified LMS DB.
//
//   DRY-RUN (default): reads both DBs, computes every mapping, validates, writes
//   a report. Touches NOTHING. Safe to run against prod right now.
//   COMMIT:  node scripts/etl/migrate.mjs --commit
//            Requires the A6 DDL already applied to the TARGET. Performs writes.
//
// Run from repo root (loads .env.local for keys, same as backup-storage.mjs):
//   node scripts/etl/migrate.mjs
//   node scripts/etl/migrate.mjs --commit
//
// Phases:
//   0 connect + preconditions
//   1 school -> branch map
//   2 users: students (link/create) + staff (create)   -> hub_user_map
//   3 onboard ALL active LMS students into auth.users
//   4 migrate additive tables (FK rewrites)
//   5 classes -> course_slots(kind=class), class_members -> slot_students
//   6 report
// -----------------------------------------------------------------------------
import "./load-env.mjs"; // populate process.env from .env.local before config is read
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SOURCE, TARGET, ROLE_MAP, EMAIL, SCHOOL_BRANCH_CODE_FALLBACK, LINK_HUB_SUPERADMIN,
  CREATED_STUDENT_ID_PAD, CREATED_STUDENT_DEFAULTS, MIGRATE_TABLES,
} from "./config.mjs";

// Anchor the report path to THIS file (scripts/etl/), so cwd doesn't matter.
const HERE = dirname(fileURLToPath(import.meta.url));

const COMMIT = process.argv.includes("--commit");
const tag = COMMIT ? "COMMIT" : "DRY-RUN";
const report = { mode: tag, phases: {}, anomalies: [] };
const note = (m) => { console.log(m); };
const anomaly = (m) => { report.anomalies.push(m); console.warn("  ! " + m); };

// ---- helpers ----------------------------------------------------------------
async function fetchAll(db, table, columns = "*") {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`read ${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function authEmailMap(db) {
  // lower(email) -> auth user id, across all pages.
  const map = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return map;
}

async function ensureAuthUser(db, email, password, meta) {
  // Idempotent: reuse if the email already exists, else create. COMMIT-only.
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: meta,
  });
  if (!error) return data.user.id;
  if (/already.*registered|exists/i.test(error.message)) {
    const m = await authEmailMap(db);
    const id = m.get(email.toLowerCase());
    if (id) return id;
  }
  throw new Error(`createUser ${email}: ${error.message}`);
}

// =============================================================================
async function main() {
  if (!SOURCE.key || !TARGET.key) {
    throw new Error("Missing keys. Set HUB_SERVICE_ROLE_KEY and (LMS|SUPABASE)_SERVICE_ROLE_KEY.");
  }
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const hub = createClient(SOURCE.url, SOURCE.key, opts);
  const lms = createClient(TARGET.url, TARGET.key, opts);
  note(`\n=== Hub -> LMS ETL [${tag}] ===`);

  // --- Phase 0: preconditions ------------------------------------------------
  const a6 = await lms.from("slot_students").select("slot_id").limit(1);
  const a6Applied = !a6.error;
  note(`Phase 0  A6 applied on target: ${a6Applied ? "yes" : "NO"}`);
  if (COMMIT && !a6Applied) {
    throw new Error("A6 DDL not applied to target (slot_students missing). Apply A6-canonical-ddl.sql first.");
  }
  if (!a6Applied) anomaly("A6 not applied yet — dry-run will still compute the plan; --commit will refuse.");

  // --- Phase 1: school -> branch map ----------------------------------------
  const schools = await fetchAll(hub, "schools", "id,name");
  const branches = await fetchAll(lms, "branches", "id,name,code");
  const branchByName = new Map(branches.map((b) => [b.name.trim().toLowerCase(), b]));
  const schoolBranch = new Map(); // hub school id -> branch row
  for (const s of schools) {
    const b = branchByName.get(s.name.trim().toLowerCase());
    if (b) schoolBranch.set(s.id, b);
    else anomaly(`school '${s.name}' (${s.id}) has no LMS branch by name — create/map it (e.g. Global Ark=GAIS via A6).`);
  }
  report.phases.school_map = schools.map((s) => ({
    school: s.name, mapped_branch: schoolBranch.get(s.id)?.name ?? null,
    branch_code: schoolBranch.get(s.id)?.code ?? null,
  }));
  note(`Phase 1  mapped ${schoolBranch.size}/${schools.length} schools to branches`);
  if (COMMIT && schoolBranch.size === schools.length) {
    for (const s of schools) {
      await lms.from("school_branch_map").upsert(
        { hub_school_id: s.id, branch_id: schoolBranch.get(s.id).id, hub_school_name: s.name },
        { onConflict: "hub_school_id" });
    }
  } else if (COMMIT) {
    throw new Error("Not all schools map to a branch — fix before committing.");
  }

  // --- Phase 2: users -> students (link/create) + staff (create) ------------
  const hubUsers = await fetchAll(hub, "users", "id,username,full_name,role,school_id,verification_id");
  // auth_id only exists after A6; in a pre-A6 dry-run, omit it (everyone needs onboarding).
  const studentCols = "id,student_id,branch_id,name,username,deleted_at" + (a6Applied ? ",auth_id" : "");
  const lmsStudents = await fetchAll(lms, "students", studentCols);
  const studentByStudentId = new Map();
  for (const st of lmsStudents) {
    if (st.student_id && !st.deleted_at) studentByStudentId.set(st.student_id.trim().toLowerCase(), st);
  }
  // Existing LMS super_admin — Hub super-admin links to it (no 2nd god account).
  const { data: superRows } = await lms.from("users").select("id,name,email").eq("role", "super_admin").is("deleted_at", null);
  const existingSuperAdminId = superRows?.[0]?.id ?? null;
  // Idempotency: reuse rows a prior --commit already created (hub_user_map persists them).
  const { data: existingMapRows } = await lms.from("hub_user_map").select("hub_user_id,student_id,user_id,disposition");
  const existingMap = new Map((existingMapRows || []).map((r) => [r.hub_user_id, r]));

  // Per-branch placeholder id allocator: numeric code -> ADV<code>-####, else <code>-####.
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name]));
  const prefixSeq = new Map();
  const prefixFor = (code) => (/^\d+$/.test(code) ? `ADV${code}-` : `${code}-`);
  const nextStudentId = (code) => {
    const prefix = prefixFor(code);
    if (!prefixSeq.has(prefix)) {
      let max = 0;
      for (const st of lmsStudents) {
        const id = st.student_id || "";
        if (id.startsWith(prefix)) {
          const n = parseInt(id.slice(prefix.length).replace(/\D/g, ""), 10);
          if (Number.isFinite(n)) max = Math.max(max, n);
        }
      }
      prefixSeq.set(prefix, max);
    }
    const n = prefixSeq.get(prefix) + 1;
    prefixSeq.set(prefix, n);
    return prefix + String(n).padStart(CREATED_STUDENT_ID_PAD, "0");
  };

  const hubUserMap = new Map(); // hub user id -> { kind, studentId|userId, disposition, done? }
  const created = { students: [], staff: [] };
  let linked = 0, linkedStaff = 0, reusedStudents = 0, reusedStaff = 0;

  for (const u of hubUsers) {
    if (u.role === "school-student") {
      const vid = (u.verification_id || "").trim();
      const match = vid ? studentByStudentId.get(vid.toLowerCase()) : null;
      const prior = existingMap.get(u.id);
      if (match) {
        hubUserMap.set(u.id, { kind: "student", studentId: match.id, disposition: "linked" });
        linked++;
      } else if (prior?.student_id) { // created in a prior --commit — reuse, don't re-create
        hubUserMap.set(u.id, { kind: "student", studentId: prior.student_id, disposition: "created", done: true });
        reusedStudents++;
      } else {
        const branch = schoolBranch.get(u.school_id);
        const code = branch?.code ?? SCHOOL_BRANCH_CODE_FALLBACK[schoolNameById.get(u.school_id)] ?? "NEW";
        const newStudentId = nextStudentId(code);
        const rec = {
          kind: "student", disposition: "created", studentId: null, // filled on commit
          plan: { student_id: newStudentId, name: u.full_name || u.username,
            branch: branch?.name ?? schoolNameById.get(u.school_id) ?? null, branch_code: code,
            hub_verification_id: vid || null, username_temp: newStudentId },
        };
        hubUserMap.set(u.id, rec);
        created.students.push({ hubUserId: u.id, ...rec.plan });
        if (!branch) anomaly(`created student ${newStudentId} branch '${schoolNameById.get(u.school_id)}' not yet in LMS (resolves after A6 creates it).`);
      }
    } else {
      const role = ROLE_MAP[u.role];
      if (!role) { anomaly(`unknown hub role '${u.role}' for user ${u.id} — skipped.`); continue; }
      if (role === "super_admin" && LINK_HUB_SUPERADMIN && existingSuperAdminId) {
        hubUserMap.set(u.id, { kind: "staff", userId: existingSuperAdminId, disposition: "linked" });
        linkedStaff++;
        continue;
      }
      const prior = existingMap.get(u.id);
      if (prior?.user_id) { // created in a prior --commit — reuse
        hubUserMap.set(u.id, { kind: "staff", userId: prior.user_id, disposition: "created", done: true });
        reusedStaff++;
        continue;
      }
      if (role === "super_admin") anomaly(`Hub super-admin ${u.id}: no existing LMS super_admin to link — will CREATE.`);
      const branch = schoolBranch.get(u.school_id);
      const email = `${(u.username || u.id).toLowerCase()}@${EMAIL.staffDomain}`;
      const rec = { kind: "staff", disposition: "created", userId: null,
        plan: { name: u.full_name || u.username, role, branch: branch?.name ?? null, email } };
      hubUserMap.set(u.id, rec);
      created.staff.push({ hubUserId: u.id, ...rec.plan });
    }
  }
  report.phases.users = {
    hub_total: hubUsers.length, students_linked: linked, students_created: created.students.length,
    students_reused: reusedStudents, staff_linked: linkedStaff, staff_created: created.staff.length,
    staff_reused: reusedStaff, created_students_sample: created.students.slice(0, 10), created_staff: created.staff,
  };
  note(`Phase 2  students: ${linked} linked, ${created.students.length} created, ${reusedStudents} reused; staff: ${linkedStaff} linked, ${created.staff.length} created, ${reusedStaff} reused`);

  if (COMMIT) {
    // create student rows
    for (const u of hubUsers.filter((x) => x.role === "school-student")) {
      const rec = hubUserMap.get(u.id);
      if (rec.disposition !== "created" || rec.done) continue;
      const branch = schoolBranch.get(u.school_id);
      const { data, error } = await lms.from("students").insert({
        student_id: rec.plan.student_id, name: rec.plan.name, branch_id: branch.id,
        username: rec.plan.username_temp, ...CREATED_STUDENT_DEFAULTS,
      }).select("id").single();
      if (error) throw new Error(`insert student ${rec.plan.student_id}: ${error.message}`);
      rec.studentId = data.id;
    }
    // create staff users + auth (skip those linked to an existing LMS account)
    for (const u of hubUsers.filter((x) => ROLE_MAP[x.role])) {
      const rec = hubUserMap.get(u.id);
      if (rec.disposition === "linked" || rec.done) continue;
      const branch = schoolBranch.get(u.school_id);
      const authId = await ensureAuthUser(lms, rec.plan.email, u.username, { source: "hub", hub_user_id: u.id });
      const { data, error } = await lms.from("users").insert({
        name: rec.plan.name, role: rec.plan.role, email: rec.plan.email,
        branch_id: branch?.id ?? null, auth_id: authId,
      }).select("id").single();
      if (error) throw new Error(`insert staff ${rec.plan.email}: ${error.message}`);
      rec.userId = data.id;
    }
    // persist hub_user_map
    const rows = [...hubUserMap.entries()].map(([hubId, r]) => ({
      hub_user_id: hubId, kind: r.kind, student_id: r.studentId ?? null,
      user_id: r.userId ?? null, disposition: r.disposition,
    }));
    for (let i = 0; i < rows.length; i += 200)
      await lms.from("hub_user_map").upsert(rows.slice(i, i + 200), { onConflict: "hub_user_id" });
  }

  // --- Phase 3: onboard ALL active LMS students into auth.users -------------
  const activeStudents = lmsStudents.filter((s) => !s.deleted_at);
  const needAuth = activeStudents.filter((s) => !s.auth_id && s.student_id);
  report.phases.student_auth = {
    active: activeStudents.length, already_linked: activeStudents.length - needAuth.length,
    to_onboard: needAuth.length, plus_created: created.students.length,
  };
  note(`Phase 3  onboard ${needAuth.length} existing + ${created.students.length} created students to auth.users`);
  if (COMMIT) {
    const existingAuth = await authEmailMap(lms);
    const onboard = async (student_id, studentRowId) => {
      const email = `${student_id.toLowerCase()}@${EMAIL.studentDomain}`;
      const authId = existingAuth.get(email) ??
        await ensureAuthUser(lms, email, student_id, { source: "lms-student", student_id });
      const { error } = await lms.from("students").update({ auth_id: authId }).eq("id", studentRowId);
      if (error) throw new Error(`set auth_id for ${student_id}: ${error.message}`);
    };
    for (const s of needAuth) await onboard(s.student_id, s.id);
    for (const u of hubUsers.filter((x) => x.role === "school-student")) {
      const rec = hubUserMap.get(u.id);
      if (rec.disposition === "created" && !rec.done && rec.studentId) await onboard(rec.plan.student_id, rec.studentId);
    }
  }

  // --- Phase 4: migrate additive tables (FK rewrites) -----------------------
  const resolveOwner = (hubUserId) => hubUserMap.get(hubUserId)?.studentId ?? null;
  const resolveStaff = (hubUserId) => {
    const r = hubUserMap.get(hubUserId);
    return r?.kind === "staff" ? r.userId : null; // students approving nothing
  };
  const resolveBranch = (hubSchoolId) => schoolBranch.get(hubSchoolId)?.id ?? null;

  report.phases.migrate = {};
  for (const cfg of MIGRATE_TABLES) {
    const rows = await fetchAll(hub, cfg.table);
    let unresolvedOwner = 0, unresolvedSchool = 0;
    const mapped = rows.map((r) => {
      const out = { ...r };
      if (cfg.owner) {
        const sid = resolveOwner(r[cfg.owner]);
        if (!sid && !COMMIT) unresolvedOwner++; // dry-run: created students have no id yet
        out.student_id = sid; delete out[cfg.owner];
      }
      if (cfg.schoolCol) {
        const bid = resolveBranch(r[cfg.schoolCol]);
        if (!bid) unresolvedSchool++;
        out.branch_id = bid; delete out[cfg.schoolCol];
      }
      for (const sc of cfg.staffCols) out[sc] = r[sc] ? resolveStaff(r[sc]) : null;
      return out;
    });
    report.phases.migrate[cfg.table] = {
      rows: rows.length,
      note: cfg.owner && unresolvedOwner ? `${unresolvedOwner} owner refs resolve to created students (ids assigned on --commit)` : undefined,
      unresolved_school: unresolvedSchool || undefined,
    };
    note(`Phase 4  ${cfg.table}: ${rows.length} rows${unresolvedSchool ? ` (! ${unresolvedSchool} unmapped school)` : ""}`);
    if (COMMIT) {
      for (let i = 0; i < mapped.length; i += 200)
        if (mapped.length) {
          const { error } = await lms.from(cfg.table).upsert(mapped.slice(i, i + 200), { onConflict: cfg.conflict || "id" });
          if (error) throw new Error(`migrate ${cfg.table}: ${error.message}`);
        }
    }
  }

  // --- Phase 5: classes -> course_slots(kind=class); class_members -> slot_students
  const classes = await fetchAll(hub, "classes");
  const classMembers = await fetchAll(hub, "class_members");
  report.phases.classes = { classes: classes.length, members: classMembers.length };
  note(`Phase 5  ${classes.length} classes -> class-slots, ${classMembers.length} members -> slot_students`);
  if (COMMIT) {
    for (const c of classes) {
      const branchId = resolveBranch(c.school_id);
      const { error } = await lms.from("course_slots").upsert({
        id: c.id, kind: "class", name: c.name, branch_id: branchId,
        teacher_in_charge: resolveStaff(c.created_by),
      }, { onConflict: "id" });
      if (error) throw new Error(`class->slot ${c.id}: ${error.message}`);
    }
    const memberRows = classMembers.map((m) => ({
      slot_id: m.class_id, student_id: resolveOwner(m.user_id), branch_id: resolveBranch(m.school_id),
    })).filter((m) => m.student_id && m.slot_id);
    for (let i = 0; i < memberRows.length; i += 200)
      if (memberRows.length) {
        const { error } = await lms.from("slot_students").upsert(memberRows.slice(i, i + 200), { onConflict: "slot_id,student_id" });
        if (error) throw new Error(`class_members->slot_students: ${error.message}`);
      }
  }

  // --- Phase 6: report -------------------------------------------------------
  const path = join(HERE, "etl-report.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  note(`\n${tag} complete. ${report.anomalies.length} anomaly(ies). Report -> ${path}`);
  if (!COMMIT) note("This was a DRY-RUN — nothing was written. Re-run with --commit after applying A6.");
}

main().catch((e) => { console.error("\nETL FAILED:", e.message); process.exit(1); });
