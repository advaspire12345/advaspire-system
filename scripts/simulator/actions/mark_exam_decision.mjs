// Action: mark_exam_decision
//
// Drives the /examination page: clicks Edit on the matching student's row,
// flips the Status dropdown to either "Pass" or "Fail", saves. Triggers
// handlePassStatus / handleFailStatus server-side which is what we want to
// observe (level bump for pass, +8-week reattempt for fail).
//
// Fields:
//   student    — display name of the student whose exam row to edit
//   decision   — "pass" or "fail"
//   mark       — optional integer score (for pass rows)

export default {
  id: "mark_exam_decision",
  description:
    "Open /examination, edit the matching student's exam row, set Status=Pass|Fail, save. Server-side then bumps enrollment.level (pass) or schedules a +8-week reattempt (fail).",
  fields: {
    student: { type: "string", required: true, example: "Aiman" },
    decision: { type: "string", required: true, example: "pass", desc: "'pass' or 'fail'" },
    mark: { type: "number", required: false, example: 85, desc: "Score 0-100. Only meaningful for 'pass'." },
  },
  defaultExpectations: () => ({ checks: [] }),
  ui: async (browser, args) => {
    if (!["pass", "fail"].includes(args.decision)) {
      throw new Error(`mark_exam_decision: decision must be 'pass' or 'fail' (got "${args.decision}")`);
    }
    const statusLabel = args.decision === "pass" ? "Pass" : "Fail";

    browser.open("/examination");
    browser.clickButton(`Edit examination for ${args.student}`);

    if (args.mark != null) {
      try {
        browser.fillLabel("Mark", String(args.mark));
      } catch { /* mark field may not be required for fail */ }
    }

    browser.selectByLabel("Status", statusLabel);
    browser.clickDialogButton("Save Changes");
  },
};
