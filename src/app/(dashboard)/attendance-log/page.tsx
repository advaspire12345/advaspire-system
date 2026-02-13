import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { AttendanceLogTable } from "@/components/attendance/attendance-log-table";
import { getAttendanceLog } from "@/data/attendance";
import { getAllInstructors } from "@/data/users";

export default async function AttendanceLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  // Fetch data in parallel
  const [attendanceLog, instructors] = await Promise.all([
    getAttendanceLog(user.email),
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

        <AttendanceLogTable initialData={attendanceLog} instructors={instructors} />
      </div>
    </main>
  );
}
