import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { getLeaderboardData } from "@/data/leaderboard";
import { getTransferParticipants } from "@/data/users";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const [leaderboardData, participants] = await Promise.all([
    getLeaderboardData(),
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

        <LeaderboardTable initialData={leaderboardData} participants={participants} />
      </div>
    </main>
  );
}
