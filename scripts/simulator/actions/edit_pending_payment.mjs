// Action: edit_pending_payment
//
// Opens the Edit modal for a pending payment row and changes the package.
// Used by Scenario 17 (package upgrade) where an admin changes the renewal
// package before approving — e.g. parent originally requested 4-session but
// admin upgrades them to 12-session.
//
// Package label format mirrors src/data/courses.ts:181 —
//   "<duration> <Month/Session>(s)"
// e.g. "4 Sessions", "12 Sessions", "1 Month", "3 Months".
// The full option text in the dropdown is `<name> (RM<price>)`, so a
// duration-prefix substring like "12 Sessions" is sufficient.

export default {
  id: "edit_pending_payment",
  description: "Open the Edit modal for a student's pending payment and change the package.",
  fields: {
    student: { type: "string", required: true, example: "SimStu1", desc: "Student whose pending-payment row to edit" },
    new_package: { type: "string", required: true, example: "12 Sessions", desc: "Option-label prefix to select. Format: '<count> Month(s)|Session(s)'" },
  },
  defaultExpectations: ({ student, new_package }) => ({
    "*": [
      {
        field: "pending_payments_table.package",
        by: { searchText: student },
        dbField: "payments.package_id",
        // Just a soft signal — the new package name should match.
        // The actual DB check is via fetchDbValueForField (TBD per field).
        expected: new_package,
      },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/pending-payments");

    // Click the Edit button on the student's row. aria-label is "Edit payment"
    // (same on every row), so scope by row containing the student name.
    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const findAndClick = `(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent && row.textContent.includes("${safe}")) {
          const btn = row.querySelector('button[aria-label="Edit payment"]');
          if (!btn || btn.disabled) continue;
          btn.click();
          return 'clicked';
        }
      }
      return 'no_row';
    })()`;
    const out = browser.ab(`eval "${findAndClick.replace(/"/g, '\\"')}"`);
    if (out.includes("no_row")) {
      throw new Error(`edit_pending_payment: no pending row for "${args.student}"`);
    }
    browser.sleep(500);
    browser.ab(`wait --load networkidle`);

    // Change the package.
    browser.selectByLabel("Package", args.new_package);
    browser.sleep(300);

    // Save.
    browser.clickDialogButton("Save Changes");
  },
};
