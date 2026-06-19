// scripts/import-kepong-students.mjs
// One-off import of the Kepong student roster from a CSV.
// Idempotent: re-running skips existing students (by student_id), existing
// enrollments (by student+course), and existing parent links.
//   Dry run (default):  node scripts/import-kepong-students.mjs "<csv>"
//   Commit:             node scripts/import-kepong-students.mjs "<csv>" --commit
import "./etl/load-env.mjs";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL = "https://kbzrdsxzzqzbxqgwpsuq.supabase.co";
const KEY = process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Missing LMS_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const COMMIT = process.argv.includes("--commit");
const CSV =
  process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ||
  "C:/Users/User/Downloads/users info.xlsx - Users.csv";
const BRANCH_KEPONG = "78d12755-6828-4b14-9437-ec4886b5ac82";

const db = createClient(URL, KEY, { auth: { persistSession: false } });

// ── parse CSV (no quoted fields in this file) ──
const lines = readFileSync(CSV, "utf8").split(/\r?\n/).filter((l) => l.trim());
lines.shift(); // header
const rows = lines
  .map((l) => {
    const c = l.split(",");
    return {
      username: c[0]?.trim(),
      name: c[1]?.trim(),
      studentId: c[2]?.trim(),
      branch: c[3]?.trim(),
      course: c[5]?.trim(),
      parentName: c[6]?.trim(),
      parentPhone: c[7]?.trim() || null,
    };
  })
  .filter((r) => r.studentId && r.name);

// ── course mapping (Kepong) ──
const { data: courses } = await db
  .from("courses")
  .select("id, lesson_catalog")
  .eq("branch_id", BRANCH_KEPONG)
  .is("deleted_at", null);
const courseByCat = new Map(
  (courses ?? []).map((c) => [String(c.lesson_catalog ?? "").toLowerCase(), c.id]),
);
function courseIdFor(courseName) {
  const k = String(courseName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (k.startsWith("ev3")) return courseByCat.get("ev3");
  if (k.startsWith("python")) return courseByCat.get("python");
  if (k.startsWith("arduino")) return courseByCat.get("arduino");
  if (k.startsWith("scratch")) return courseByCat.get("scratch");
  if (k.startsWith("web")) return courseByCat.get("webapp");
  return null;
}

const rep = {
  rows: rows.length,
  studentsCreated: 0,
  studentsExisting: 0,
  parentsCreated: 0,
  linksCreated: 0,
  enrollmentsCreated: 0,
  enrollmentsExisting: 0,
  errors: [],
};
const parentCache = new Map(); // `${name}|${phone}` -> parent_id

for (const r of rows) {
  try {
    // ── student (by student_id) ──
    const { data: stu } = await db
      .from("students")
      .select("id")
      .eq("student_id", r.studentId)
      .is("deleted_at", null)
      .maybeSingle();

    let studentUuid;
    if (stu) {
      studentUuid = stu.id;
      rep.studentsExisting++;
      if (COMMIT) {
        await db
          .from("students")
          .update({ branch_id: BRANCH_KEPONG, username: r.username })
          .eq("id", studentUuid);
      }
    } else if (COMMIT) {
      const { data: ins, error } = await db
        .from("students")
        .insert({
          student_id: r.studentId,
          name: r.name,
          branch_id: BRANCH_KEPONG,
          username: r.username,
          level: 1,
          adcoin_balance: 0,
        })
        .select("id")
        .single();
      if (error) throw new Error("student insert: " + error.message);
      studentUuid = ins.id;
      rep.studentsCreated++;
    } else {
      rep.studentsCreated++; // dry run: would create
    }

    // ── parent (dedup by name+phone) + link ──
    if (r.parentName) {
      const pkey = `${r.parentName.toLowerCase()}|${r.parentPhone ?? ""}`;
      let parentId = parentCache.get(pkey);
      if (!parentId) {
        let q = db.from("parents").select("id").ilike("name", r.parentName).is("deleted_at", null);
        q = r.parentPhone ? q.eq("phone", r.parentPhone) : q.is("phone", null);
        const { data: ex } = await q.maybeSingle();
        if (ex) {
          parentId = ex.id;
        } else if (COMMIT) {
          const { data: np, error } = await db
            .from("parents")
            .insert({ name: r.parentName, phone: r.parentPhone })
            .select("id")
            .single();
          if (error) throw new Error("parent insert: " + error.message);
          parentId = np.id;
          rep.parentsCreated++;
        } else {
          parentId = `dry:${pkey}`;
          rep.parentsCreated++;
        }
        parentCache.set(pkey, parentId);
      }
      if (COMMIT && studentUuid && !String(parentId).startsWith("dry:")) {
        const { data: link } = await db
          .from("parent_students")
          .select("id")
          .eq("parent_id", parentId)
          .eq("student_id", studentUuid)
          .maybeSingle();
        if (!link) {
          const { error } = await db
            .from("parent_students")
            .insert({ parent_id: parentId, student_id: studentUuid, relationship: "parent" });
          if (!error) rep.linksCreated++;
        }
      } else if (!COMMIT) {
        rep.linksCreated++;
      }
    }

    // ── enrollment (by student+course) ──
    const courseId = courseIdFor(r.course);
    if (courseId) {
      if (COMMIT && studentUuid) {
        const { data: enr } = await db
          .from("enrollments")
          .select("id")
          .eq("student_id", studentUuid)
          .eq("course_id", courseId)
          .is("deleted_at", null)
          .maybeSingle();
        if (enr) {
          rep.enrollmentsExisting++;
        } else {
          const { error } = await db.from("enrollments").insert({
            student_id: studentUuid,
            course_id: courseId,
            status: "active",
            level: 1,
            sessions_remaining: 0,
            enrolled_at: new Date().toISOString(),
          });
          if (error) throw new Error("enrollment insert: " + error.message);
          rep.enrollmentsCreated++;
        }
      } else if (!COMMIT) {
        rep.enrollmentsCreated++;
      }
    } else if (r.course) {
      rep.errors.push(`${r.name}: unknown course "${r.course}"`);
    }
  } catch (e) {
    rep.errors.push(`${r.name} (${r.studentId}): ${e.message}`);
  }
}

console.log(COMMIT ? "=== COMMIT ===" : "=== DRY RUN (no writes) ===");
console.log(JSON.stringify(rep, null, 2));
