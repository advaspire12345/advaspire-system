import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { StudentTable } from "@/components/student/student-table";
import { getStudentsForTable } from "@/data/students";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";
import {
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
} from "./actions";

export default async function StudentsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  // Fetch real data from database
  const [students, branchesData, coursesData] = await Promise.all([
    getStudentsForTable(user.email),
    getAllBranches(),
    getAllCourses(),
  ]);

  const branches = branchesData.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const courses = coursesData.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Students"
          description="Manage enrolled students, programs, and schedules"
          mascotImage="/banners/mascot.png"
        />

        <StudentTable
          initialData={students}
          branches={branches}
          courses={courses}
          onAdd={createStudentAction}
          onEdit={updateStudentAction}
          onDelete={deleteStudentAction}
        />
      </div>
    </main>
  );
}
