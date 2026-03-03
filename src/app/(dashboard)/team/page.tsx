import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TeamTable } from "@/components/team/team-table";
import { getTeamMembersForTable } from "@/data/team";
import { getAllBranches } from "@/data/branches";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
} from "./actions";

export default async function TeamPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const [teamMembers, branchesData] = await Promise.all([
    getTeamMembersForTable(user.email),
    getAllBranches(),
  ]);

  const branches = branchesData.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Team"
          description="Manage team members, roles, and employment information"
          mascotImage="/banners/mascot.png"
        />

        <TeamTable
          initialData={teamMembers}
          branches={branches}
          onAdd={createTeamMemberAction}
          onEdit={updateTeamMemberAction}
          onDelete={deleteTeamMemberAction}
        />
      </div>
    </main>
  );
}
