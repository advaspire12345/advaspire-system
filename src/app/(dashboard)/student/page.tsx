import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { StudentTable } from "@/components/student/student-table";
import { getStudentsForTable } from "@/data/students";
import { getAllBranches } from "@/data/branches";
import { getAllCourses, getAllCoursePricing, getAllCourseSlots } from "@/data/courses";
import { getAllParents } from "@/data/parents";
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
  const [students, branchesData, coursesData, pricingData, slotsData, parentsData] = await Promise.all([
    getStudentsForTable(user.email),
    getAllBranches(),
    getAllCourses(),
    getAllCoursePricing(),
    getAllCourseSlots(),
    getAllParents(),
  ]);

  const branches = branchesData.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const courses = coursesData.map((c) => ({
    id: c.id,
    name: c.name,
    numberOfLevels: c.numberOfLevels,
  }));

  const coursePricing = pricingData.map((p) => ({
    id: p.id,
    courseId: p.courseId,
    packageType: p.packageType,
    price: p.price,
    duration: p.duration,
    description: p.description,
    isDefault: p.isDefault,
  }));

  const courseSlots = slotsData.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    branchId: s.branchId,
    day: s.day,
    time: s.time,
    duration: s.duration,
    limitStudent: s.limitStudent,
  }));

  const parents = parentsData.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    address: p.address,
    postcode: p.postcode,
    city: p.city,
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
          coursePricing={coursePricing}
          courseSlots={courseSlots}
          parents={parents}
          onAdd={createStudentAction}
          onEdit={updateStudentAction}
          onDelete={deleteStudentAction}
        />
      </div>
    </main>
  );
}
