import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { BranchTable } from "@/components/branches/branch-table";
import { getBranchData, getAdminOptions } from "@/data/branches";

export default async function BranchPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const [branchData, admins] = await Promise.all([
    getBranchData(),
    getAdminOptions(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Branches"
          description="View all branches"
          mascotImage="/banners/mascot.png"
        />

        <BranchTable initialData={branchData} admins={admins} />
      </div>
    </main>
  );
}
