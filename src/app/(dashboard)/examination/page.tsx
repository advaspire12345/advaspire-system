import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ExaminationTable } from "@/components/examination/examination-table";
import {
  getExaminationsForTable,
  getEligibleStudentsForExam,
  getExaminers,
} from "@/data/examinations";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";
import {
  createExaminationAction,
  updateExaminationAction,
  deleteExaminationAction,
} from "./actions";

export default async function ExaminationPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  // Fetch data in parallel
  const [examinations, eligibleStudents, examiners, branches, courses] =
    await Promise.all([
      getExaminationsForTable(user.email),
      getEligibleStudentsForExam(user.email),
      getExaminers(user.email),
      getAllBranches(),
      getAllCourses(),
    ]);

  const branchOptions = branches.map((b) => ({
    id: b.id,
    name: b.name,
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
          initialData={examinations}
          eligibleStudents={eligibleStudents}
          examiners={examinerOptions}
          branches={branchOptions}
          courses={courseOptions}
          onAdd={createExaminationAction}
          onEdit={updateExaminationAction}
          onDelete={deleteExaminationAction}
        />
      </div>
    </main>
  );
}
