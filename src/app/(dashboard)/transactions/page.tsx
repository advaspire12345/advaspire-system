import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { getTransactionsForDisplayPaginated } from "@/data/adcoins";
import { getTransferParticipants } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function TransactionsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.transactions;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [transactionsResult, participants] = await Promise.all([
    getTransactionsForDisplayPaginated(user.email, { offset: 0, limit: 10 }),
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

        <TransactionsTable initialData={transactionsResult.rows} totalCount={transactionsResult.totalCount} participants={participants} hideBranch={permData!.role === "branch_admin" || permData!.role === "instructor"} currentUserId={permData!.userId} />
      </div>
    </main>
  );
}
