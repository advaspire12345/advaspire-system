import { LandingHeader } from "@/components/landing/landing-header";
import { ProfileCover } from "@/components/landing/profile-cover";
import { ProfileHeader } from "@/components/landing/profile-header";
import { ProfileNavigation } from "@/components/landing/profile-navigation";
import { SocialNetworkCard } from "@/components/landing/social-network-card";
import { UserInfoCard } from "@/components/landing/user-info-card";
import { ProgramList } from "@/components/landing/program-list";
import { Leaderboard } from "@/components/landing/leaderboard";
import { PhotoContainer } from "@/components/landing/photo-container";
import { MarketplaceList } from "@/components/landing/marketplace-list";
import { VideoPlayer } from "@/components/landing/video-player";
import { ForumList } from "@/components/landing/forum-list";
import { TeamList } from "@/components/landing/team-list";
import { UpcomingEventsList } from "@/components/landing/upcoming-events-list";
import {
  mockProfile,
  mockPhotos,
  mockPrograms,
  mockEvents,
  mockMarketplace,
  mockForumTopics,
  mockTeamMembers,
} from "@/data/landing-mock";
import { getLeaderboardData } from "@/data/leaderboard";

export default async function Home() {
  // Fetch real leaderboard data from database
  const leaderboardData = await getLeaderboardData();

  // Map to landing page format (limit to top 10)
  const leaderboardEntries = leaderboardData.slice(0, 10).map((entry) => ({
    id: entry.id,
    rank: entry.rank,
    name: entry.studentName,
    programJoined: entry.program ?? "No Program",
    adcoin: entry.adcoin,
    avatarUrl: entry.photo ?? "/stat/01.jpg",
  }));
  return (
    <div className="min-h-screen bg-[#f8f8fb]">
      {/* Header */}
      <LandingHeader />

      {/* Cover + Profile Header Container */}
      <div className="mx-auto mt-3 max-w-[1184px] px-4 sm:mt-4 sm:px-4 md:px-0">
        <ProfileCover coverUrl={mockProfile.coverUrl} />
        <ProfileHeader profile={mockProfile} />
        <ProfileNavigation />
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-[1184px] px-4 sm:px-4 md:px-0">

        {/* Three Column Layout - stacks on mobile/tablet */}
        <div className="mt-3 flex flex-col gap-4 pb-8 sm:mt-4 sm:pb-12 lg:grid lg:grid-cols-12">
          {/* Main Feed - comes first on mobile/tablet (order-1), center on desktop */}
          <main className="order-1 space-y-4 lg:order-2 lg:col-span-6">
            <Leaderboard entries={leaderboardEntries} />
            <PhotoContainer photos={mockPhotos} totalCount={24} />
          </main>

          {/* Left Sidebar - comes second on mobile/tablet (order-2), left on desktop */}
          <aside className="order-2 space-y-4 lg:order-1 lg:col-span-3">
            <SocialNetworkCard />
            <UserInfoCard profile={mockProfile} />
            <ProgramList programs={mockPrograms} />
            <UpcomingEventsList events={mockEvents} />
          </aside>

          {/* Right Sidebar - comes third on mobile/tablet (order-3), right on desktop */}
          <aside className="order-3 space-y-4 lg:col-span-3">
            <MarketplaceList items={mockMarketplace} />
            <VideoPlayer videos={[
              "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
              "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
              "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80",
            ]} />
            <ForumList topics={mockForumTopics} />
            <TeamList members={mockTeamMembers} />
          </aside>
        </div>
      </div>
    </div>
  );
}
