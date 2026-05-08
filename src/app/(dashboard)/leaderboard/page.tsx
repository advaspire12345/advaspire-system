import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { LeaderboardTable, type CompanyTab } from "@/components/leaderboard/leaderboard-table";
import { getLeaderboardDataPaginated } from "@/data/leaderboard";
import { getTransferParticipants, getUserByAuthId } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { supabaseAdmin } from "@/db";

export default async function LeaderboardPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.leaderboard;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");

  const [leaderboardResult, participants, dbUser] = await Promise.all([
    getLeaderboardDataPaginated(user.email, { offset: 0, limit: 10 }),
    getTransferParticipants(user.email),
    getUserByAuthId(user.id),
  ]);

  // Show branch filter for company_admin, assistant_admin, instructor
  const showBranchFilter = permData!.role === "company_admin" || permData!.role === "assistant_admin" || permData!.role === "instructor";

  // Build per-company tabs for super_admin: one tab per non-deleted company,
  // with each tab carrying the IDs of its child hq/branch rows.
  let companyTabs: CompanyTab[] | undefined;
  if (permData!.role === "super_admin") {
    const { data: branchRows } = await supabaseAdmin
      .from("branches")
      .select("id, name, type, parent_id")
      .is("deleted_at", null);
    const companies = (branchRows ?? []).filter((b) => b.type === "company");
    companyTabs = companies
      .map((c) => ({
        id: c.id,
        name: c.name,
        branchIds: (branchRows ?? [])
          .filter((b) => (b.type === "hq" || b.type === "branch") && b.parent_id === c.id)
          .map((b) => b.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

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
          canTransfer={perms?.can_create}
          canAdjust={permData!.role === "super_admin" || permData!.role === "group_admin"}
          currentUserId={permData!.userId}
          currentUserName={dbUser?.name}
          currentUserBranchId={dbUser?.branch_id ?? null}
          showBranchFilter={showBranchFilter}
          companyTabs={companyTabs}
        />
      </div>
    </main>
  );
}
