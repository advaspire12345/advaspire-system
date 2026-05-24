// Action: backdate_payment
//
// DB-stamps `payments.paid_at` to N days ago for a student's most-recent
// paid payment. Used by Scenario 15 (Payment Record Immutability — 1-Week
// Grace Period) to simulate the payment having been paid more than a week
// ago, which should flip the UI's edit/delete affordances to "Locked".

export default {
  id: "backdate_payment",
  description: "Stamp a student's latest paid payment.paid_at to N days ago — for grace-period testing.",
  fields: {
    student: { type: "string", required: true, example: "Ali15" },
    days_ago: { type: "number", required: false, default: 8, desc: "How many days in the past to set paid_at (default 8 — outside the 1-week grace period)" },
  },
  ui: async (_browser, args, ctx = {}) => {
    const supabase = ctx.db;
    if (!supabase) throw new Error("backdate_payment: missing DB context");
    const branchId = ctx.fixtures?.branchId;
    if (!branchId) throw new Error("backdate_payment: ctx.fixtures.branchId missing");

    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("name", args.student)
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const student = (students ?? [])[0];
    if (!student) {
      throw new Error(`backdate_payment: student "${args.student}" not found in branch`);
    }

    // Find latest paid payment for the student (direct or via their pool).
    let { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("student_id", student.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
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
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (poolPayment) payment = poolPayment;
      }
    }

    if (!payment) {
      throw new Error(`backdate_payment: no paid payment for "${args.student}"`);
    }

    const days = args.days_ago ?? 8;
    const past = new Date();
    past.setDate(past.getDate() - days);
    const pastIso = past.toISOString();

    const { error } = await supabase
      .from("payments")
      .update({ paid_at: pastIso, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (error) throw new Error(`backdate_payment: ${error.message}`);
  },
};
