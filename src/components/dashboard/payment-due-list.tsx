"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface PaymentDueItem {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl: string | null;
  rank: number;
  sessionsLeft: number;
  branchId: string;
  branchName: string;
}

interface PaymentDueListProps {
  items: PaymentDueItem[];
  branches: { id: string; name: string }[];
}

const VISIBLE_COUNT = 6;

export function PaymentDueList({ items, branches }: PaymentDueListProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter items by selected branch
  const filteredItems =
    selectedBranchId === null
      ? items
      : items.filter((item) => item.branchId === selectedBranchId);

  // Calculate navigation bounds
  const maxIndex = Math.max(filteredItems.length - VISIBLE_COUNT, 0);
  const showNavigation = filteredItems.length > VISIBLE_COUNT;
  const visibleItems = filteredItems.slice(
    currentIndex,
    currentIndex + VISIBLE_COUNT,
  );

  // Get current filter label
  const filterLabel =
    selectedBranchId === null
      ? "All Branches"
      : (branches.find((b) => b.id === selectedBranchId)?.name ??
        "All Branches");

  // Handle branch filter change
  function handleBranchChange(branchId: string | null) {
    setSelectedBranchId(branchId);
    setCurrentIndex(0);
  }

  // Format sessions display
  function formatSessions(value: number): string {
    if (value === 0) return "0";
    if (value < 0) return `${value}`;
    return `+${value}`;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold">Payment Due List</CardTitle>

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
                onClick={() => handleBranchChange(null)}
                className={cn(
                  selectedBranchId === null && "font-semibold bg-accent",
                )}
              >
                All Branches
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onClick={() => handleBranchChange(branch.id)}
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

      <CardContent>
        <div className="flex items-center gap-3">
          {/* Previous button */}
          {showNavigation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="h-8 w-8 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Left separator */}
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-8 bg-black/10"
          />

          {/* Items container */}
          <div className="flex flex-1 items-center overflow-hidden">
            {visibleItems.length === 0 ? (
              <div className="flex-1 text-center text-sm text-muted-foreground">
                No payment due for this branch.
              </div>
            ) : (
              visibleItems.map((item, idx) => (
                <div key={item.id} className="flex items-center w-full">
                  <div className="flex flex-1 flex-col items-center px-2">
                    {/* Avatar with badge */}
                    <div className="relative mb-1">
                      <HexagonAvatar
                        size={78}
                        imageUrl={item.avatarUrl ?? undefined}
                        percentage={0.5}
                        animated={false}
                        fallbackInitials={item.studentName.charAt(0)}
                      />
                      <div className="absolute bottom-1 right-1 z-10">
                        <HexagonNumberBadge value={item.rank} size={28} />
                      </div>
                    </div>

                    {/* Sessions count */}
                    <span className="flex items-baseline gap-0.5 font-black text-destructive">
                      <span className="text-2xl">
                        {formatSessions(item.sessionsLeft)}
                      </span>
                      <span className="text-[9px] tracking-[0.08em]">SESS</span>
                    </span>

                    {/* Student name */}
                    <span className="w-full truncate text-center text-[11px] font-bold uppercase text-muted-foreground">
                      {item.studentName}
                    </span>
                  </div>

                  {/* Separator between items */}
                  {idx < visibleItems.length - 1 && (
                    <Separator
                      orientation="vertical"
                      className="mx-2 data-[orientation=vertical]:h-8 bg-black/10"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Right separator */}
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-8 bg-black/10"
          />

          {/* Next button */}
          {showNavigation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))
              }
              disabled={currentIndex >= maxIndex}
              className="h-8 w-8 shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
