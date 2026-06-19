"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgressLessonRow } from "@/data/student-progress";
import { ProgressGroups } from "@/components/student-progress/progress-groups";

interface SlotOption {
  value: string;
  label: string;
  course: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface ProgressDateTableProps {
  rows: ProgressLessonRow[];
  slotOptions: SlotOption[];
  date: string;
  slot: string;
  canEdit: boolean;
  toolbarLeft?: React.ReactNode;
}

export function ProgressDateTable({
  rows,
  slotOptions,
  date,
  slot,
  canEdit,
  toolbarLeft,
}: ProgressDateTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ── URL-driven filters ──
  const pushFilters = (nextDate: string, nextSlot: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextDate) params.set("date", nextDate);
    else params.delete("date");
    if (nextSlot) params.set("slot", nextSlot);
    else params.delete("slot");
    startTransition(() => {
      router.replace(`/student-progress?${params.toString()}`);
    });
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardContent className="space-y-4 p-0">
        {/* Filter bar */}
        <div className="flex flex-col gap-4 rounded-lg bg-white p-6 sm:flex-row sm:items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => pushFilters(e.target.value, slot)}
            className="h-[50px] rounded-lg border border-muted-foreground/30 bg-white px-4 text-sm font-semibold"
            aria-label="Filter by date"
          />
          <select
            value={slot}
            onChange={(e) => pushFilters(date, e.target.value)}
            className={cn(
              "h-[50px] rounded-lg border border-muted-foreground/30 bg-white px-4 text-sm",
              slot && "font-semibold",
            )}
            aria-label="Filter by slot"
          >
            <option value="">All slots</option>
            {slotOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <ProgressGroups
          rows={rows}
          canEdit={canEdit}
          emptyMessage="No attendance recorded for this date/slot."
          toolbarLeft={toolbarLeft}
        />
      </CardContent>
    </Card>
  );
}
