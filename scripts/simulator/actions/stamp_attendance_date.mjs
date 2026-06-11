// Action: stamp_attendance_date
//
// Backdates the latest `attendance` rows for a student to consecutive
// weeks ending on a target date. Used both for year-long compression
// (a 12-month walk-through compressed to a single run) and for any
// scenario that needs the inactivity-cron / completion-window / expiry
// logic to behave as if real time passed.
//
// Pure DB write — no UI driven.

export default {
  id: "stamp_attendance_date",
  description: "Backdate a student's latest attendance rows to consecutive weeks ending on a target date.",
  fields: {
    student: { type: "string", required: true, example: "Sam" },
    date: { type: "string", required: true, example: "TODAY-7", desc: "Anchor date (ISO yyyy-mm-dd or TODAY-N / TODAY+N). The latest attendance row lands on this date." },
    n_back: { type: "number", required: false, example: 4, desc: "How many recent attendance rows to backdate. Each prior row is shifted 7 days before the next. Default 1." },
  },
  ui: async (_browser, args, ctx = {}) => {
    const supabase = ctx.db;
    if (!supabase) throw new Error("stamp_attendance_date: missing DB context");
    const branchId = ctx.fixtures?.branchId;
    if (!branchId) throw new Error("stamp_attendance_date: ctx.fixtures.branchId missing");

    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("name", args.student)
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const student = (students ?? [])[0];
    if (!student) throw new Error(`stamp_attendance_date: student "${args.student}" not found`);

    // attendance is keyed by enrollment_id — resolve the student's
    // active enrollment(s) and pull rows by that link.
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", student.id)
      .is("deleted_at", null);
    const enrollIds = (enrollments ?? []).map((e) => e.id);
    if (enrollIds.length === 0) {
      throw new Error(`stamp_attendance_date: no enrollments for "${args.student}"`);
    }

    const n = args.n_back ?? 1;
    const { data: rows } = await supabase
      .from("attendance")
      .select("id, date")
      .in("enrollment_id", enrollIds)
      .order("date", { ascending: false })
      .limit(n);
    if (!rows || rows.length === 0) {
      throw new Error(`stamp_attendance_date: no attendance rows for "${args.student}"`);
    }

    const base = new Date(args.date + "T00:00:00");
    for (let i = 0; i < rows.length; i++) {
      const target = new Date(base);
      target.setDate(target.getDate() - 7 * i);
      const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
      const { error } = await supabase
        .from("attendance")
        .update({ date: iso })
        .eq("id", rows[i].id);
      if (error) throw new Error(`stamp_attendance_date (row ${rows[i].id}): ${error.message}`);
    }
  },
};
