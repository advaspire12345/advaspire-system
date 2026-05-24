// Action: mark_absent — open the mark-absent modal on /attendance and submit.
// Works for both students and trials (trial rows expose the same Absent button).

export default {
  id: "mark_absent",
  description: "Mark a student or trial absent on /attendance. For trials, the trial table status flips to 'no show'.",
  fields: {
    student: { type: "string", required: true, example: "TrialKid1", desc: "Student or trial child name as it appears in the attendance table row" },
    reason: { type: "string", required: false, example: "didn't show up" },
  },
  defaultExpectations: ({ student }) => ({
    actor: [
      { field: "attendance_table.row_visible", expected: false, by: { searchText: student }, desc: "absent rows leave the mark-attendance table" },
    ],
    "*": [
      { field: "attendance_log.row_visible", expected: true, by: { searchText: student }, desc: "absent attendance lands in the history" },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/attendance");
    // Aria-label is `Mark <name> as absent`.
    browser.clickButton(`Mark ${args.student} as absent`);
    if (args.reason) browser.fillLabel("Reason", args.reason);
    browser.clickButton("Save");
  },
};
