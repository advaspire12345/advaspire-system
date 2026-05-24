// Action: add_payment_for_student
//
// Drives the "Add Payment" modal on /pending-payments. Admin creates a new
// pending payment for an existing student — used by Scenario 7 (Restoration
// After Expiry) where the enrollment has been expired and admin needs to
// kick off a new payment cycle.
//
// UI flow:
//   /pending-payments → "Add Payment" button (black, top-right of the page)
//   → Modal: select Student (searchable) → select Program (auto-filters to
//     student's enrollments) → select Package (label format
//     "<duration> Session(s)|Month(s) (RM<price>)") → "Add Payment" submit.
//
// Package selection accepts a label prefix like "4 Sessions" — same matching
// rule as edit_pending_payment.

export default {
  id: "add_payment_for_student",
  description:
    "Open the Add Payment modal on /pending-payments and create a new pending payment for an existing student.",
  fields: {
    student: { type: "string", required: true, example: "Ali", desc: "Existing student to bill" },
    course: { type: "string", required: true, example: "CodingCourse", desc: "Program (course) name to pick — must match one of the student's enrollments" },
    package: {
      type: "string",
      required: true,
      example: "4 Sessions",
      desc: "Package option-label prefix. Format: '<count> Session(s)|Month(s)'",
    },
  },
  ui: async (browser, args) => {
    browser.open("/pending-payments");
    browser.sleep(500);

    // 1. Click the "Add Payment" button at the top of the page (NOT inside
    //    the dialog yet, so don't use clickDialogButton).
    browser.clickButton("Add Payment");
    browser.sleep(900);

    // 2. Select the student. The Student dropdown is searchable; selectByLabel
    //    types into the search and picks the matching option.
    browser.selectByLabel("Student", args.student);
    browser.sleep(500);

    // 3. Select the Program. Auto-filtered to the student's enrollments.
    browser.selectByLabel("Program", args.course);
    browser.sleep(500);

    // 4. Select the Package — label prefix match (e.g. "4 Sessions").
    browser.selectByLabel("Package", args.package);
    browser.sleep(500);

    // 5. Submit. The submit button inside the dialog is also labelled
    //    "Add Payment" (same text as the page-level button), so clickDialogButton
    //    scopes to the open dialog.
    browser.clickDialogButton("Add Payment");
    browser.sleep(1500);
    browser.ab(`wait --load networkidle`);
  },
};
