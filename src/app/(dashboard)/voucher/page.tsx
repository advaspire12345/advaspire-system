import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { VoucherTable } from "@/components/voucher/voucher-table";
import { supabaseAdmin } from "@/db";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export const dynamic = "force-dynamic";

export interface VoucherTableRow {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiryType: "monthly" | "date";
  expiryMonths: number | null;
  expiryDate: string | null;
}

async function getVouchers(userEmail: string): Promise<VoucherTableRow[]> {
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("@/data/users");

  // Resolve current user's company id (NULL = super_admin, sees all).
  let companyId: string | null = null;
  if (!isSuperAdmin(userEmail)) {
    const u = await getUserByEmail(userEmail);
    if (u?.branch_id) {
      const { data: b } = await supabaseAdmin
        .from("branches")
        .select("id, type, parent_id")
        .eq("id", u.branch_id)
        .maybeSingle();
      if (b) companyId = b.type === "company" ? b.id : b.parent_id;
    }
    // If the user is restricted but we couldn't resolve a company, they see
    // nothing (avoids leaking other companies' vouchers).
    if (!companyId) {
      const branchIds = await getUserBranchIds(userEmail);
      if (branchIds === null) {
        // resolved to super_admin via the role check inside getUserBranchIds
      } else {
        return [];
      }
    }
  }

  let query = supabaseAdmin
    .from("vouchers")
    .select("id, code, discount_type, discount_value, expiry_type, expiry_months, expiry_date")
    .is("deleted_at", null);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vouchers:", error);
    return [];
  }

  return (data ?? []).map((v: any) => ({
    id: v.id,
    code: v.code,
    discountType: v.discount_type,
    discountValue: v.discount_value,
    expiryType: v.expiry_type,
    expiryMonths: v.expiry_months,
    expiryDate: v.expiry_date,
  }));
}

export default async function VoucherPage() {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.vouchers;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const vouchers = await getVouchers(user.email);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Voucher"
          description="Create and manage discount vouchers"
          mascotImage="/banners/mascot.png"
        />

        <VoucherTable
          data={vouchers}
          canAdd={perms?.can_create}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
        />
      </div>
    </main>
  );
}
