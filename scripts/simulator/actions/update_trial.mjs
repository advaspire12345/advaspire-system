// Action: update_trial — open Edit Trial modal for a trial identified by
// child_name, change one or more fields, save. Used to test live propagation
// of updates into the mark-attendance table (e.g. shifting the date in/out of
// the current week should add/remove the trial from /attendance).

export default {
  id: "update_trial",
  description: "Edit an existing trial and save. Common use: shift scheduled_date to verify the mark-attendance week-window filter responds.",
  fields: {
    child_name: { type: "string", required: true, example: "TrialKid1", desc: "Locator: trial row in /trial whose child_name matches" },
    scheduled_date: { type: "date", required: false, example: "2026-05-18" },
    scheduled_time: { type: "string", required: false, example: "18:30" },
    parent_phone: { type: "string", required: false },
    course: { ref: "courses", required: false },
    branch: { ref: "branches", required: false },
    notes: { type: "string", required: false },
  },
  defaultExpectations: ({ child_name, scheduled_date }) => ({
    "*": [
      { field: "trial_table.scheduled_date", expected: scheduled_date, by: { searchText: child_name } },
    ],
    instructor: [
      // If new date is within current week, the trial should now show up on
      // /attendance. If pushed to next week, it should disappear. The runner
      // can't know which without checking dates — leave to scenario expect block.
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/trial");
    browser.clickButton(`Edit trial for ${args.child_name}`);
    if (args.scheduled_date) browser.fillLabel("Scheduled Date", args.scheduled_date);
    if (args.scheduled_time) browser.fillLabel("Scheduled Time", args.scheduled_time);
    if (args.parent_phone) browser.fillLabel("Parent Phone", args.parent_phone);
    if (args.course) browser.selectByLabel("Program", args.course);
    if (args.branch) browser.selectByLabel("Branch", args.branch);
    if (args.notes) browser.fillLabel("Notes", args.notes);
    browser.clickButton("Save");
  },
};
