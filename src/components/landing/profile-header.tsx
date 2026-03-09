"use client";

import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import type { Profile } from "@/data/landing-mock";

interface ProfileHeaderProps {
  profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="relative z-10 -mt-[60px] rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)] sm:-mt-[80px] md:-mt-[100px]">
      {/* Top section with avatar and info */}
      <div className="flex flex-col items-center px-4 pb-5 pt-0 sm:px-5 md:flex-row md:items-end md:justify-between md:px-7 md:pb-7">
        {/* Left side: Avatar and Name */}
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-end md:gap-5">
          {/* Avatar - responsive sizes */}
          <div className="relative z-20 -mt-[40px] sm:-mt-[50px] md:-mt-[60px]">
            {/* Mobile avatar */}
            <div className="sm:hidden">
              <HexagonAvatar
                size={100}
                imageUrl={profile.avatarUrl}
                percentage={profile.levelProgress}
                animated={true}
                fallbackInitials={profile.name.charAt(0)}
                cornerRadius={16}
              />
            </div>
            {/* Tablet avatar */}
            <div className="hidden sm:block md:hidden">
              <HexagonAvatar
                size={120}
                imageUrl={profile.avatarUrl}
                percentage={profile.levelProgress}
                animated={true}
                fallbackInitials={profile.name.charAt(0)}
                cornerRadius={18}
              />
            </div>
            {/* Desktop avatar */}
            <div className="hidden md:block">
              <HexagonAvatar
                size={154}
                imageUrl={profile.avatarUrl}
                percentage={profile.levelProgress}
                animated={true}
                fallbackInitials={profile.name.charAt(0)}
                cornerRadius={20}
              />
            </div>
          </div>

          {/* Name */}
          <div className="pb-0 text-center md:pb-2 md:text-left">
            <h1 className="text-base font-bold text-[#3e3f5e] sm:text-lg">{profile.name}</h1>
            <p className="text-xs font-medium text-[#8f91ac]">
              www.gamehuntress.com
            </p>
          </div>
        </div>

        {/* Right side: Stats */}
        <div className="mt-4 flex items-center gap-6 pb-0 sm:gap-8 md:mt-0 md:gap-12 md:pb-2">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-[#3e3f5e] sm:text-xl md:text-[22px]">
              {profile.stats.posts}
            </span>
            <span className="text-[10px] font-semibold uppercase text-[#adafca] sm:text-xs">
              posts
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-[#3e3f5e] sm:text-xl md:text-[22px]">
              {profile.stats.following}
            </span>
            <span className="text-[10px] font-semibold uppercase text-[#adafca] sm:text-xs">
              friends
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-[#3e3f5e] sm:text-xl md:text-[22px]">5.7K</span>
            <span className="text-[10px] font-semibold uppercase text-[#adafca] sm:text-xs">
              visits
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
