import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPaymentRecordsForTable } from "@/data/payments";
import { PaymentRecordTable } from "@/components/payments/payment-record-table";
import { Banner } from "@/components/ui/banner";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PaymentRecordPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const startDate = params.startDate;
  const endDate = params.endDate;

  // Fetch payment records with optional date filters
  const payments = await getPaymentRecordsForTable(
    user.email ?? "",
    startDate,
    endDate
  );

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
          initialData={payments}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </div>
    </main>
  );
}
