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

async function getVouchers(): Promise<VoucherTableRow[]> {
  const { data, error } = await supabaseAdmin
    .from("vouchers")
    .select("id, code, discount_type, discount_value, expiry_type, expiry_months, expiry_date")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

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
  const perms = permData?.permissions.programs;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const vouchers = await getVouchers();

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
