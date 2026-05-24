// Action: add_student
//
// Drives the multi-tab Add Student modal at /student. As of the May 2026
// redesign the modal has three tabs (Basic Info → Parent Details → Enrollment)
// each separated by a "Next" button; final submit is "Save Student" on the
// Enrollment tab. Basic Info opens with a student picker (FloatingSelect) where
// you must choose "+ Add New Student" before the Full Name input appears.
//
// `package` follows the legacy "<count>-<type>" format, e.g. "12-session" or
// "1-monthly". The action splits it, clicks the matching package-type card,
// then selects the duration from the dropdown.

const PORTAL_PASSWORD = "simpass123";

function capitaliseGender(g) {
  if (!g) return null;
  const lower = String(g).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default {
  id: "add_student",
  description: "Create a new student via the Add Student modal on /student (multi-tab: Basic → Parent → Enrollment)",
  fields: {
    name: { type: "string", required: true, example: "Sim Stu 1" },
    parent_name: { type: "string", required: false, example: "Parent One", desc: "Auto-creates parent if missing. Not required when parent_existing=true." },
    parent_email: { type: "string", required: true, example: "p1@sim.local", desc: "Used both to create a new parent and to pick an existing one (parent_existing=true)." },
    parent_phone: { type: "string", required: false, example: "0123456789" },
    course: { ref: "courses", required: true, desc: "Course/program name" },
    package: { type: "string", required: false, example: "12-session", desc: "Format: '<count>-<type>' e.g. 12-session, 1-monthly. Skipped when share_with_sibling=true (Shared inherits the sibling's package)." },
    branch: { ref: "branches", required: false, default: "actor.branch", desc: "Defaults to the actor's branch" },
    level: { type: "number", required: false, default: 1 },
    date_of_birth: { type: "date", required: false, example: "2015-01-01" },
    gender: { type: "enum:male,female,other", required: false, default: "male" },
    school_name: { type: "string", required: false, example: "Test School" },
    username: { type: "string", required: false, desc: "Defaults to slugified name" },
    parent_existing: { type: "boolean", required: false, default: false, desc: "If true, pick the existing parent whose row matches parent_email (instead of '+ Add New Parent'). Use for sibling enrollments." },
    share_with_sibling: { type: "boolean", required: false, default: false, desc: "If true, click the 'Shared' package-type button on the Enrollment tab — this auto-inherits the sibling's package and pools the two students together. The `package` field is ignored in this mode." },
    force_individual: { type: "boolean", required: false, default: false, desc: "If true, ensure the new student ends up INDIVIDUAL even when a sibling is detected (the form auto-toggles Shared on; this flag toggles it off before save). The auto-inherited package_type/duration stay, so combine with `package` to set them explicitly if needed." },
  },
  defaultExpectations: ({ name, course }) => ({
    actor: [
      { field: "student_table.row_visible", expected: true, by: { searchText: name } },
      { field: "student_table.programName", expected: course, by: { searchText: name } },
    ],
    instructor: [
      { field: "attendance_table.row_visible", expected: true, by: { searchText: name } },
      { field: "attendance_table.sessions_remaining", expected: 0, by: { searchText: name } },
    ],
    company_admin: [
      { field: "pending_payments_table.row_visible", expected: true, by: { searchText: name } },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/student");
    browser.clickButton("Add Student");

    // -------- Basic Info tab --------
    // Picker first — must choose "+ Add New Student" before the Full Name field
    // appears. The combobox's accessible label is "Student Full Name" initially.
    browser.selectByLabel("Student Full Name", "+ Add New Student");

    browser.fillLabel("Full Name", args.name);

    // Username has a UNIQUE constraint; auto-deriving from name causes
    // collisions across simulator runs that reuse student names. Include a
    // short random suffix so each run gets a fresh username.
    const username =
      args.username ||
      `${String(args.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 16) || "simstu"}_${Math.random().toString(36).slice(2, 6)}`;
    browser.fillLabel("Username (for student portal login)", username);

    if (args.date_of_birth) {
      // DOB is a native date input; the accessibility tree exposes only the
      // 3 spinbuttons so fillLabel can't reach it. Use the type=date attribute
      // selector (unquoted so shell escaping doesn't mangle it). The Add Student
      // modal has exactly one date input.
      browser.fillCss("input[type=date]", args.date_of_birth);
    }

    if (args.gender) {
      browser.selectByLabel("Gender", capitaliseGender(args.gender));
    }

    if (args.school_name) {
      browser.fillLabel("School Name", args.school_name);
    }

    // Portal Password — required for parent-portal student login. Use a fixed
    // simpass so the runner can log in as the student later if a scenario asks.
    browser.fillLabel("Portal Password", PORTAL_PASSWORD);

    browser.clickDialogButton("Next");
    browser.sleep(600);

    // -------- Parent Details tab --------
    if (args.parent_existing) {
      // Pick the existing parent option by matching the email substring in the
      // dropdown label. Option labels are formatted as
      //   `${name} (${phone}) - ${email}` (student-modal.tsx:1328-1331)
      // so the email is enough to disambiguate.
      browser.selectByLabel("Select Parent", args.parent_email);
    } else {
      browser.selectByLabel("Select Parent", "+ Add New Parent");
      if (args.parent_name) browser.fillLabel("Parent Full Name", args.parent_name);
      if (args.parent_phone) browser.fillLabel("Parent Phone", args.parent_phone);
      if (args.parent_email) browser.fillLabel("Parent Email", args.parent_email);
    }

    browser.clickDialogButton("Next");
    browser.sleep(600);

    // -------- Enrollment tab --------
    if (args.branch) {
      browser.selectByLabel("Branch", args.branch);
      browser.sleep(300);
    }
    if (args.course) {
      browser.selectByLabel("Program/Course", args.course);
      browser.sleep(300);
    }

    if (args.force_individual) {
      // The form auto-toggles shareWithSibling=true when a sibling is detected
      // (student-modal.tsx:545-556). If the user wants this student to stay
      // INDIVIDUAL despite the auto-detection, we click the Shared button to
      // toggle it off. Only do this if a Shared button is actually present.
      const sharedSafe = "Shared";
      let attempts = 0;
      let state = "missing";
      while (attempts < 6 && state === "missing") {
        const out = browser.ab(
          `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return 'no_dialog'; const btns = dlg.querySelectorAll('button'); for (const b of btns) { if (!b.disabled && (b.textContent || '').trim().toLowerCase().startsWith('${sharedSafe.toLowerCase()}')) { return b.className.split(' ').includes('border-[#615DFA]') ? 'active' : 'inactive'; } } return 'missing'; })()"`,
        );
        if (out.includes("active")) { state = "active"; break; }
        if (out.includes("inactive")) { state = "inactive"; break; }
        browser.sleep(300);
        attempts++;
      }
      // If Shared isn't on screen at all, nothing to toggle — student is already
      // individual (no sibling detected). If it's active (auto-shared), toggle off.
      if (state === "active") {
        browser.clickDialogButton("Shared");
        browser.sleep(400);
      }
    } else if (args.share_with_sibling) {
      // Shared mode is tricky:
      //   1. The "Shared" button only renders after siblingPoolCheck resolves
      //      (async fetch — triggers when parent + course are both set).
      //   2. In add mode the modal *auto-sets* shareWithSibling=true the moment
      //      a sibling-in-course is detected (student-modal.tsx:545-556).
      //      That means clicking the button at that point TOGGLES IT OFF —
      //      exactly the opposite of what we want.
      //
      // So we poll until the button appears, then only click if it's not
      // already active (active state = border-[#615DFA] class on the button).
      const sharedSafe = "Shared";
      let attempts = 0;
      let state = "waiting";
      while (attempts < 12 && state === "waiting") {
        const out = browser.ab(
          `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return 'no_dialog'; const btns = dlg.querySelectorAll('button'); for (const b of btns) { if (!b.disabled && (b.textContent || '').trim().toLowerCase().startsWith('${sharedSafe.toLowerCase()}')) { return b.className.split(' ').includes('border-[#615DFA]') ? 'active' : 'inactive'; } } return 'waiting'; })()"`,
        );
        if (out.includes("active")) { state = "active"; break; }
        if (out.includes("inactive")) { state = "inactive"; break; }
        browser.sleep(300);
        attempts++;
      }
      if (state === "waiting") {
        throw new Error(
          "add_student(share_with_sibling): Shared button never appeared — check that the sibling exists in the same parent + course and is enrolled",
        );
      }
      if (state === "inactive") {
        browser.clickDialogButton("Shared");
        browser.sleep(500);
      }
      // If already 'active' the form auto-detected the sibling and turned
      // share on for us — leave it alone.
    } else if (args.package) {
      const [countStr, type] = String(args.package).split("-");
      const count = countStr.trim();
      if (type === "monthly") {
        browser.clickDialogButton("Monthly");
        browser.selectByLabel("Monthly Package", count);
      } else if (type === "session") {
        browser.clickDialogButton("Session");
        browser.selectByLabel("Session Package", count);
      } else {
        throw new Error(`add_student: unsupported package format "${args.package}" — expected "<count>-monthly" or "<count>-session"`);
      }
    }

    // Class Schedule — pick the first available day + time. Without a schedule
    // the enrollment's day_of_week/start_time stay null and the student won't
    // appear on the instructor's /attendance table.
    if (args.schedule_day) {
      browser.selectByLabel("Day", args.schedule_day);
      if (args.schedule_time) browser.selectByLabel("Time", args.schedule_time);
    } else {
      // Default — pick the first option that the slot fixture provides.
      // The fixture's default slot is monday 10:00.
      browser.selectByLabel("Day", "monday");
      browser.selectByLabel("Time", "10:00");
    }

    browser.clickDialogButton("Save Student");
  },
};
