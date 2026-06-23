import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/db";
import { notifyStaff, purgeOldNotifications } from "@/data/notifications";
import { checkInactivityAndNotify } from "@/data/enrollments";

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

  // 2. Unmarked attendance reminder → instructor + assistant_admin per branch
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

  // 4. Inactivity reminders → assistant_admin + company_admin per branch.
  // Non-destructive: never cancels or zeros sessions; admins decide.
  try {
    summary.inactivity_reminder = await checkInactivityAndNotify();
  } catch (err) {
    console.warn("[cron] inactivity_reminder:", err);
  }

  // 5. Cleanup: delete notifications older than 30 days
  try {
    summary.purged = await purgeOldNotifications();
  } catch (err) {
    console.warn("[cron] purge:", err);
  }

  return NextResponse.json({ ok: true, summary, weekRange: { mondayStr, sundayStr } });
}
