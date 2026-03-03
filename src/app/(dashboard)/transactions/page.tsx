import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { getTransactionsForDisplay } from "@/data/adcoins";
import { getTransferParticipants } from "@/data/users";

export default async function TransactionsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const [transactions, participants] = await Promise.all([
    getTransactionsForDisplay(),
    getTransferParticipants(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Transactions"
          description="View AdCoin transaction history"
          mascotImage="/banners/mascot.png"
        />

        <TransactionsTable initialData={transactions} participants={participants} />
      </div>
    </main>
  );
}
