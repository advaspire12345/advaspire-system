#!/usr/bin/env node
// Simulator runner — entry point.
//   node scripts/simulator/runner.mjs                       # list scenarios
//   node scripts/simulator/runner.mjs <name>                # run a scenario
//   node scripts/simulator/runner.mjs new                   # interactive builder
//   node scripts/simulator/runner.mjs actions               # list actions
//   node scripts/simulator/runner.mjs actions show <id>     # action schema

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parse, stringify } from "yaml";

import { ACTIONS, listActions, showAction } from "./actions/index.mjs";

// Apply fixture-aware defaults to action args. The most common case is `branch`
// — every action that takes one should default to the fixture branch (which
// has a generated `__sim_<runId>_<name>` full name). Same for `course`.
function applyFixtureDefaults(args, _actionId, fixtures) {
  const out = { ...args };
  // Branch dropdown displays the CITY for non-super_admin roles (most actors).
  if (out.branch == null && fixtures.branchCity) out.branch = fixtures.branchCity;
  // Course dropdowns show the full name; map bare scenario name → fixture full name.
  if (typeof out.course === "string" && fixtures.courseName) {
    if (!out.course.startsWith(`__sim_${fixtures.runId}_`)) {
      const baseName = fixtures.courseName.replace(`__sim_${fixtures.runId}_`, "");
      if (out.course === baseName) out.course = fixtures.courseName;
    }
  }
  return out;
}

// Resolve "TODAY" and "TODAY+N" / "TODAY-N" date placeholders inside step args.
function resolveDatePlaceholders(obj) {
  if (obj == null) return obj;
  if (typeof obj === "string") {
    const m = obj.match(/^TODAY(?:([+-])(\d+))?$/);
    if (!m) return obj;
    const sign = m[1] === "-" ? -1 : 1;
    const days = m[2] ? sign * parseInt(m[2]) : 0;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  if (Array.isArray(obj)) return obj.map(resolveDatePlaceholders);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveDatePlaceholders(v);
    return out;
  }
  return obj;
}
import { db, snapshotForRun } from "./helpers/db.mjs";
import { createTestUser, deleteAllTestUsersForRun, simAuthProfileName } from "./helpers/auth.mjs";
import { Browser } from "./helpers/ui.mjs";
import { compare, isFailure } from "./helpers/diff.mjs";
import { findRowMap, extractTableHeaders, getSessionsRemainingFromModal } from "./helpers/extract.mjs";
import { makeRunDir, writeReport } from "./helpers/report.mjs";

const SCENARIOS_DIR = resolve(process.cwd(), ".claude/skills/lms-simulator/scenarios");

// ---------- CLI ----------

const args = process.argv.slice(2);
const cmd = args[0] ?? "list";

if (cmd === "list" || cmd === undefined) {
  const files = existsSync(SCENARIOS_DIR) ? readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".yaml")) : [];
  console.log("Available scenarios:");
  for (const f of files) console.log(`  - ${f.replace(/\.yaml$/, "")}`);
  console.log("\nUsage:");
  console.log("  node scripts/simulator/runner.mjs <scenario-name>");
  console.log("  node scripts/simulator/runner.mjs new");
  console.log("  node scripts/simulator/runner.mjs actions [show <id>]");
  process.exit(0);
}

if (cmd === "actions") {
  const sub = args[1];
  if (sub === "show") {
    console.log(showAction(args[2]));
    process.exit(0);
  }
  // default: list
  for (const a of listActions()) {
    console.log(`${a.id}  —  ${a.description}`);
    if (a.requiredFields.length) console.log(`   required: ${a.requiredFields.join(", ")}`);
  }
  process.exit(0);
}

if (cmd === "new") {
  await interactiveBuilder();
  process.exit(0);
}

// Otherwise, treat as scenario name
const scenarioName = cmd;
const scenarioPath = join(SCENARIOS_DIR, `${scenarioName}.yaml`);
if (!existsSync(scenarioPath)) {
  console.error(`Scenario not found: ${scenarioPath}`);
  process.exit(1);
}
const scenario = parse(readFileSync(scenarioPath, "utf8"));
await runScenario(scenario);

// ---------- Scenario runner ----------

async function runScenario(scenario) {
  const runId = Math.random().toString(36).slice(2, 8);
  const runDir = makeRunDir();
  console.log(`▶ Run ${runId} — ${scenario.name}`);
  console.log(`  output: ${runDir}`);

  const fixtures = { runId, branchId: null, branchName: null, courseId: null, courseName: null, packageId: null, users: [], createdVoucherCodes: [] };
  const browsers = new Map(); // handle -> Browser
  const stepsLog = [];
  const diffs = [];

  try {
    await setupFixtures(scenario, fixtures);

    // Open one browser session per user. Stagger to avoid daemon overload.
    for (const u of fixtures.users) {
      const session = `sim-${runId}-${u.handle}`;
      const b = new Browser({ session, profile: u.profile });
      b.login();
      browsers.set(u.handle, b);
      // brief stagger so the daemon doesn't choke on 4 simultaneous sessions
      await new Promise((r) => setTimeout(r, 300));
    }

    // Execute steps.
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepIdx = i + 1;
      console.log(`\n▸ Step ${stepIdx}: ${step.action} as ${step.actor}`);

      const action = ACTIONS[step.action];
      if (!action) throw new Error(`Unknown action in step ${stepIdx}: ${step.action}`);

      const actorBrowser = browsers.get(step.actor);
      if (!actorBrowser) throw new Error(`No browser for actor: ${step.actor} (handle not in fixtures.users)`);

      const resolvedWith = applyFixtureDefaults(
        resolveDatePlaceholders(step.with || {}),
        step.action,
        fixtures,
      );
      const stepLog = { index: stepIdx, action: step.action, actor: step.actor, with: resolvedWith };
      const expectFailure = step.expect_failure === true;
      try {
        try {
          await action.ui(actorBrowser, resolvedWith, { db: db(), fixtures });
        } catch (uiErr) {
          if (expectFailure) {
            // Negative test passed: action threw as expected.
            stepLog.expectedFailure = true;
            stepLog.uiError = uiErr.message;
            // Skip observer state assertions and continue to next step.
            stepsLog.push(stepLog);
            continue;
          }
          throw uiErr;
        }
        if (expectFailure) {
          // Action did NOT fail though we expected it to → that's a bug.
          diffs.push({
            step: stepIdx,
            role: step.actor,
            field: `${step.action}.expected_failure`,
            dom: "succeeded",
            expected: "failure",
            result: "❌ EXPECTED FAILURE BUT SUCCEEDED",
          });
        }
        // Track created artifacts for teardown.
        if (step.action === "add_voucher" && step.with?.code) {
          fixtures.createdVoucherCodes.push(step.with.code);
        }
        const shotPath = join(runDir, "screenshots", `${stepIdx}-actor-${step.actor}.png`);
        actorBrowser.screenshot(shotPath);
        stepLog.actorScreenshot = shotPath;

        // Resolve observer roles
        const observers = await resolveObservers(step, scenario, fixtures);
        stepLog.observerScreenshots = [];

        for (const obs of observers) {
          const obsBrowser = browsers.get(obs.handle);
          if (!obsBrowser) {
            console.warn(`  observer browser missing: ${obs.handle}`);
            continue;
          }
          // Each observer captures the relevant page per their default page hint
          const checks = await captureObserverChecks({
            browser: obsBrowser,
            obs,
            step,
            stepIdx,
            runDir,
            action,
            fixtures,
            stepLog,
          });
          diffs.push(...checks);
        }
      } catch (e) {
        stepLog.error = e.message;
        console.error(`  ❌ step error: ${e.message}`);
        // Capture a screenshot of whatever state we ended in — invaluable for
        // debugging "no input X in snapshot" / "Element not found" failures.
        try {
          const failShot = join(runDir, "screenshots", `${stepIdx}-FAIL-actor-${step.actor}.png`);
          actorBrowser.screenshot(failShot);
          stepLog.failureScreenshot = failShot;
          console.error(`     state at failure: ${failShot}`);
        } catch {
          // ignore screenshot errors during error path
        }
      }
      stepsLog.push(stepLog);
    }

    const reportPath = writeReport({
      runDir,
      scenarioName: scenario.name,
      fixtures,
      steps: stepsLog,
      diffs,
    });

    console.log(`\n✓ Report: ${reportPath}`);
    const failures = diffs.filter(isFailure);
    if (failures.length > 0) {
      console.log(`  ❌ ${failures.length} drift finding(s)`);
      process.exitCode = 1;
    } else {
      console.log("  ✅ no drift");
    }
  } finally {
    // Teardown. When teardown=manual, leave both DB fixtures AND browser
    // sessions intact so the user can inspect them (incl. agent-browser
    // console buffer for debugging).
    if (scenario.teardown !== "manual") {
      for (const b of browsers.values()) b.close();
      await teardown(fixtures);
    } else {
      console.log("  (teardown=manual — fixtures + browser sessions left alive)");
      const sessions = [...browsers.entries()]
        .map(([h, b]) => `    ${h}: --session ${b.session}`)
        .join("\n");
      console.log(`  Open sessions:\n${sessions}`);
    }
  }
}

// ---------- Fixtures ----------

async function setupFixtures(scenario, fixtures) {
  const supabase = db();
  const { runId } = fixtures;

  // 1. branch (under an existing parent company by code)
  if (scenario.fixtures?.branch) {
    const f = scenario.fixtures.branch;
    const { data: parent } = await supabase
      .from("branches")
      .select("id")
      .eq("code", f.parent)
      .eq("type", "company")
      .maybeSingle();
    if (!parent) throw new Error(`Parent company with code "${f.parent}" not found`);

    const branchName = `__sim_${runId}_${f.name}`;
    // Both code and city are per-run unique to avoid collisions if a previous
    // run left junk behind.
    const branchCode = `${f.code}-${runId.slice(0, 4)}`;
    const branchCity = `${f.name} ${runId.slice(0, 4)}`;
    const { data, error } = await supabase
      .from("branches")
      .insert({
        name: branchName,
        code: branchCode,
        type: "branch",
        parent_id: parent.id,
        city: branchCity,
        phone: "0123456789",
        email: `sim_${runId}@sim.local`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`createBranch: ${error.message}`);
    fixtures.branchId = data.id;
    fixtures.branchName = branchName;
    fixtures.branchCity = branchCity;
  }

  // 2. course (link to fixture branch via course_branches)
  if (scenario.fixtures?.course) {
    const c = scenario.fixtures.course;
    const courseName = `__sim_${runId}_${c.name}`;
    const { data, error } = await supabase
      .from("courses")
      .insert({
        name: courseName,
        code: `S${runId.slice(0, 3).toUpperCase()}`,
        number_of_levels: c.levels,
        sessions_to_level_up: c.sessions_to_level_up,
        program_type: "course",
        status: "active",
        branch_id: fixtures.branchId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`createCourse: ${error.message}`);
    fixtures.courseId = data.id;
    fixtures.courseName = courseName;

    if (fixtures.branchId) {
      await supabase
        .from("course_branches")
        .insert({ course_id: fixtures.courseId, branch_id: fixtures.branchId });
    }

    // Default course_slots so add_student can pick a schedule and the
    // enrollment ends up with day_of_week + start_time set (which is what
    // makes the student appear on the instructor's /attendance table).
    // Scenarios can override by providing fixtures.slots.
    const slotDefs = scenario.fixtures.slots ?? [
      { day: "monday", time: "10:00", duration: 60, limit: 10 },
    ];
    for (const s of slotDefs) {
      const { error: slotErr } = await supabase
        .from("course_slots")
        .insert({
          course_id: fixtures.courseId,
          branch_id: fixtures.branchId,
          day: s.day,
          time: s.time,
          duration: s.duration ?? 60,
          limit_student: s.limit ?? 10,
        });
      if (slotErr) throw new Error(`createCourseSlot: ${slotErr.message}`);
    }

    // Default curriculum (section + lessons) so the mark-present modal has
    // real options in its Lesson dropdown. Without these the dropdown only
    // contains the synthetic "Competition" entry.
    const lessonDefs = scenario.fixtures.lessons ?? [
      { title: "Lesson 1", missions: [{ level: 1 }, { level: 2 }] },
      { title: "Lesson 2", missions: [{ level: 1 }, { level: 2 }] },
    ];
    if (lessonDefs.length > 0) {
      const { data: section, error: secErr } = await supabase
        .from("course_sections")
        .insert({
          course_id: fixtures.courseId,
          title: "Default Section",
          sort_order: 1,
        })
        .select("id")
        .single();
      if (secErr) throw new Error(`createCourseSection: ${secErr.message}`);
      for (let i = 0; i < lessonDefs.length; i++) {
        const l = lessonDefs[i];
        const { error: lessonErr } = await supabase
          .from("course_lessons")
          .insert({
            section_id: section.id,
            title: l.title,
            sort_order: i + 1,
            missions: l.missions ?? [],
          });
        if (lessonErr) throw new Error(`createCourseLesson: ${lessonErr.message}`);
      }
    }
  }

  // 3. pricing — scenario may declare a single `pricing` object or a
  // `pricings` array (for tests that need multiple packages on the same course,
  // e.g. package-upgrade scenarios). `fixtures.packageId` always points at
  // the first / default pricing.
  const pricingDefs = scenario.fixtures?.pricings
    ? scenario.fixtures.pricings
    : scenario.fixtures?.pricing
      ? [scenario.fixtures.pricing]
      : [];
  for (let i = 0; i < pricingDefs.length; i++) {
    const p = pricingDefs[i];

    // Optional voucher-template wiring: if the pricing declares
    // voucher: { amount, completion_months }, create a voucher template row
    // and attach it to course_pricing.voucher_id. Used by scenarios 11/13.
    let voucherTemplateId = null;
    if (p.voucher) {
      const code = `SIM-${runId}-${i}`;
      const { data: vt, error: vtErr } = await supabase
        .from("vouchers")
        .insert({
          code,
          discount_type: "fixed",
          discount_value: p.voucher.amount ?? 50,
          expiry_type: "monthly",
          expiry_months: p.voucher.completion_months ?? 3,
        })
        .select("id")
        .single();
      if (vtErr) throw new Error(`createVoucherTemplate: ${vtErr.message}`);
      voucherTemplateId = vt.id;
    }

    const { data, error } = await supabase
      .from("course_pricing")
      .insert({
        course_id: fixtures.courseId,
        package_type: p.type,
        duration: p.count,
        price: p.price,
        is_default: i === 0,
        ...(voucherTemplateId ? { voucher_id: voucherTemplateId, completion_months: p.voucher.completion_months ?? 3 } : {}),
      })
      .select("id")
      .single();
    if (error) throw new Error(`createPricing: ${error.message}`);
    if (i === 0) fixtures.packageId = data.id;
  }

  // 4. users
  for (const u of scenario.fixtures?.users ?? []) {
    let inChargeIds = [];
    if (u.in_charge && fixtures.courseId) inChargeIds = [fixtures.courseId];
    const created = await createTestUser({
      runId,
      handle: u.handle,
      role: u.role,
      branchId: fixtures.branchId,
      inChargeCourseIds: inChargeIds,
    });
    fixtures.users.push({
      handle: u.handle,
      role: u.role,
      ...created,
    });
    console.log(`  ✓ created ${u.handle} (${u.role}) → ${created.email}`);
  }
}

async function teardown(fixtures) {
  const supabase = db();
  const { runId, branchId, courseId } = fixtures;
  // Trials a scenario step created — clean these BEFORE the branch they're
  // attached to (FK on trials.branch_id).
  if (branchId) {
    await supabase.from("trials").delete().eq("branch_id", branchId);
  }
  // Vouchers FIRST: both student-earned ones (course_id = our courseId) and
  // any template rows the runner created (code SIM-<runId>-*). Doing this
  // before course_pricing/courses avoids FK violations on the courses delete.
  if (courseId) {
    await supabase.from("vouchers").delete().eq("course_id", courseId);
  }
  await supabase.from("vouchers").delete().like("code", `SIM-${runId}-%`);
  if (courseId) {
    await supabase.from("course_branches").delete().eq("course_id", courseId);
    await supabase.from("course_instructors").delete().eq("course_id", courseId);
    await supabase.from("course_pricing").delete().eq("course_id", courseId);
    await supabase.from("courses").delete().eq("id", courseId);
  }
  // Legacy code-based template cleanup (kept for backwards compat with
  // scenarios that explicitly record createdVoucherCodes).
  for (const code of fixtures.createdVoucherCodes ?? []) {
    await supabase.from("vouchers").delete().eq("code", code);
  }
  await deleteAllTestUsersForRun(runId);
  if (branchId) {
    await supabase.from("branches").delete().eq("id", branchId);
  }
  console.log(`  ✓ teardown complete for run ${runId}`);
}

// ---------- Observers ----------

async function resolveObservers(step, scenario, fixtures) {
  const want = step.observers;
  if (!want || want === "auto") {
    return fixtures.users.filter((u) => u.handle !== step.actor);
  }
  const handles = Array.isArray(want) ? want : String(want).split(",").map((s) => s.trim());
  return fixtures.users.filter((u) => handles.includes(u.handle));
}

async function captureObserverChecks({ browser, obs, step, stepIdx, runDir, action, fixtures, stepLog }) {
  const page = pageForRole(obs.role, action);
  if (!page) return [];

  browser.open(page);
  // Brief settle — some pages fetch table data AFTER networkidle (React Query
  // background refetch). 800ms is enough for a list refresh to land.
  browser.sleep(800);
  const shotPath = join(runDir, "screenshots", `${stepIdx}-observer-${obs.handle}.png`);
  browser.screenshot(shotPath);
  stepLog.observerScreenshots.push({ role: obs.role, handle: obs.handle, path: shotPath });

  // Permission redirect detection — if the page redirected away from `page`,
  // the role has no permission to view it. Report cleanly.
  const landed = browser.ab(`get url`).trim();
  if (!landed.endsWith(page) && !landed.includes(page)) {
    return [
      {
        step: stepIdx,
        role: obs.role,
        field: `${page}.permission`,
        dom: landed.replace(/^https?:\/\/[^/]+/, ""),
        expected: page,
        result: "🚫 NO_PERMISSION (redirected)",
      },
    ];
  }

  // Compact snapshot is what we want here — the compact format preserves
  // `LayoutTableRow` / `LayoutTableCell` nodes (which the extract helpers
  // parse), while the non-compact format strips them.
  const snap = browser.snapshot({ interactive: true, compact: true });
  const headers = extractTableHeaders(snap);
  const searchText = step.with?.name || step.with?.student;
  const row = searchText ? findRowMap(snap, searchText, headers) : null;

  const diffs = [];
  // Pull DB-level truth for sessions_remaining if we know the student.
  // Always scope by this run's fixture branch — stale rows from prior runs
  // share the same name and would mask the real value.
  //
  // Retry a couple of times — when the actor's "Save" returns, server-side
  // inserts (students → parent_students → enrollment) are committed but the
  // relation-join read here can still hit before the enrollment row
  // propagates, returning an empty `enrollments` array and a misleading
  // null. Two short retries are cheap and remove the flake.
  let dbSessionsRemaining = null;
  if (searchText && fixtures.branchId) {
    const supabase = db();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await supabase
        .from("students")
        .select("id, name, enrollments(sessions_remaining)")
        .eq("name", searchText)
        .eq("branch_id", fixtures.branchId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.enrollments?.length) {
        dbSessionsRemaining = data.enrollments[0].sessions_remaining;
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Generic row-visible check.
  //
  // The /attendance "Take Attendance" page intentionally hides rows once the
  // student's weekly scheduled session is marked complete (`isPresentDone` in
  // src/data/attendance.ts:1731-1744). For that page, compute the expected
  // visibility from DB so legitimate hidden-after-mark behavior doesn't show
  // up as drift.
  if (searchText) {
    let expectedVisible = true;
    if (page === "/attendance" && fixtures.branchId) {
      expectedVisible = await isStudentExpectedOnAttendance(searchText, fixtures);
    }
    diffs.push(
      compare({
        step: stepIdx,
        role: obs.role,
        field: `${page}.row_visible(${searchText})`,
        dom: !!row,
        expected: expectedVisible,
      }),
    );
  }

  // Page-specific cell checks. Skip when the row was found via the
  // action-button fallback — that path returns a synthetic string, not a
  // parseable row block, so cell extraction would always be null. Until the
  // snapshot exposes per-cell content reliably the cell-level drift checks
  // are skipped on this code path.
  const rowIsSynthetic = !!row && row.__synthetic === true;

  if (page === "/attendance" && row && !rowIsSynthetic) {
    const cell = parseNumberMaybe(row["Period Active"] ?? row["Sessions"] ?? row["Session"]);
    diffs.push(
      compare({
        step: stepIdx,
        role: obs.role,
        field: "attendance_table.sessions_remaining",
        dom: cell,
        db: dbSessionsRemaining,
        expected: dbSessionsRemaining,
      }),
    );
  }

  if (page === "/student" && row && !rowIsSynthetic) {
    const cell = parseNumberMaybe(row["Period Active"] ?? row["Sessions"]);
    diffs.push(
      compare({
        step: stepIdx,
        role: obs.role,
        field: "student_table.period_active",
        dom: cell,
        db: dbSessionsRemaining,
        expected: dbSessionsRemaining,
      }),
    );
  }

  if (page === "/voucher") {
    const code = step.with?.code;
    // Voucher table: simple row-visible check by coupon code text.
    const voucherRow = code ? findRowMap(snap, code, headers) : null;
    diffs.push(
      compare({
        step: stepIdx,
        role: obs.role,
        field: `voucher_table.row_visible(${code})`,
        dom: !!voucherRow,
        expected: true,
      }),
    );
    if (voucherRow) {
      const discountCell = voucherRow["Discount"] ?? voucherRow["Value"];
      const expected = step.with?.discount_type === "percentage"
        ? `${step.with?.discount_value}%`
        : `RM${step.with?.discount_value}`;
      diffs.push(
        compare({
          step: stepIdx,
          role: obs.role,
          field: "voucher_table.discount",
          dom: discountCell,
          expected,
        }),
      );
    }
  }

  // Apply explicit `expect` from scenario
  if (step.expect) {
    for (const [k, v] of Object.entries(step.expect)) {
      // very simple matcher: <role>.<surface>.<field>: <value>
      const [role, ...rest] = k.split(".");
      if (role !== "*" && role !== obs.role && role !== obs.handle) continue;
      const field = rest.join(".");
      // Field-specific DB lookup. Default to sessions_remaining for fields
      // that don't have a dedicated query.
      const dbForField = await fetchDbValueForField(field, searchText, fixtures);
      diffs.push(
        compare({
          step: stepIdx,
          role: obs.role,
          field,
          dom: undefined,
          db: dbForField !== null ? dbForField : dbSessionsRemaining,
          expected: v,
        }),
      );
    }
  }

  return diffs;
}

// Mirrors the "Skip if all fields are done" rule in
// src/data/attendance.ts:1731-1744. Returns false when the student's
// scheduled session for *this week* has already been fully marked
// (so /attendance hides the row by design).
async function isStudentExpectedOnAttendance(studentName, fixtures) {
  const supabase = db();
  const { data: stu } = await supabase
    .from("students")
    .select("id")
    .eq("name", studentName)
    .eq("branch_id", fixtures.branchId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!stu) return true; // no student found — let the row-visible check surface the real issue
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status, deleted_at")
    .eq("student_id", stu.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!enrollment || enrollment.status !== "active" || enrollment.deleted_at) {
    return false;
  }
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data: weekAttendance } = await supabase
    .from("attendance")
    .select("status, class_type, instructor_name, lesson, mission, last_activity")
    .eq("enrollment_id", enrollment.id)
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday));
  for (const a of weekAttendance ?? []) {
    const absentDone = a.status === "absent";
    const presentDone =
      (a.status === "present" || a.status === "late") &&
      a.class_type &&
      a.instructor_name &&
      a.lesson &&
      a.mission &&
      a.last_activity;
    if (absentDone || presentDone) return false;
  }
  return true;
}

// Field-specific DB lookups for scenario expectations. Returns null if the
// field has no dedicated query (caller falls back to sessions_remaining).
async function fetchDbValueForField(field, studentName, fixtures) {
  if (!studentName) return null;
  const supabase = db();
  const { data: stu } = await supabase
    .from("students")
    .select("id")
    .eq("name", studentName)
    .eq("branch_id", fixtures.branchId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!stu) return null;

  if (field === "pending_payments_table.row_visible") {
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("student_id", stu.id)
      .eq("status", "pending");
    return (count ?? 0) > 0;
  }

  if (
    field === "student_table.payment_settled" ||
    field === "payment_settled"
  ) {
    const { data: rows } = await supabase
      .from("payments")
      .select("amount")
      .eq("student_id", stu.id)
      .eq("status", "paid");
    return (rows ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  }

  // Pool-state lookups via the student's active enrollment.pool_id. All of
  // these return null if the student isn't currently pooled, so the caller
  // would fall back to enrollment.sessions_remaining (which is 0 for a pooled
  // enrollment — usually still useful for negative drift catching).
  if (
    field === "pool.sessions_remaining" ||
    field === "pool.total_sessions" ||
    field === "pool.active_students" ||
    field === "pool.deleted"
  ) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("pool_id")
      .eq("student_id", stu.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!enr?.pool_id) return null;

    if (field === "pool.active_students") {
      const { count } = await supabase
        .from("pool_students")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", enr.pool_id);
      return count ?? 0;
    }

    const { data: pool } = await supabase
      .from("shared_session_pools")
      .select("sessions_remaining, total_sessions, deleted_at")
      .eq("id", enr.pool_id)
      .maybeSingle();
    if (!pool) return null;
    if (field === "pool.sessions_remaining") return Number(pool.sessions_remaining);
    if (field === "pool.total_sessions") return Number(pool.total_sessions);
    if (field === "pool.deleted") return pool.deleted_at !== null;
  }

  // Raw enrollment session count (bypasses any pool aggregation).
  if (field === "enrollment.sessions_remaining") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("sessions_remaining")
      .eq("student_id", stu.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return enr?.sessions_remaining ?? null;
  }

  // Voucher state counts for the student (enrollment-earned vouchers,
  // not admin-created code templates).
  if (
    field === "voucher.available_count" ||
    field === "voucher.redeemed_count" ||
    field === "voucher.total_amount_available"
  ) {
    const status = field === "voucher.redeemed_count" ? "redeemed" : "available";
    if (field === "voucher.total_amount_available") {
      const { data: rows } = await supabase
        .from("vouchers")
        .select("amount")
        .eq("student_id", stu.id)
        .eq("status", "available");
      return (rows ?? []).reduce((s, v) => s + Number(v.amount ?? 0), 0);
    }
    const { count } = await supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("student_id", stu.id)
      .eq("status", status);
    return count ?? 0;
  }

  // Total attendance rows for the student's most recent enrollment.
  if (field === "attendance.count") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", stu.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!enr?.id) return 0;
    const { count } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enr.id)
      .in("status", ["present", "late"]);
    return count ?? 0;
  }

  // Whether the student's enrollment.pool_id is set (regardless of pool's
  // own deleted_at). Useful for verifying pool dissolution.
  if (field === "enrollment.pool_id_set") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("pool_id")
      .eq("student_id", stu.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return enr?.pool_id != null;
  }

  return null;
}

function pageForRole(role, action) {
  // Action can override per-role page via `observerPage` declaration.
  if (action?.observerPage) {
    const explicit = action.observerPage[role] ?? action.observerPage["*"];
    if (explicit) return explicit;
  }
  // Per-action sensible defaults based on the action id.
  if (action?.id === "add_voucher") return "/voucher";
  switch (role) {
    case "instructor":
      return "/attendance";
    case "company_admin":
    case "assistant_admin":
      return "/student";
    case "group_admin":
      return "/student";
    default:
      return null;
  }
}

function parseNumberMaybe(s) {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}

// ---------- Interactive scenario builder ----------

async function interactiveBuilder() {
  const rl = createInterface({ input, output });
  const ask = (q) => rl.question(q);

  const name = (await ask("Scenario name: ")).trim();
  const description = (await ask("Description (one line): ")).trim();

  // Default fixture skeleton
  const scenario = {
    name,
    description,
    fixtures: {
      branch: { name: "Sim Branch", code: "SIMBR", parent: "ADS" },
      users: [{ handle: "ca", role: "company_admin" }],
    },
    steps: [],
    teardown: "auto",
  };

  console.log("\nAvailable actions:");
  for (const a of listActions()) {
    console.log(`  ${a.id}`);
  }

  while (true) {
    const next = (await ask("\nAdd a step (action id, or 'done'): ")).trim();
    if (!next || next === "done") break;
    if (!ACTIONS[next]) {
      console.log(`  unknown action; available: ${Object.keys(ACTIONS).join(", ")}`);
      continue;
    }
    const action = ACTIONS[next];
    const actor = (await ask("  actor (handle): ")).trim() || "ca";
    const withObj = {};
    for (const [field, def] of Object.entries(action.fields)) {
      const tag = def.required ? "(required)" : "(optional)";
      const ex = def.example ? ` [e.g. ${def.example}]` : "";
      const v = (await ask(`  ${field} ${tag}${ex}: `)).trim();
      if (v) withObj[field] = v;
    }
    const observers = (await ask("  observers (comma list or 'auto'): ")).trim() || "auto";
    scenario.steps.push({
      actor,
      action: next,
      with: withObj,
      observers: observers === "auto" ? "auto" : observers.split(",").map((s) => s.trim()),
    });
  }

  rl.close();

  const yaml = stringify(scenario);
  const out = join(SCENARIOS_DIR, `${name}.yaml`);
  writeFileSync(out, yaml);
  console.log(`\n✓ wrote ${out}`);
  console.log("\nRun it with:");
  console.log(`  npm run simulate ${name}`);
}
