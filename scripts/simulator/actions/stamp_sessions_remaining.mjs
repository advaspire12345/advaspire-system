// Action: stamp_sessions_remaining
//
// DB-stamps `enrollments.sessions_remaining` for a student (or their pool)
// to a specific value, bypassing the need to mark N intermediate attendances
// via the UI. Used by Scenarios 1 and 9 to set the pre-final-attendance state
// so a single mark_present can be used to verify the auto-renewal trigger
// at sessions <= 0.
//
// For pooled enrollments, the value is written to the pool's
// `sessions_remaining` instead of the individual enrollment.

export default {
  id: "stamp_sessions_remaining",
  description: "DB-stamp a student's enrollment.sessions_remaining (or their pool's) to a specific value — skip intermediate attendances.",
  fields: {
    student: { type: "string", required: true, example: "Ali1" },
    value: { type: "number", required: true, example: 1, desc: "Target sessions_remaining (typically 1 — so the next mark_present triggers auto-renewal)" },
  },
  ui: async (_browser, args, ctx = {}) => {
    const supabase = ctx.db;
    if (!supabase) throw new Error("stamp_sessions_remaining: missing DB context");
    const branchId = ctx.fixtures?.branchId;
    if (!branchId) throw new Error("stamp_sessions_remaining: ctx.fixtures.branchId missing");

    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("name", args.student)
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const student = (students ?? [])[0];
    if (!student) throw new Error(`stamp_sessions_remaining: student "${args.student}" not found`);

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, pool_id")
      .eq("student_id", student.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!enrollment) throw new Error(`stamp_sessions_remaining: no active enrollment`);

    if (enrollment.pool_id) {
      const { error } = await supabase
        .from("shared_session_pools")
        .update({ sessions_remaining: args.value, updated_at: new Date().toISOString() })
        .eq("id", enrollment.pool_id);
      if (error) throw new Error(`stamp_sessions_remaining (pool): ${error.message}`);
    } else {
      const { error } = await supabase
        .from("enrollments")
        .update({ sessions_remaining: args.value, updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      if (error) throw new Error(`stamp_sessions_remaining (enrollment): ${error.message}`);
    }
  },
};
