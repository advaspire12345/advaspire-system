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
  mockLeaderboard,
  mockMarketplace,
  mockForumTopics,
  mockTeamMembers,
} from "@/data/landing-mock";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f8fb]">
      {/* Header */}
      <LandingHeader />

      {/* Cover + Profile Header Container */}
      <div className="mx-auto mt-4 max-w-[1184px]">
        <ProfileCover coverUrl={mockProfile.coverUrl} />
        <ProfileHeader profile={mockProfile} />
        <ProfileNavigation />
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-[1184px] px-0">

        {/* Three Column Layout */}
        <div className="mt-4 grid grid-cols-12 gap-4 pb-12">
          {/* Left Sidebar */}
          <aside className="col-span-3 space-y-4">
            <SocialNetworkCard />
            <UserInfoCard profile={mockProfile} />
            <ProgramList programs={mockPrograms} />
            <UpcomingEventsList events={mockEvents} />
          </aside>

          {/* Main Feed */}
          <main className="col-span-6">
            <Leaderboard entries={mockLeaderboard} />
            <PhotoContainer photos={mockPhotos} totalCount={24} />
          </main>

          {/* Right Sidebar */}
          <aside className="col-span-3 space-y-4">
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
