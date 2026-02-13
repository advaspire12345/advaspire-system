"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";

export interface RankingItem {
  id: string;
  name: string;
  adcoins: number;
  avatarUrl?: string;
  rank: number;
  branchId: string;
  branchName: string;
}

interface AdcoinRankingProps {
  rankings: RankingItem[];
  branches: { id: string; name: string }[];
}

export function AdcoinRanking({ rankings, branches }: AdcoinRankingProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const filteredRankings =
    selectedBranchId === null
      ? rankings
      : rankings.filter((item) => item.branchId === selectedBranchId);

  const filterLabel =
    selectedBranchId === null
      ? "All Branches"
      : (branches.find((b) => b.id === selectedBranchId)?.name ??
        "All Branches");

  return (
    <Card className="h-[360px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold">Adcoin Ranking</CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs font-semibold"
              >
                {filterLabel}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelectedBranchId(null)}
                className={cn(
                  selectedBranchId === null && "font-semibold bg-accent",
                )}
              >
                All Branches
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={cn(
                    selectedBranchId === branch.id && "font-semibold bg-accent",
                  )}
                >
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {filteredRankings.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No students found for this branch.
          </div>
        ) : (
          <div>
            {filteredRankings.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <div className="relative shrink-0">
                  <HexagonAvatar
                    size={60}
                    imageUrl={item.avatarUrl}
                    percentage={0.5}
                    animated={false}
                    fallbackInitials={item.name.charAt(0)}
                  />
                  <div className="absolute bottom-1 right-1 z-10">
                    <HexagonNumberBadge value={item.rank} size={24} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground -mt-0.5">
                    {item.branchName}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">
                    {item.adcoins.toLocaleString()} Adcoins
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
