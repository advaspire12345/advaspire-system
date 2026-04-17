import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getParentPortalData,
  getParentAttendanceHistory,
  getParentUpcomingClasses,
  getParentPaymentHistory,
  getParentProjectPhotos,
  getParentEvents,
} from "@/data/parent-portal";
import { ParentNav } from "@/components/parent/parent-nav";
import { ParentStats } from "@/components/parent/parent-stats";
import { ChildrenSection } from "@/components/parent/children-section";
import { UpcomingClasses } from "@/components/parent/upcoming-classes";
import { ParentCalendar } from "@/components/parent/parent-calendar";
import { AttendanceList } from "@/components/parent/attendance-list";
import { MissionActivity } from "@/components/parent/mission-activity";
import { ProjectGallery } from "@/components/parent/project-gallery";
import { PaymentList } from "@/components/parent/payment-list";
import { PaymentWarningModal } from "@/components/parent/payment-warning-modal";

export default async function ParentPortalPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const portalData = await getParentPortalData(user.id);

  if (!portalData) {
    redirect("/login");
  }

  const studentIds = portalData.children.map((c) => c.id);

  // Fetch all supplementary data in parallel
  const [attendance, upcomingClasses, payments, photos, events] =
    await Promise.all([
      getParentAttendanceHistory(studentIds),
      Promise.resolve(getParentUpcomingClasses(portalData.children)),
      getParentPaymentHistory(studentIds),
      getParentProjectPhotos(studentIds),
      getParentEvents(portalData.parent.id),
    ]);

  // Compute calendar dates from upcoming classes
  const scheduledDates = upcomingClasses.map((c) => new Date(c.date));

  // Compute attendance dates
  const attendanceDates = attendance
    .filter((a) => a.status === "present" || a.status === "late")
    .map((a) => new Date(a.date));

  return (
    <>
      {portalData.hasNegativeSessions && (
        <PaymentWarningModal
          negativeChildren={portalData.negativeChildren}
        />
      )}

      <ParentNav parentName={portalData.parent.name} />

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-xl bg-gradient-to-r from-[#615DFA] to-[#23D2E2] p-5 text-white">
          <h1 className="text-2xl md:text-3xl font-bold">
            Hi {portalData.parent.name.split(" ")[0]}!
          </h1>
          <p className="text-sm font-medium text-white/80 mt-1">
            Here&apos;s what&apos;s happening with your children
          </p>
        </div>

        {/* Stats Row */}
        <ParentStats
          childrenCount={portalData.children.length}
          totalSessionsActive={portalData.totalSessionsRemaining}
          totalSessionsAttended={portalData.totalSessionsAttended}
          nextClass={
            portalData.nextClass
              ? {
                  date: portalData.nextClass.date,
                  startTime: portalData.nextClass.startTime,
                  dayOfWeek: portalData.nextClass.dayOfWeek,
                }
              : null
          }
        />

        {/* Top row: Children + Upcoming Classes (same height) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:items-stretch">
          <div className="md:col-span-7 flex flex-col">
            <ChildrenSection students={portalData.children} />
          </div>
          <div className="md:col-span-5 flex flex-col">
            <UpcomingClasses classes={upcomingClasses} />
          </div>
        </div>

        {/* Calendar: full width */}
        <ParentCalendar
          scheduledDates={scheduledDates}
          attendanceDates={attendanceDates}
          parentId={portalData.parent.id}
          initialEvents={events}
          upcomingClasses={upcomingClasses}
        />

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            <MissionActivity records={attendance} />
            <ProjectGallery photos={photos} />
          </div>
          <div className="md:col-span-5 space-y-6">
            <PaymentList payments={payments} />
            <AttendanceList records={attendance} />
          </div>
        </div>
      </main>
    </>
  );
}
