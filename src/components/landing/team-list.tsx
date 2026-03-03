"use client";

import Link from "next/link";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import type { TeamMember } from "@/data/landing-mock";

interface TeamListProps {
  members: TeamMember[];
}

export function TeamList({ members }: TeamListProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Team
        </h4>
        <span className="text-xs font-bold text-[#adafca]">{members.length}</span>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <div className="space-y-4">
          {members.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
        </div>

        {/* View All Button */}
        <Link
          href="/team"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-[#615dfa] text-xs font-bold text-white transition-colors hover:bg-[#5652e0]"
        >
          View All Team
        </Link>
      </div>
    </div>
  );
}

interface TeamMemberRowProps {
  member: TeamMember;
}

function TeamMemberRow({ member }: TeamMemberRowProps) {
  return (
    <div className="flex items-center gap-4">
      <HexagonAvatar
        size={50}
        imageUrl={member.avatarUrl}
        fallbackInitials={member.name.charAt(0)}
        cornerRadius={6}
      />
      <div className="flex-1">
        <h5 className="text-sm font-bold text-[#3e3f5e]">{member.name}</h5>
        <p className="text-xs text-[#adafca]">{member.role}</p>
      </div>
    </div>
  );
}
