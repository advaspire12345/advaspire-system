import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceLogTable } from "@/components/attendance/attendance-log-table";
import { getAttendanceLogPaginated } from "@/data/attendance";
import { getAllInstructors } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function AttendanceLogPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.attendance_log;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const params = await searchParams;
  const startDate = params.startDate || undefined;
  const endDate = params.endDate || undefined;

  // Fetch data in parallel
  const [attendanceLogResult, instructors] = await Promise.all([
    getAttendanceLogPaginated(user.email, { offset: 0, limit: 10, startDate, endDate }),
    getAllInstructors(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Attendance History"
          description="View and manage historical attendance records"
          mascotImage="/banners/mascot.png"
        />

        <AttendanceLogTable
          initialData={attendanceLogResult.rows}
          totalCount={attendanceLogResult.totalCount}
          instructors={instructors}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </div>
    </main>
  );
}
