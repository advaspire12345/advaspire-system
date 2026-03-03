"use client";

import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import type { Profile } from "@/data/landing-mock";

interface ProfileHeaderProps {
  profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="relative z-10 -mt-[100px] rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Top section with avatar and info */}
      <div className="flex items-end justify-between px-7 pb-7 pt-0">
        {/* Left side: Avatar and Name */}
        <div className="flex items-end gap-5">
          {/* Avatar */}
          <div className="relative z-20 -mt-[60px]">
            <HexagonAvatar
              size={154}
              imageUrl={profile.avatarUrl}
              percentage={profile.levelProgress}
              animated={true}
              fallbackInitials={profile.name.charAt(0)}
              cornerRadius={20}
            />
          </div>

          {/* Name */}
          <div className="pb-2">
            <h1 className="text-lg font-bold text-[#3e3f5e]">{profile.name}</h1>
            <p className="text-xs font-medium text-[#8f91ac]">
              www.gamehuntress.com
            </p>
          </div>
        </div>

        {/* Right side: Stats */}
        <div className="flex items-center gap-12 pb-2">
          <div className="flex flex-col items-center">
            <span className="text-[22px] font-bold text-[#3e3f5e]">
              {profile.stats.posts}
            </span>
            <span className="text-xs font-semibold uppercase text-[#adafca]">
              posts
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[22px] font-bold text-[#3e3f5e]">
              {profile.stats.following}
            </span>
            <span className="text-xs font-semibold uppercase text-[#adafca]">
              friends
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[22px] font-bold text-[#3e3f5e]">5.7K</span>
            <span className="text-xs font-semibold uppercase text-[#adafca]">
              visits
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
