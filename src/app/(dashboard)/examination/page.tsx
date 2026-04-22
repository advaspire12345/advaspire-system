import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ExaminationTable } from "@/components/examination/examination-table";
import {
  getExaminationsForTablePaginated,
  getEligibleStudentsForExam,
  getAllStudentsForExam,
  getExaminers,
} from "@/data/examinations";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds } from "@/data/users";

export default async function ExaminationPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.examinations;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  // Fetch data in parallel
  const [examinationsResult, eligibleStudents, allStudents, examiners, branches, courses] =
    await Promise.all([
      getExaminationsForTablePaginated(user.email, { offset: 0, limit: 10 }),
      getEligibleStudentsForExam(user.email),
      getAllStudentsForExam(user.email),
      getExaminers(user.email),
      getAllBranches(),
      getAllCourses(),
    ]);

  // Filter branches based on role
  const useCityName = permData!.role !== "super_admin";
  let filteredBranches = branches;
  if (useCityName) {
    const branchIds = await getUserBranchIds(user.email);
    if (branchIds && branchIds.length > 0) {
      if (permData!.role === "admin") {
        const companyIds = new Set<string>();
        for (const b of branches) {
          if (branchIds.includes(b.id)) {
            if (b.type === "company") companyIds.add(b.id);
            else if (b.parent_id) companyIds.add(b.parent_id);
          }
        }
        filteredBranches = branches.filter(
          (b) => b.type !== "company" && b.parent_id && companyIds.has(b.parent_id)
        );
      } else {
        filteredBranches = branches.filter((b) => branchIds.includes(b.id));
      }
    }
  }

  const branchOptions = filteredBranches.map((b) => ({
    id: b.id,
    name: useCityName ? (b.city || b.name) : b.name,
  }));

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: c.name,
    numberOfLevels: c.numberOfLevels,
  }));

  const examinerOptions = examiners.map((e) => ({
    id: e.id,
    name: e.name,
    photo: e.photo,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Examination"
          description="Track student exams, eligibility, and level progression"
          mascotImage="/banners/mascot.png"
        />

        <ExaminationTable
          initialData={examinationsResult.rows}
          totalCount={examinationsResult.totalCount}
          eligibleStudents={eligibleStudents}
          hideBranch={permData!.role === "branch_admin" || permData!.role === "instructor"}
          allStudents={allStudents}
          examiners={examinerOptions}
          branches={branchOptions}
          courses={courseOptions}
          canCreate={perms?.can_create}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
        />
      </div>
    </main>
  );
}
