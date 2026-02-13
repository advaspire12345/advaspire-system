import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPendingPaymentsForTable } from "@/data/payments";
import { getStudentsForPayment } from "@/data/students";
import { getCoursesAndPackages } from "@/data/courses";
import { PendingPaymentTable } from "@/components/payments/pending-payment-table";
import { Banner } from "@/components/ui/banner";

export default async function PendingPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch data in parallel
  const [payments, students, { courses, packages }] = await Promise.all([
    getPendingPaymentsForTable(user.email ?? ""),
    getStudentsForPayment(user.email ?? ""),
    getCoursesAndPackages(),
  ]);

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
          initialData={payments}
          students={students}
          courses={courses}
          packages={packages}
        />
      </div>
    </main>
  );
}
