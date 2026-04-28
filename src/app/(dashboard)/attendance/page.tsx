import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import {
  getEnrollmentsForAttendancePaginated,
  getAllStudentsForManualAttendance,
} from "@/data/attendance";
import { getAllInstructorsForAttendance, getInstructorsByBranchForAttendance, getUserByEmail } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

// Disable caching for this page to always get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AttendancePage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.attendance;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const dbUser = await getUserByEmail(user.email);
  const role = permData!.role;

  // Fetch instructors based on role:
  // - instructor: no need to fetch (auto-fill with own name)
  // - company_admin: instructors + company_admins in same branch
  // - group_admin/super_admin: all instructors + company_admins
  const getInstructors = () => {
    if (role === "instructor") return Promise.resolve([]);
    if (role === "company_admin" && dbUser?.branch_id) {
      return getInstructorsByBranchForAttendance(dbUser.branch_id);
    }
    return getAllInstructorsForAttendance();
  };

  // Run on-demand expiry check before fetching data
  const { checkAndExpireEnrollments } = await import("@/data/enrollments");
  await checkAndExpireEnrollments();

  // Fetch data in parallel
  const [enrollmentsResult, allStudentsForManual, instructors] = await Promise.all([
    getEnrollmentsForAttendancePaginated(user.email, { offset: 0, limit: 10 }),
    getAllStudentsForManualAttendance(user.email),
    getInstructors(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Take Attendance"
          description="Manage and review student attendance records"
          mascotImage="/banners/mascot.png"
        />

        <AttendanceTable
          initialData={enrollmentsResult.rows}
          totalCount={enrollmentsResult.totalCount}
          allStudentsForManualAdd={allStudentsForManual}
          instructors={instructors}
          hideBranch={role === "company_admin" || role === "instructor"}
          canCreate={perms?.can_create}
          currentUserName={role === "instructor" ? dbUser?.name : undefined}
        />
      </div>
    </main>
  );
}
