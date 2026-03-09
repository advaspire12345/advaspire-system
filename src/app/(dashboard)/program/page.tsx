import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ProgramTable } from "@/components/program/program-table";
import { getProgramsForTable, getAllCategories, getInstructors } from "@/data/programs";
import { getAllBranches } from "@/data/branches";
import {
  createProgramAction,
  updateProgramAction,
  deleteProgramAction,
  createCategoryAction,
  getProgramByIdAction,
  uploadCoverImageAction,
} from "./actions";

export default async function ProgramsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  // Fetch all required data
  const [programs, branchesData, categoriesData, instructorsData] = await Promise.all([
    getProgramsForTable(user.email),
    getAllBranches(),
    getAllCategories(),
    getInstructors(),
  ]);

  const branches = branchesData.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const categories = categoriesData.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const instructors = instructorsData.map((i) => ({
    id: i.id,
    name: i.name,
    branch_id: i.branch_id,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Programs"
          description="Manage courses, curriculum, and pricing packages"
          mascotImage="/banners/mascot.png"
        />

        <ProgramTable
          initialData={programs}
          branches={branches}
          instructors={instructors}
          categories={categories}
          onAdd={createProgramAction}
          onEdit={updateProgramAction}
          onDelete={deleteProgramAction}
          onCreateCategory={createCategoryAction}
          onFetchProgram={getProgramByIdAction}
          onUploadCoverImage={uploadCoverImageAction}
        />
      </div>
    </main>
  );
}
