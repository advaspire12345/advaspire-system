import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import {
  getEnrollmentsForAttendance,
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
  // - branch_admin: instructors + branch_admins in same branch
  // - admin/super_admin: all instructors + branch_admins
  const getInstructors = () => {
    if (role === "instructor") return Promise.resolve([]);
    if (role === "branch_admin" && dbUser?.branch_id) {
      return getInstructorsByBranchForAttendance(dbUser.branch_id);
    }
    return getAllInstructorsForAttendance();
  };

  // Fetch data in parallel
  const [enrollments, allStudentsForManual, instructors] = await Promise.all([
    getEnrollmentsForAttendance(user.email),
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
          initialData={enrollments}
          allStudentsForManualAdd={allStudentsForManual}
          instructors={instructors}
          hideBranch={role === "branch_admin" || role === "instructor"}
          canCreate={perms?.can_create}
          currentUserName={role === "instructor" ? dbUser?.name : undefined}
        />
      </div>
    </main>
  );
}
