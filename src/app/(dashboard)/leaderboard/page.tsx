import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { getLeaderboardDataPaginated } from "@/data/leaderboard";
import { getTransferParticipants } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";

export default async function LeaderboardPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.leaderboard;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const [leaderboardResult, participants] = await Promise.all([
    getLeaderboardDataPaginated(user.email, { offset: 0, limit: 10 }),
    getTransferParticipants(),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Leaderboard"
          description="View top students and transfer Adcoin"
          mascotImage="/banners/mascot.png"
        />

        <LeaderboardTable initialData={leaderboardResult.rows} totalCount={leaderboardResult.totalCount} participants={participants} hideBranch={permData!.role === "branch_admin" || permData!.role === "instructor"} canTransfer={permData?.permissions.transactions?.can_create} currentUserId={permData!.userId} />
      </div>
    </main>
  );
}
