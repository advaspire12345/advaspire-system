import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import {
  getEnrollmentsForAttendance,
  getAllStudentsForManualAttendance,
} from "@/data/attendance";
import { getAllInstructors } from "@/data/users";

// Disable caching for this page to always get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AttendancePage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  // Fetch data in parallel
  const [enrollments, allStudentsForManual, instructors] = await Promise.all([
    getEnrollmentsForAttendance(user.email),
    getAllStudentsForManualAttendance(user.email),
    getAllInstructors(),
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
        />
      </div>
    </main>
  );
}
