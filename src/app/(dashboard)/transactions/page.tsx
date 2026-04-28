import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { getTransactionsForDisplayPaginated } from "@/data/adcoins";
import { getTransferParticipants, getUserByAuthId } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function TransactionsPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.transactions;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [transactionsResult, participants, dbUser] = await Promise.all([
    getTransactionsForDisplayPaginated(user.email, { offset: 0, limit: 10 }),
    getTransferParticipants(user.email),
    getUserByAuthId(user.id),
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

        <TransactionsTable
          initialData={transactionsResult.rows}
          totalCount={transactionsResult.totalCount}
          participants={participants}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          currentUserId={permData!.userId}
          currentUserName={dbUser?.name}
          currentUserBranchId={dbUser?.branch_id ?? null}
          filterByBranch={permData!.role !== "super_admin" && permData!.role !== "group_admin"}
          canAdjust={permData!.role === "super_admin" || permData!.role === "group_admin" || permData!.role === "company_admin"}
        />
      </div>
    </main>
  );
}
