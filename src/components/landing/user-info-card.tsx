import { MapPin, Briefcase, Calendar, Globe } from "lucide-react";
import type { Profile } from "@/data/landing-mock";

interface UserInfoCardProps {
  profile: Profile;
}

export function UserInfoCard({ profile }: UserInfoCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          About
        </h4>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <p className="text-sm leading-6 text-[#8f91ac]">{profile.bio}</p>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-5">
            <Briefcase className="size-5 text-[#adafca]" />
            <span className="text-sm font-medium text-[#3e3f5e]">
              Cosplayer and Artist
            </span>
          </div>
          <div className="flex items-center gap-5">
            <MapPin className="size-5 text-[#adafca]" />
            <span className="text-sm font-medium text-[#3e3f5e]">
              {profile.location}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Calendar className="size-5 text-[#adafca]" />
            <span className="text-sm font-medium text-[#3e3f5e]">
              Joined {profile.joinedDate}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Globe className="size-5 text-[#adafca]" />
            <a
              href={`https://${profile.website}`}
              className="text-sm font-medium text-[#615dfa]"
            >
              www.gamehuntress.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
