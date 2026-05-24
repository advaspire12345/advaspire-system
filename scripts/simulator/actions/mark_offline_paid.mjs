// Action: mark_offline_paid
//
// Models the offline-payment flow: a parent has paid via bank transfer /
// cash and uploaded a payment slip. In production this is two UI steps —
// parent uploads slip in the parent portal AND admin can also edit the
// pending-payment row to set paid_at + receipt_photo. Until Billplz is wired
// up the simulator stamps these columns directly on the DB, which is the
// same end state without the file-upload UI complexity.
//
// After this action, the pending-payment row's Approve button becomes
// enabled (canApprove rule = paid_at && receipt_photo) so the next
// approve_pending_payment step can proceed.

const DUMMY_RECEIPT_URL = "https://placehold.co/600x400?text=Sim+Receipt";

export default {
  id: "mark_offline_paid",
  description:
    "Stamp the pending payment for a student as offline-paid (paid_at + receipt_photo) — bypasses file upload UI. Required before approve_pending_payment under the offline-payment flow.",
  fields: {
    student: { type: "string", required: true, example: "SimStu1", desc: "Student name — used to find the pending payment row" },
    paid_at: { type: "date", required: false, desc: "Defaults to today" },
    receipt_url: { type: "string", required: false, desc: "Defaults to a placeholder image URL" },
  },
  defaultExpectations: ({ student }) => ({
    "*": [
      { field: "pending_payments_table.paid_at_set", by: { searchText: student }, dbField: "payments.paid_at" },
    ],
  }),
  ui: async (_browser, args, ctx = {}) => {
    const supabase = ctx.db;
    if (!supabase) {
      throw new Error("mark_offline_paid: missing DB context — runner must pass { db, fixtures }");
    }

    // Find the student in THIS run's branch. Stale rows from prior runs (or
    // other scenarios) can share the same name, so we always scope by the
    // current fixture branch.
    const branchId = ctx.fixtures?.branchId;
    if (!branchId) {
      throw new Error("mark_offline_paid: ctx.fixtures.branchId missing — runner must set fixture branch first");
    }
    const { data: students } = await supabase
      .from("students")
      .select("id, created_at")
      .eq("name", args.student)
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const student = (students ?? [])[0];
    if (!student) {
      throw new Error(`mark_offline_paid: student "${args.student}" not found in branch ${branchId}`);
    }

    // The pending payment may belong directly to this student OR to a pool
    // they're a member of (pool payments are stored once with student_id =
    // the first joiner and pool_id set). Try the direct lookup first, then
    // fall through to a pool-based lookup.
    let { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("student_id", student.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("pool_id")
        .eq("student_id", student.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (enrollment?.pool_id) {
        const { data: poolPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("pool_id", enrollment.pool_id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (poolPayment) payment = poolPayment;
      }
    }

    if (!payment) {
      throw new Error(`mark_offline_paid: no pending payment for "${args.student}"`);
    }

    const paidAtIso = args.paid_at
      ? new Date(args.paid_at).toISOString()
      : new Date().toISOString();
    const receiptUrl = args.receipt_url || DUMMY_RECEIPT_URL;

    const { error } = await supabase
      .from("payments")
      .update({
        paid_at: paidAtIso,
        parent_marked_paid_at: paidAtIso,
        receipt_photo: receiptUrl,
      })
      .eq("id", payment.id);
    if (error) {
      throw new Error(`mark_offline_paid: DB update failed — ${error.message}`);
    }
  },
};
