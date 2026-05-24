// Action: delete_trial — click the row's delete icon, confirm in the dialog.
// Expected behavior:
//   - if no attendance has been marked for this trial → trial row is removed
//     from /trial AND any matching row on /attendance disappears too
//   - if attendance HAS been marked → delete is blocked (button greyed out
//     OR a toast appears). Caller should set `expect_failure: true` in those
//     scenarios.

export default {
  id: "delete_trial",
  description: "Delete a trial. If any attendance was already marked for this trial, deletion is blocked.",
  fields: {
    child_name: { type: "string", required: true, example: "TrialKid1" },
  },
  defaultExpectations: ({ child_name }) => ({
    "*": [
      { field: "trial_table.row_visible", expected: false, by: { searchText: child_name } },
    ],
    instructor: [
      { field: "attendance_table.row_visible", expected: false, by: { searchText: `${child_name} (Trial)` } },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/trial");
    browser.clickButton(`Delete trial for ${args.child_name}`);
    // Confirm modal — button text is typically "Confirm Delete" or "Delete".
    browser.clickButton("Confirm Delete");
  },
};
