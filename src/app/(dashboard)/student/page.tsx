import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { StudentTable } from "@/components/student/student-table";
import { getStudentsForTable } from "@/data/students";
import { getAllBranches } from "@/data/branches";
import { getUserBranchIds } from "@/data/users";
import { getAllCourses, getAllCoursePricing, getAllCourseSlots } from "@/data/courses";
import { getAllParents } from "@/data/parents";
import {
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
} from "./actions";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

// Force dynamic rendering to always get fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.students;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  // Fetch real data from database
  const [students, branchesData, coursesData, pricingData, slotsData, parentsData] = await Promise.all([
    getStudentsForTable(user.email),
    getAllBranches(),
    getAllCourses(),
    getAllCoursePricing(),
    getAllCourseSlots(),
    getAllParents(),
  ]);

  const useCityName = permData!.role !== "super_admin";

  // Filter branches based on role
  let filteredBranches = branchesData;
  if (useCityName) {
    const branchIds = await getUserBranchIds(user.email);
    if (branchIds && branchIds.length > 0) {
      if (permData!.role === "admin") {
        // Admin: show all company's HQ and branches
        const companyIds = new Set<string>();
        for (const b of branchesData) {
          if (branchIds.includes(b.id)) {
            if (b.type === "company") companyIds.add(b.id);
            else if (b.parent_id) companyIds.add(b.parent_id);
          }
        }
        filteredBranches = branchesData.filter(
          (b) => b.type !== "company" && b.parent_id && companyIds.has(b.parent_id)
        );
      } else {
        // Branch admin/instructor: only their own branch
        filteredBranches = branchesData.filter((b) => branchIds.includes(b.id));
      }
    }
  }

  const branches = filteredBranches.map((b) => ({
    id: b.id,
    name: useCityName ? (b.city || b.name) : b.name,
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
          hideBranch={permData!.role === "branch_admin" || permData!.role === "instructor"}
          courses={courses}
          coursePricing={coursePricing}
          courseSlots={courseSlots}
          parents={parents}
          onAdd={perms?.can_create ? createStudentAction : undefined}
          onEdit={perms?.can_edit ? updateStudentAction : undefined}
          onDelete={perms?.can_delete ? deleteStudentAction : undefined}
        />
      </div>
    </main>
  );
}
