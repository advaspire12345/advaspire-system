// Action: approve_pending_payment — open the approve modal on /pending-payments
// for the named student, optionally update the package, then approve.

export default {
  id: "approve_pending_payment",
  description: "Approve (and optionally update) a pending payment for a student on /pending-payments",
  fields: {
    student: { type: "string", required: true, example: "SimStu1" },
    update_package: { type: "string", required: false, example: "12-session", desc: "If set, edit the pending payment's package before approving" },
    voucher: { type: "string", required: false, example: "DISC20", desc: "Optional voucher code to apply" },
  },
  defaultExpectations: ({ student }) => ({
    actor: [
      { field: "pending_payments_table.status", expected: "Approved", by: { searchText: student } },
    ],
    instructor: [
      // After approval, sessions_remaining should jump to package - already_used.
      { field: "attendance_table.sessions_remaining", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
      { field: "mark_present_modal.sessions_remaining", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
    ],
    "*": [
      { field: "student_table.period_active", by: { searchText: student }, dbField: "enrollments.sessions_remaining" },
      { field: "student_table.payment_settled", by: { searchText: student }, dbField: "payments.amount(sum, status=paid)" },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/pending-payments");

    // The Approve button on the pending-payments table uses aria-label
    // "Approve payment" without the student name — same on every row. To
    // target the right row, find the table row containing the student name
    // and click the Approve button inside it.
    //
    // The button is *disabled* until both `paid_at` and `receipt_photo` are
    // set on the payment (canApprove rule in pending-payment-table.tsx:383).
    // The scenario must call mark_paid_with_receipt (or stamp those columns
    // directly in DB) before this action; otherwise approve is a no-op.
    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const findAndClick = `(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent && row.textContent.includes("${safe}")) {
          const btn = row.querySelector('button[aria-label="Approve payment"]');
          if (!btn) continue;
          if (btn.disabled) return 'disabled';
          btn.click();
          return 'clicked';
        }
      }
      return 'no_row';
    })()`;
    // Retry the lookup a few times — under load Next.js sometimes serves
    // a slightly-stale /pending-payments render that doesn't yet include
    // the row inserted milliseconds earlier by add_student/mark_offline_paid.
    // Total wait budget ≈ 6s.
    let out = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      out = browser.ab(`eval "${findAndClick.replace(/"/g, '\\"')}"`);
      if (out.includes("clicked")) break;
      if (out.includes("disabled")) break; // row found but not ready — fail fast
      // No row yet — wait, soft-reload, retry.
      browser.sleep(1000);
      if (attempt === 2) browser.open("/pending-payments");
    }
    if (out.includes("no_row")) {
      throw new Error(`approve_pending_payment: no pending-payment row for "${args.student}"`);
    }
    if (out.includes("disabled")) {
      throw new Error(`approve_pending_payment: Approve button disabled for "${args.student}" — payment needs paid_at + receipt_photo first`);
    }
    browser.sleep(500);
    browser.ab(`wait --load networkidle`);

    if (args.update_package) browser.selectByLabel("Package", args.update_package);
    if (args.voucher) browser.selectByLabel("Voucher", args.voucher);

    // The modal's confirm button reads "Approve & Save" or similar — try a
    // few common labels.
    try {
      browser.clickDialogButton("Approve & Save");
    } catch {
      try { browser.clickDialogButton("Approve"); }
      catch { browser.clickDialogButton("Save"); }
    }
  },
};
