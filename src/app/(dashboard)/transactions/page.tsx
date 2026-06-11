import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
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
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const [transactionsResult, participants, dbUser] = await Promise.all([
    getTransactionsForDisplayPaginated(user.email, { offset: 0, limit: 10 }),
    getTransferParticipants(user.email),
    getUserByAuthId(user.id),
  ]);

  const isAdmin = ["super_admin", "group_admin", "company_admin", "assistant_admin"].includes(permData!.role);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Transactions"
          description="View AdCoin transaction history"
          mascotImage="/banners/mascot.png"
        />

        {isAdmin && (
          <div className="flex justify-end">
            <Link
              href="/transfers"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Session Transfers
            </Link>
          </div>
        )}

        <TransactionsTable
          initialData={transactionsResult.rows}
          totalCount={transactionsResult.totalCount}
          participants={participants}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          currentUserId={permData!.userId}
          currentUserName={dbUser?.name}
          currentUserBranchId={dbUser?.branch_id ?? null}
          filterByBranch={permData!.role !== "super_admin" && permData!.role !== "group_admin"}
          canAdjust={permData!.role === "super_admin" || permData!.role === "group_admin"}
        />
      </div>
    </main>
  );
}
