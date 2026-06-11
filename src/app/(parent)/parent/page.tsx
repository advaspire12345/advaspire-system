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
import { getUpcomingSessions } from "@/data/reschedules";
import { ParentNav } from "@/components/parent/parent-nav";
import { updateParentProfileAction } from "@/app/(parent)/parent/profile-actions";
import type { ParentProfileData } from "@/app/(parent)/parent/profile-actions";
import { ChildrenSection } from "@/components/parent/children-section";
import { UpcomingClasses } from "@/components/parent/upcoming-classes";
import { ParentCalendar } from "@/components/parent/parent-calendar";
import { AttendanceList } from "@/components/parent/attendance-list";
import { MissionActivity } from "@/components/parent/mission-activity";
import { ProjectGallery } from "@/components/parent/project-gallery";
import { PaymentList } from "@/components/parent/payment-list";
import { PaymentWarningModal } from "@/components/parent/payment-warning-modal";
import { ParentProfileHeader } from "@/components/parent/parent-profile-header";
import { SessionTransferCard } from "@/components/parent/session-transfer-card";
import {
  getPendingSenderTransfersForParent,
  getPendingReceiverTransfersForParent,
} from "@/data/session-transfers";

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
  const [
    attendance,
    upcomingClasses,
    payments,
    photos,
    events,
    upcomingSessions,
    pendingSenderTransfers,
    pendingReceiverTransfers,
  ] = await Promise.all([
    getParentAttendanceHistory(studentIds),
    Promise.resolve(getParentUpcomingClasses(portalData.children)),
    getParentPaymentHistory(studentIds),
    getParentProjectPhotos(studentIds),
    getParentEvents(portalData.parent.id),
    getUpcomingSessions(studentIds),
    getPendingSenderTransfersForParent(user.id),
    getPendingReceiverTransfersForParent(user.id),
  ]);

  const senderTransferRows = pendingSenderTransfers.map((r) => ({
    id: r.transfer.id,
    fromStudentName: r.fromStudentName,
    toStudentName: r.toStudentName,
    courseName: r.courseName,
    sessions: r.transfer.sessions,
  }));
  const receiverTransferRows = pendingReceiverTransfers.map((r) => ({
    id: r.transfer.id,
    fromStudentName: r.fromStudentName,
    toStudentName: r.toStudentName,
    courseName: r.courseName,
    sessions: r.transfer.sessions,
  }));

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

      <ParentNav parentName={portalData.parent.name} userId={user.id} />

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {senderTransferRows.length > 0 && (
          <SessionTransferCard mode="approve" rows={senderTransferRows} />
        )}
        {receiverTransferRows.length > 0 && (
          <SessionTransferCard mode="accept" rows={receiverTransferRows} />
        )}

        {/* Profile Header Banner */}
        <ParentProfileHeader
          parentName={portalData.parent.name}
          parentEmail={portalData.parent.email}
          parentPhoto={portalData.parent.photo ?? portalData.children[0]?.photo}
          coverPhoto={portalData.parent.cover_photo}
          childrenCount={portalData.children.length}
          totalSessions={portalData.totalSessionsRemaining}
          totalAttended={portalData.totalSessionsAttended}
          nextClass={
            portalData.nextClass
              ? {
                  date: portalData.nextClass.date,
                  startTime: portalData.nextClass.startTime,
                  dayOfWeek: portalData.nextClass.dayOfWeek,
                }
              : null
          }
          profile={{
            id: portalData.parent.id,
            name: portalData.parent.name,
            email: portalData.parent.email,
            phone: portalData.parent.phone,
            address: portalData.parent.address,
            postcode: portalData.parent.postcode,
            city: portalData.parent.city,
            photo: portalData.parent.photo ?? null,
            coverPhoto: portalData.parent.cover_photo ?? null,
          } satisfies ParentProfileData}
          onSaveProfile={updateParentProfileAction}
        />

        {/* Top row: Children + Upcoming Classes (same height) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:items-stretch" data-tour="parent-children">
          <div className="md:col-span-7 flex flex-col">
            <ChildrenSection students={portalData.children} />
          </div>
          <div className="md:col-span-5 flex flex-col">
            <UpcomingClasses classes={upcomingClasses} />
          </div>
        </div>

        {/* Calendar: full width */}
        <div data-tour="parent-calendar">
        <ParentCalendar
          scheduledDates={scheduledDates}
          attendanceDates={attendanceDates}
          parentId={portalData.parent.id}
          initialEvents={events}
          upcomingClasses={upcomingClasses}
          upcomingSessions={upcomingSessions}
        />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            <MissionActivity records={attendance} />
            <ProjectGallery photos={photos} />
          </div>
          <div className="md:col-span-5 space-y-6" data-tour="parent-payments">
            <PaymentList payments={payments} />
            <AttendanceList records={attendance} />
          </div>
        </div>
      </main>
    </>
  );
}
