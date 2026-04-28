import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { getLeaderboardDataPaginated } from "@/data/leaderboard";
import { getTransferParticipants, getUserByAuthId } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function LeaderboardPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.leaderboard;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [leaderboardResult, participants, dbUser] = await Promise.all([
    getLeaderboardDataPaginated(user.email, { offset: 0, limit: 10 }),
    getTransferParticipants(user.email),
    getUserByAuthId(user.id),
  ]);

  // Show branch filter for company_admin, assistant_admin, instructor
  const showBranchFilter = permData!.role === "company_admin" || permData!.role === "assistant_admin" || permData!.role === "instructor";

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Leaderboard"
          description="View top students and transfer Adcoin"
          mascotImage="/banners/mascot.png"
        />

        <LeaderboardTable
          initialData={leaderboardResult.rows}
          totalCount={leaderboardResult.totalCount}
          participants={participants}
          hideBranch={permData!.role === "company_admin" || permData!.role === "instructor"}
          canTransfer={permData?.permissions.transactions?.can_create}
          currentUserId={permData!.userId}
          currentUserName={dbUser?.name}
          currentUserBranchId={dbUser?.branch_id ?? null}
          showBranchFilter={showBranchFilter}
        />
      </div>
    </main>
  );
}
