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
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds } from "@/data/users";
import { supabaseAdmin } from "@/db";

export default async function ProgramsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.programs;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  // Fetch all required data
  const [programs, branchesData, categoriesData, instructorsData, vouchersResult] = await Promise.all([
    getProgramsForTable(user.email),
    getAllBranches(),
    getAllCategories(),
    getInstructors(),
    supabaseAdmin.from("vouchers").select("id, code, discount_type, discount_value, expiry_type, expiry_date").is("deleted_at", null).order("code"),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const vouchers = (vouchersResult.data ?? [])
    .filter((v: any) => {
      // Exclude date-based vouchers that have expired
      if (v.expiry_type === "date" && v.expiry_date && v.expiry_date < today) return false;
      return true;
    })
    .map((v: any) => ({
      id: v.id,
      code: v.code,
      discount: v.discount_type === "percentage" ? `${v.discount_value}%` : `RM${v.discount_value}`,
    }));

  // Filter branches based on role
  const useCityName = permData!.role !== "super_admin";
  let filteredBranches = branchesData;
  if (useCityName) {
    const branchIds = await getUserBranchIds(user.email);
    if (branchIds && branchIds.length > 0) {
      if (permData!.role === "group_admin") {
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
        filteredBranches = branchesData.filter((b) => branchIds.includes(b.id));
      }
    }
  }

  const branches = filteredBranches.map((b) => ({
    id: b.id,
    name: useCityName ? (b.city || b.name) : b.name,
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
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          instructors={instructors}
          categories={categories}
          vouchers={vouchers}
          onAdd={perms?.can_create ? createProgramAction : undefined}
          onEdit={perms?.can_edit ? updateProgramAction : undefined}
          onDelete={perms?.can_delete ? deleteProgramAction : undefined}
          onCreateCategory={perms?.can_create ? createCategoryAction : undefined}
          onFetchProgram={getProgramByIdAction}
          onUploadCoverImage={perms?.can_edit ? uploadCoverImageAction : undefined}
        />
      </div>
    </main>
  );
}
