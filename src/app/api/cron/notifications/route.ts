import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/db";
import { notifyStaff, purgeOldNotifications } from "@/data/notifications";

/**
 * Vercel cron endpoint — invoked weekly. Configured in vercel.json.
 *
 * Auth: requests from Vercel cron carry an Authorization: Bearer ${CRON_SECRET}
 * header. We reject anything else so the endpoint isn't publicly hittable.
 *
 * Runs all weekly time-based notifications + the 30-day cleanup.
 */

function authorize(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.warn("[cron/notifications] CRON_SECRET not set — refusing request");
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

function currentWeekRange(): { mondayStr: string; sundayStr: string } {
  const today = new Date();
  const dow = today.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { mondayStr: fmt(monday), sundayStr: fmt(sunday) };
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mondayStr, sundayStr } = currentWeekRange();
  const summary: Record<string, number> = {};

  // 1. This-week trial reminder → instructors + assistant_admin in the trial's company
  try {
    const { data: trials } = await supabaseAdmin
      .from("trials")
      .select("id, child_name, scheduled_date, scheduled_time, branch_id, branch:branches!students_branch_id_branches_id_fk(parent_id, type)")
      .gte("scheduled_date", mondayStr)
      .lte("scheduled_date", sundayStr)
      .in("status", ["pending", "confirmed"])
      .is("deleted_at", null);

    let trialNotifs = 0;
    for (const t of trials ?? []) {
      const branch = (t.branch as any) ?? null;
      const companyId = branch?.type === "company" ? t.branch_id : branch?.parent_id;
      if (!companyId) continue;
      trialNotifs += await notifyStaff(
        { roles: ["instructor", "assistant_admin"], companyId },
        {
          type: "trial_this_week",
          title: "Trial scheduled this week",
          body: `${t.child_name} on ${t.scheduled_date} ${t.scheduled_time ?? ""}`.trim(),
          link: `/trial`,
          data: { trialId: t.id },
        },
      );
    }
    summary.trial_this_week = trialNotifs;
  } catch (err) {
    console.warn("[cron] trial_this_week:", err);
  }

  // 2. This-week examination reminder → instructors + assistant_admin
  try {
    const { data: exams } = await supabaseAdmin
      .from("examinations")
      .select(`
        id, exam_name, exam_date, reattempt_count,
        student:students(id, name, branch_id, branch:branches!students_branch_id_branches_id_fk(parent_id, type))
      `)
      .gte("exam_date", mondayStr)
      .lte("exam_date", sundayStr)
      .in("status", ["scheduled", "in_progress"])
      .is("deleted_at", null);

    let examNotifs = 0;
    let reattemptNotifs = 0;
    for (const e of exams ?? []) {
      const student = (e.student as any) ?? null;
      const branch = (student?.branch as any) ?? null;
      const companyId = branch?.type === "company" ? student?.branch_id : branch?.parent_id;
      if (!companyId || !student) continue;

      examNotifs += await notifyStaff(
        { roles: ["instructor", "assistant_admin"], companyId },
        {
          type: "exam_this_week",
          title: "Examination scheduled this week",
          body: `${student.name}: ${e.exam_name} on ${e.exam_date}`,
          link: `/examination`,
          data: { examId: e.id, studentId: student.id },
        },
      );

      // Reattempt: separate weekly nudge so instructor pays extra attention
      if ((e.reattempt_count ?? 0) > 0) {
        reattemptNotifs += await notifyStaff(
          { roles: ["instructor", "assistant_admin"], companyId },
          {
            type: "reattempt_weekly",
            title: "Reattempt exam — extra attention needed",
            body: `${student.name} (attempt #${(e.reattempt_count ?? 0) + 1}) — ${e.exam_name}`,
            link: `/examination`,
            data: { examId: e.id, studentId: student.id },
          },
        );
      }
    }
    summary.exam_this_week = examNotifs;
    summary.reattempt_weekly = reattemptNotifs;
  } catch (err) {
    console.warn("[cron] exam_this_week / reattempt_weekly:", err);
  }

  // 3. Unmarked attendance reminder → instructor + assistant_admin per branch
  // Heuristic: any active enrollment with no attendance row this week → potential unmarked.
  // We send one notification per branch that has any unmarked enrollment, not per row,
  // so the instructor isn't spammed.
  try {
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select(`
        id, student_id,
        student:students(branch_id, branch:branches!students_branch_id_branches_id_fk(parent_id, type))
      `)
      .eq("status", "active")
      .is("deleted_at", null);

    if (enrollments && enrollments.length > 0) {
      const enrollmentIds = enrollments.map((e) => e.id);
      const { data: thisWeekAttendance } = await supabaseAdmin
        .from("attendance")
        .select("enrollment_id")
        .in("enrollment_id", enrollmentIds)
        .gte("date", mondayStr)
        .lte("date", sundayStr);

      const markedSet = new Set((thisWeekAttendance ?? []).map((a) => a.enrollment_id));
      const branchesWithGaps = new Set<string>();
      for (const e of enrollments) {
        if (!markedSet.has(e.id)) {
          const branchId = (e.student as any)?.branch_id;
          if (branchId) branchesWithGaps.add(branchId);
        }
      }

      let unmarkedNotifs = 0;
      for (const branchId of branchesWithGaps) {
        const { data: br } = await supabaseAdmin
          .from("branches")
          .select("parent_id, type")
          .eq("id", branchId)
          .single();
        const companyId = br?.type === "company" ? branchId : br?.parent_id;
        if (!companyId) continue;
        unmarkedNotifs += await notifyStaff(
          { roles: ["instructor", "assistant_admin"], branchId, companyId },
          {
            type: "attendance_unmarked",
            title: "Unmarked attendance this week",
            body: "Some students at your branch still don't have their weekly attendance marked",
            link: `/attendance`,
            data: { branchId },
          },
        );
      }
      summary.attendance_unmarked = unmarkedNotifs;
    }
  } catch (err) {
    console.warn("[cron] attendance_unmarked:", err);
  }

  // 4. Cleanup: delete notifications older than 30 days
  try {
    summary.purged = await purgeOldNotifications();
  } catch (err) {
    console.warn("[cron] purge:", err);
  }

  return NextResponse.json({ ok: true, summary, weekRange: { mondayStr, sundayStr } });
}
