// Action: switch_course
//
// Admin moves a student from their current course to a different course
// in the same branch. Drives the new "Move to another course" button in
// the student-modal Enrollment tab + the course-switch modal that opens.

export default {
  id: "switch_course",
  description: "Admin: open student edit modal, click 'Move to another course', pick target, submit.",
  fields: {
    student: { type: "string", required: true, example: "Sara" },
    target_course: { type: "string", required: true, example: "Course B" },
    notes: { type: "string", required: false, example: "Parent requested switch" },
  },
  ui: async (browser, args) => {
    browser.open("/student");
    browser.sleep(500);

    // Click the row's edit button via JS scoped by name.
    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const findAndOpen = `(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent && row.textContent.includes("${safe}")) {
          const btn = row.querySelector('button[aria-label="Edit student"]') ||
                      row.querySelector('button[title*="Edit"]');
          if (btn && !btn.disabled) { btn.click(); return 'clicked'; }
        }
      }
      return 'no_row';
    })()`;
    const out = browser.ab(`eval "${findAndOpen.replace(/"/g, '\\"')}"`);
    if (out.includes("no_row")) {
      throw new Error(`switch_course: no row for "${args.student}"`);
    }
    browser.sleep(800);
    browser.ab(`wait --load networkidle`);

    // Navigate to the Enrollment tab. The tab nav exposes a button labelled
    // "Enrollment" — click it.
    const tabClicked = browser.ab(
      `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return 'no_dialog'; const btns = dlg.querySelectorAll('button'); for (const b of btns) { if ((b.textContent || '').trim() === 'Enrollment') { b.click(); return 'clicked'; } } return 'no_tab'; })()"`,
    );
    if (!tabClicked.includes("clicked")) {
      throw new Error("switch_course: Enrollment tab not found");
    }
    browser.sleep(400);

    // Click the "Move to another course" button inside the modal.
    const moveClicked = browser.ab(
      `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return 'no_dialog'; const btns = dlg.querySelectorAll('button'); for (const b of btns) { if ((b.textContent || '').trim() === 'Move to another course') { b.click(); return 'clicked'; } } return 'no_button'; })()"`,
    );
    if (!moveClicked.includes("clicked")) {
      throw new Error("switch_course: 'Move to another course' button not visible — verify the student has an active enrollment");
    }
    browser.sleep(700);
    browser.ab(`wait --load networkidle`);

    browser.selectByLabel("Target course", args.target_course);
    browser.sleep(200);
    if (args.notes) browser.fillLabel("Notes (optional)", args.notes);

    browser.clickDialogButton("Move student");
  },
};
