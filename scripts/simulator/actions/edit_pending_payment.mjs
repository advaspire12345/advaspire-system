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
  description: "Open the Edit modal for a student's pending payment and change the package OR toggle Settle Deficit.",
  fields: {
    student: { type: "string", required: true, example: "SimStu1", desc: "Student whose pending-payment row to edit" },
    new_package: { type: "string", required: false, example: "12 Sessions", desc: "Option-label prefix to select. Format: '<count> Month(s)|Session(s)'. Skipped when settle_deficit_sessions is set." },
    settle_deficit_sessions: { type: "number", required: false, example: 2, desc: "If set, toggles 'Settle Deficit' ON and writes this many sessions to settle. Bypasses package binding (payment_type becomes 'settle_deficit')." },
    settle_deficit_amount: { type: "number", required: false, example: 110, desc: "Override the amount that auto-fills when Settle Deficit is toggled ON. If omitted, the modal's auto-computed amount is kept." },
  },
  defaultExpectations: ({ student, new_package, settle_deficit_sessions }) => ({
    "*": settle_deficit_sessions
      ? [
          {
            field: "payments.custom_sessions",
            by: { searchText: student },
            dbField: "payments.custom_sessions",
            expected: settle_deficit_sessions,
          },
          {
            field: "payments.payment_type",
            by: { searchText: student },
            dbField: "payments.payment_type",
            expected: "settle_deficit",
          },
        ]
      : [
          {
            field: "pending_payments_table.package",
            by: { searchText: student },
            dbField: "payments.package_id",
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

    if (args.settle_deficit_sessions != null) {
      // Toggle the "Settle Deficit" button ON. It's a <button aria-pressed>
      // sibling of the label text "Settle Deficit".
      const toggleClicked = browser.ab(
        `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return 'no_dialog'; const btns = dlg.querySelectorAll('button[aria-pressed]'); for (const b of btns) { const card = b.closest('div')?.parentElement; const text = card ? card.textContent : ''; if (text && text.includes('Settle Deficit')) { if (b.getAttribute('aria-pressed') === 'true') return 'already_on'; b.click(); return 'clicked'; } } return 'no_toggle'; })()"`,
      );
      if (toggleClicked.includes("no_toggle") || toggleClicked.includes("no_dialog")) {
        throw new Error(`edit_pending_payment: 'Settle Deficit' toggle not found in modal — make sure the payment exists in edit mode`);
      }
      browser.sleep(400);

      // The inputs use floating-label markup (sibling <label>) so a11y label
      // matching doesn't find them. Locate via JS by adjacent label text.
      const setInputByLabel = (labelText, value) => {
        const js = `(() => {
          const dlg = document.querySelector('[role="dialog"]');
          if (!dlg) return 'no_dialog';
          const labels = dlg.querySelectorAll('label');
          for (const lab of labels) {
            if ((lab.textContent || '').trim() === '${labelText}') {
              const wrap = lab.parentElement;
              const input = wrap ? wrap.querySelector('input') : null;
              if (!input) return 'no_input';
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, '${value}');
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return 'ok';
            }
          }
          return 'no_label';
        })()`;
        const out = browser.ab(`eval "${js.replace(/"/g, '\\"')}"`);
        if (!out.includes("ok")) {
          throw new Error(`edit_pending_payment: could not set input "${labelText}" (got ${out.trim()})`);
        }
      };

      setInputByLabel("Sessions to settle", args.settle_deficit_sessions);
      if (args.settle_deficit_amount != null) {
        setInputByLabel("Amount (RM)", args.settle_deficit_amount);
      }
      browser.sleep(200);
    } else if (args.new_package) {
      browser.selectByLabel("Package", args.new_package);
      browser.sleep(300);
    }

    browser.clickDialogButton("Save Changes");
  },
};
