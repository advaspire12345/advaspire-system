// Action: mark_present
// Opens the mark-present modal for a given student, fills lesson/mission/activity,
// submits. The killer behavior of this action is that the runner captures
// sessions_remaining from BOTH the student row's table cell AND the value shown
// inside the still-open modal — which is exactly where the UI/DB drift bug
// hides ("table says -1, modal still says 0").

export default {
  id: "mark_present",
  description: "Open mark-present modal for student, fill required fields, submit. Captures sessions_remaining from BOTH the table cell and the modal — the diff will catch UI/DB drift.",
  fields: {
    student: { type: "string", required: true, example: "Sim Stu 1", desc: "Student name (must match an existing student row)" },
    lesson: { type: "string", required: true, example: "Lesson 1" },
    mission: { type: "string", required: true, example: "Level 1" },
    activity: { type: "string", required: true, example: "intro coding", desc: "Activity Completed text" },
    adcoin: { type: "number", required: false, default: 0 },
    password: { type: "string", required: false, example: "simpass", desc: "Required when adcoin > 0 — instructor's password for the adcoin transfer." },
  },
  defaultExpectations: ({ student }) => ({
    actor: [
      // The bug-catcher — both should match the DB value
      { field: "attendance_table.sessions_remaining", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
      { field: "mark_present_modal.sessions_remaining", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
    ],
    company_admin: [
      // Period_active in student table should match too
      { field: "student_table.period_active", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
    ],
    assistant_admin: [
      { field: "student_table.period_active", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/attendance");
    // Mark-present button uses aria-label `Mark <studentName> as present`.
    browser.clickButton(`Mark ${args.student} as present`);
    // Lesson and Mission are comboboxes (not text inputs). Mission depends on
    // Lesson, so order matters.
    browser.selectByLabel("Lesson", args.lesson);
    browser.selectByLabel("Mission", args.mission);
    browser.fillLabel("Activity Completed", args.activity);
    if (args.adcoin) {
      browser.fillLabel("Adcoin", String(args.adcoin));
      // Adcoin transfers require the instructor's password before save.
      // Default to the simulator's "simpass" — overridable via args.password.
      browser.fillLabel("Password to Transfer Adcoin", args.password || "simpass");
    }
    // Submit — the mark-present modal's button reads "Save & Mark Present".
    browser.clickDialogButton("Save & Mark Present");
  },
};
