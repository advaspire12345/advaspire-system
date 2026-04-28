import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPaymentRecordsForTablePaginated } from "@/data/payments";
import { getCoursesAndPackages } from "@/data/courses";
import { PaymentRecordTable } from "@/components/payments/payment-record-table";
import { Banner } from "@/components/ui/banner";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PaymentRecordPage({ searchParams }: PageProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.payment_record;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const params = await searchParams;
  const startDate = params.startDate;
  const endDate = params.endDate;

  // Fetch data in parallel
  const [paymentsResult, { courses, packages }] = await Promise.all([
    getPaymentRecordsForTablePaginated(user.email ?? "", startDate, endDate, { offset: 0, limit: 10 }),
    getCoursesAndPackages(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Payment Record"
          description="View and manage completed payment records"
          mascotImage="/banners/mascot.png"
        />

        <PaymentRecordTable
          initialData={paymentsResult.rows}
          totalCount={paymentsResult.totalCount}
          initialStartDate={startDate}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          initialEndDate={endDate}
          courses={courses}
          packages={packages}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
        />
      </div>
    </main>
  );
}
