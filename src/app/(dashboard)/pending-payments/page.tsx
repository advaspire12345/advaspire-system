import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPendingPaymentsForTablePaginated } from "@/data/payments";
import { getStudentsForPayment } from "@/data/students";
import { getCoursesAndPackages } from "@/data/courses";
import { PendingPaymentTable } from "@/components/payments/pending-payment-table";
import { Banner } from "@/components/ui/banner";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { supabaseAdmin } from "@/db";

// Force dynamic rendering to always get fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PendingPaymentsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.pending_payments;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  // Fetch data in parallel
  const [paymentsResult, students, { courses, packages }, vouchersResult] = await Promise.all([
    getPendingPaymentsForTablePaginated(user.email ?? "", { offset: 0, limit: 10 }),
    getStudentsForPayment(user.email ?? ""),
    getCoursesAndPackages(),
    supabaseAdmin.from("vouchers").select("id, code, discount_type, discount_value, expiry_type, expiry_date").is("deleted_at", null).order("code"),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const voucherOptions = (vouchersResult.data ?? [])
    .filter((v: any) => {
      if (v.expiry_type === "date" && v.expiry_date && v.expiry_date < today) return false;
      return true;
    })
    .map((v: any) => ({
      id: v.id,
      code: v.code,
      discount: v.discount_type === "percentage" ? `${v.discount_value}%` : `RM${v.discount_value}`,
    }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Pending Payments"
          description="Manage and approve pending payment records"
          mascotImage="/banners/mascot.png"
        />

        <PendingPaymentTable
          initialData={paymentsResult.rows}
          totalCount={paymentsResult.totalCount}
          students={students}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          courses={courses}
          packages={packages}
          vouchers={voucherOptions}
          canCreate={perms?.can_create}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
        />
      </div>
    </main>
  );
}
