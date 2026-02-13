"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface BranchPool {
  id: string;
  name: string;
  color: string;
  adcoins: number;
  rmValue: number;
}

interface AdcoinPoolProps {
  branches: BranchPool[];
}

const MAIN_RADIUS = 60;
const MAIN_STROKE = 8;
const MAIN_CIRCUMFERENCE = 2 * Math.PI * MAIN_RADIUS;

const MINI_RADIUS = 32;
const MINI_STROKE = 6;
const MINI_CIRCUMFERENCE = 2 * Math.PI * MINI_RADIUS;

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return value.toString();
}

export function AdcoinPool({ branches }: AdcoinPoolProps) {
  const [pairIndex, setPairIndex] = useState(0);

  // Calculate total adcoins
  const total = useMemo(
    () => branches.reduce((sum, b) => sum + b.adcoins, 0),
    [branches],
  );

  // Calculate donut segments
  const segments = useMemo(() => {
    const result: { color: string; length: number; offset: number }[] = [];
    let currentOffset = 0;

    for (const branch of branches) {
      const percentage = total > 0 ? branch.adcoins / total : 0;
      const length = MAIN_CIRCUMFERENCE * percentage;
      result.push({ color: branch.color, length, offset: currentOffset });
      currentOffset -= length;
    }

    return result;
  }, [branches, total]);

  // Navigation
  const canNavigate = branches.length > 2;
  const leftBranch = branches[pairIndex];
  const rightBranch =
    branches[(pairIndex + 1) % branches.length] ?? leftBranch;

  function handlePrev() {
    if (!canNavigate) return;
    setPairIndex((prev) => (prev - 1 + branches.length) % branches.length);
  }

  function handleNext() {
    if (!canNavigate) return;
    setPairIndex((prev) => (prev + 1) % branches.length);
  }

  function getPercentage(branch: BranchPool): number {
    return total > 0 ? Math.round((branch.adcoins / total) * 100) : 0;
  }

  if (branches.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-bold">Adcoin Pool</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">No branch data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-bold">Adcoin Pool</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Main donut chart */}
        <div className="flex justify-center mb-4">
          <div className="relative h-40 w-40">
            <svg
              viewBox="0 0 140 140"
              className="h-full w-full -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={MAIN_RADIUS}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={MAIN_STROKE}
              />

              {/* Branch segments */}
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="70"
                  cy="70"
                  r={MAIN_RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={MAIN_STROKE}
                  strokeDasharray={`${seg.length} ${MAIN_CIRCUMFERENCE - seg.length}`}
                  strokeDashoffset={seg.offset}
                />
              ))}
            </svg>

            {/* Center total */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-muted-foreground">
                {formatCompact(total)}
              </span>
              <span className="text-sm font-semibold -mt-1 text-muted-foreground uppercase">
                Total Adcoins
              </span>
            </div>
          </div>
        </div>

        {/* Branch labels with navigation */}
        <div className="mt-auto mb-4 flex items-stretch gap-4">
          {/* Prev button */}
          <div className="flex items-center">
            {canNavigate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Left branch label */}
          <div className="flex flex-1 flex-col items-center text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: leftBranch.color }}
              />
            </div>
            <span className="mt-1 text-2xl font-black text-muted-foreground">
              {leftBranch.adcoins.toLocaleString()}
            </span>
            <span className="font-semibold text-muted-foreground">
              {leftBranch.name}
            </span>
            <span className="text-xs font-bold">
              (RM {leftBranch.rmValue.toFixed(2)})
            </span>
          </div>

          {/* Divider */}
          <Separator orientation="vertical" className="h-16 self-center" />

          {/* Right branch label */}
          <div className="flex flex-1 flex-col items-center text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: rightBranch.color }}
              />
            </div>
            <span className="mt-1 text-2xl font-black text-muted-foreground">
              {rightBranch.adcoins.toLocaleString()}
            </span>
            <span className="font-semibold text-muted-foreground">
              {rightBranch.name}
            </span>
            <span className="text-xs font-bold">
              (RM {rightBranch.rmValue.toFixed(2)})
            </span>
          </div>

          {/* Next button */}
          <div className="flex items-center">
            {canNavigate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mini donut charts */}
        <div className="mt-2 flex items-stretch gap-4">
          {[leftBranch, rightBranch].map((branch, idx) => {
            const pct = getPercentage(branch);
            const length = MINI_CIRCUMFERENCE * (pct / 100);

            return (
              <div key={branch.id} className="flex flex-1 items-center">
                {/* Mini donut */}
                <div
                  className={`flex flex-1 flex-col items-center justify-center ${
                    idx === 0 ? "translate-x-3" : "-translate-x-3"
                  }`}
                >
                  <div className="relative h-20 w-20 mb-1 flex items-center justify-center">
                    <svg
                      viewBox="0 0 80 80"
                      className="h-full w-full -rotate-90"
                    >
                      <circle
                        cx="40"
                        cy="40"
                        r={MINI_RADIUS}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={MINI_STROKE}
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={MINI_RADIUS}
                        fill="none"
                        stroke={branch.color}
                        strokeWidth={MINI_STROKE}
                        strokeDasharray={`${length} ${MINI_CIRCUMFERENCE - length}`}
                        strokeDashoffset={0}
                      />
                    </svg>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{pct}%</span>
                    </div>
                  </div>
                </div>

                {/* Divider between mini donuts */}
                {idx === 0 && (
                  <Separator orientation="vertical" className="h-10" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
