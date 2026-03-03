"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Coins } from "lucide-react";
import type { LeaderboardEntry } from "@/data/landing-mock";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Leaderboard
        </h4>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 border-b border-[#eaeaf5] px-7 py-4">
        <div className="col-span-1 text-xs font-bold uppercase text-[#adafca]">
          Rank
        </div>
        <div className="col-span-4 text-xs font-bold uppercase text-[#adafca]">
          Name
        </div>
        <div className="col-span-4 text-xs font-bold uppercase text-[#adafca]">
          Program
        </div>
        <div className="col-span-3 text-right text-xs font-bold uppercase text-[#adafca]">
          Adcoin
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-[#eaeaf5]">
        {entries.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-[#ffd700] text-white"; // Gold
      case 2:
        return "bg-[#c0c0c0] text-white"; // Silver
      case 3:
        return "bg-[#cd7f32] text-white"; // Bronze
      default:
        return "bg-[#eaeaf5] text-[#3e3f5e]";
    }
  };

  return (
    <div className="grid grid-cols-12 items-center gap-4 px-7 py-4 transition-colors hover:bg-[#f8f8fb]">
      {/* Rank */}
      <div className="col-span-1">
        <span
          className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${getRankStyle(entry.rank)}`}
        >
          {entry.rank}
        </span>
      </div>

      {/* Name with Avatar */}
      <div className="col-span-4 flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={entry.avatarUrl} alt={entry.name} />
          <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-bold text-[#3e3f5e]">{entry.name}</span>
      </div>

      {/* Program Joined */}
      <div className="col-span-4">
        <span className="text-sm text-[#8f91ac]">{entry.programJoined}</span>
      </div>

      {/* Adcoin */}
      <div className="col-span-3 flex items-center justify-end gap-2">
        <Coins className="size-4 text-[#ffd700]" />
        <span className="text-sm font-bold text-[#3e3f5e]">
          {entry.adcoin.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
