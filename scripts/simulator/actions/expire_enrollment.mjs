// Action: expire_enrollment
//
// DB-stamps `enrollments.expires_at` to a past date, simulating time passing
// past the package's expiry deadline. The next page load that calls
// `checkAndExpireEnrollments()` (student/attendance/dashboard pages) will
// flip the enrollment status to 'expired' and zero its sessions_remaining.
//
// Used by Scenario 12 (Session Expiry) and any flow that needs to model the
// "user came back after enrollment deadline" case without waiting weeks.

export default {
  id: "expire_enrollment",
  description: "Stamp a student's enrollment.expires_at to a past date so checkAndExpireEnrollments will expire it on next page load.",
  fields: {
    student: { type: "string", required: true, example: "Ali12" },
    days_ago: { type: "number", required: false, default: 1, desc: "How many days in the past to set expires_at (default 1)" },
  },
  ui: async (browser, args, ctx = {}) => {
    const supabase = ctx.db;
    if (!supabase) {
      throw new Error("expire_enrollment: missing DB context — runner must pass { db, fixtures }");
    }
    const branchId = ctx.fixtures?.branchId;
    if (!branchId) {
      throw new Error("expire_enrollment: ctx.fixtures.branchId missing");
    }

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
      throw new Error(`expire_enrollment: student "${args.student}" not found in branch`);
    }

    const days = args.days_ago ?? 1;
    const past = new Date();
    past.setDate(past.getDate() - days);
    const pastIso = past.toISOString();

    const { error, count } = await supabase
      .from("enrollments")
      .update({ expires_at: pastIso, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("student_id", student.id)
      .eq("status", "active")
      .is("deleted_at", null);
    if (error) throw new Error(`expire_enrollment: ${error.message}`);
    if ((count ?? 0) === 0) {
      throw new Error(`expire_enrollment: no active enrollment found for "${args.student}"`);
    }

    // Force the LMS's on-demand expiry sweep to run by visiting /student.
    // This is what checkAndExpireEnrollments() is wired into.
    browser.open("/student");
    browser.sleep(800);
  },
};
