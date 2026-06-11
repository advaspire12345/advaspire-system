// Action: apply_voucher_to_payment
//
// In the pending-payment edit modal, pick a voucher to apply against
// the bill. The modal exposes a "Voucher" select with one row per
// available voucher for the student.

export default {
  id: "apply_voucher_to_payment",
  description: "Edit a pending payment and apply a voucher to discount the bill.",
  fields: {
    student: { type: "string", required: true, example: "Sam" },
    voucher_code: { type: "string", required: true, example: "EARLY-RM20", desc: "Substring match against the voucher row in the dropdown." },
  },
  ui: async (browser, args) => {
    browser.open("/pending-payments");
    browser.sleep(500);

    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const open = `(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent && row.textContent.includes("${safe}")) {
          const btn = row.querySelector('button[aria-label="Edit payment"]');
          if (btn && !btn.disabled) { btn.click(); return 'clicked'; }
        }
      }
      return 'no_row';
    })()`;
    const out = browser.ab(`eval "${open.replace(/"/g, '\\"')}"`);
    if (out.includes("no_row")) {
      throw new Error(`apply_voucher_to_payment: no pending row for "${args.student}"`);
    }
    browser.sleep(500);
    browser.ab(`wait --load networkidle`);

    browser.selectByLabel("Voucher", args.voucher_code);
    browser.sleep(300);

    browser.clickDialogButton("Save Changes");
  },
};
