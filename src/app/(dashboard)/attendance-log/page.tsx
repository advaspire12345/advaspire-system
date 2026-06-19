import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceLogTable } from "@/components/attendance/attendance-log-table";
import { getAttendanceLogPaginated } from "@/data/attendance";
import { getScheduleSlotsForFilter } from "@/data/attendance-slots";
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
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const params = await searchParams;
  // Default the date-range filter to today–today (local YYYY-MM-DD) when the
  // URL doesn't specify a range. Users can still change it via the UI.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const startDate = params.startDate || today;
  const endDate = params.endDate || today;

  // Fetch data in parallel
  const [attendanceLogResult, instructors, slotOptions] = await Promise.all([
    getAttendanceLogPaginated(user.email, { offset: 0, limit: 10, startDate, endDate }),
    getAllInstructors(),
    getScheduleSlotsForFilter(user.email),
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
          slotOptions={slotOptions}
        />
      </div>
    </main>
  );
}
