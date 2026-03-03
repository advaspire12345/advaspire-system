"use client";

import Link from "next/link";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import type { Program } from "@/data/landing-mock";

interface ProgramListProps {
  programs: Program[];
}

export function ProgramList({ programs }: ProgramListProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Programs
        </h4>
        <span className="text-xs font-bold text-[#adafca]">
          {programs.length}
        </span>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <div className="space-y-4">
          {programs.map((program) => (
            <ProgramItem key={program.id} program={program} />
          ))}
        </div>

        {/* View All Button */}
        <Link
          href="/program"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#615dfa] text-sm font-bold text-white transition-colors hover:bg-[#5652e0]"
        >
          View All Programs
        </Link>
      </div>
    </div>
  );
}

interface ProgramItemProps {
  program: Program;
}

function ProgramItem({ program }: ProgramItemProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Hexagon Avatar */}
      <HexagonAvatar
        size={50}
        imageUrl={program.imageUrl}
        fallbackInitials={program.name.charAt(0)}
        cornerRadius={6}
      />

      {/* Program Info */}
      <div className="flex-1">
        <h5 className="text-sm font-bold text-[#3e3f5e]">{program.name}</h5>
        <p className="text-xs font-medium text-[#adafca]">
          ${program.price.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
