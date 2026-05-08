import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { getCurrentUserPermissions, getFirstViewablePath, resolveCompanyId } from "@/data/permissions";
import { getTopupRequestsForTable } from "@/data/marketplace";
import { supabaseAdmin } from "@/db";
import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import { MarketplaceTable } from "@/components/marketplace/marketplace-table";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.marketplace;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const role = permData!.role;

  // company_admin sees the card view
  if (role === "company_admin") {
    return (
      <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
        <div className="space-y-2">
          <Banner
            backgroundImage="/banners/dashboard-bg.png"
            title="Marketplace"
            description="Top up your adcoin balance to reward students"
            mascotImage="/banners/mascot.png"
          />
          <div className="pt-6">
            <MarketplaceCard />
          </div>
        </div>
      </main>
    );
  }

  // super_admin / group_admin (and any other authorised role) see the table
  // Scope: super_admin sees everything; group_admin scoped to their own company.
  let scope: "all" | "company" = "all";
  let companyId: string | null = null;
  if (role !== "super_admin") {
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("branch_id")
      .eq("id", permData!.userId)
      .single();
    companyId = await resolveCompanyId(dbUser?.branch_id ?? null);
    scope = "company";
  }

  // group_admin (and any non-super-admin) sees the branch CITY/AREA in the
  // Branch Request column; super_admin sees the branch NAME.
  const useCityName = role !== "super_admin";
  const requests = await getTopupRequestsForTable({ scope, companyId, useCityName });

  // Approver name for the approve modal (super_admin only)
  let approverName = "Super Admin";
  if (role === "super_admin") {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", permData!.userId)
      .single();
    if (me?.name) approverName = me.name;
  }

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Marketplace"
          description={
            role === "super_admin"
              ? "Review and approve adcoin top-up requests"
              : "View adcoin top-up requests across your company"
          }
          mascotImage="/banners/mascot.png"
        />
        <div className="pt-6">
          <MarketplaceTable
            initialData={requests}
            showActions={role === "super_admin"}
            approverName={approverName}
          />
        </div>
      </div>
    </main>
  );
}
