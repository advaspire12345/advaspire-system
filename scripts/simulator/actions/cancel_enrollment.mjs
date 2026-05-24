// Action: cancel_enrollment
//
// Opens the Edit Student modal for a given student, switches to the Enrollment
// tab, sets the enrollment status to "Cancelled", and saves. Used by Scenario
// 6 (cancel/complete from pool) and any other flow that needs to terminate
// an active enrollment without deleting the student record.
//
// The Edit modal uses the same component as Add Student. Tabs are clickable
// directly in edit mode (no Next button forced). The status options match
// ENROLLMENT_STATUS_OPTIONS in src/components/student/student-modal.tsx:304-310:
//   Active / Completed / Cancelled / Expired / Pending.

export default {
  id: "cancel_enrollment",
  description: "Cancel a student's enrollment by editing their Enrollment-tab Status to 'Cancelled' and saving.",
  fields: {
    student: { type: "string", required: true, example: "Abu", desc: "Student whose enrollment to cancel" },
    status: { type: "enum:active,completed,cancelled,expired,pending", required: false, default: "cancelled", desc: "Status to set (defaults to cancelled)" },
  },
  ui: async (browser, args) => {
    browser.open("/student");

    // Find the row containing the student name and click the per-row Edit
    // button. aria-label format is "Edit student <name>" (verified in
    // src/components/student/student-table.tsx).
    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const findAndClick = `(() => {
      const buttons = document.querySelectorAll('button[aria-label]');
      for (const b of buttons) {
        if (b.disabled) continue;
        const aria = b.getAttribute('aria-label') || '';
        if (aria === 'Edit student ${safe}' || aria.startsWith('Edit student ${safe}')) {
          b.click();
          return 'clicked';
        }
      }
      return 'no_button';
    })()`;
    const out = browser.ab(`eval "${findAndClick.replace(/"/g, '\\"')}"`);
    if (out.includes("no_button")) {
      throw new Error(`cancel_enrollment: no Edit button for student "${args.student}"`);
    }
    browser.sleep(500);
    browser.ab(`wait --load networkidle`);

    // Jump to the Enrollment tab. In edit mode tabs are clickable directly
    // (student-modal.tsx:912 — onClick={() => setActiveTab(tab.id)}).
    browser.clickDialogButton("Enrollment");
    browser.sleep(400);

    // Change Status. Capitalised label as per ENROLLMENT_STATUS_OPTIONS.
    const statusLabel =
      (args.status || "cancelled").charAt(0).toUpperCase() +
      (args.status || "cancelled").slice(1).toLowerCase();
    browser.selectByLabel("Status", statusLabel);
    browser.sleep(300);

    browser.clickDialogButton("Save Student");
  },
};
