"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types (matching the data layer types)
export interface ChartBranch {
  id: string;
  name: string;
  color: string;
}

export interface WeekData {
  attendance: number;
  trial: number;
}

export interface ChartData {
  [branchId: string]: {
    [monthIndex: number]: WeekData[];
  };
}

interface AttendanceChartProps {
  branches: ChartBranch[];
  attendanceData: ChartData;
  enrollmentData: ChartData;
}

// Constants
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CHART_HEIGHT = 260;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 25;

// Get weeks for a given month
function getWeeksInMonth(year: number, monthIndex: number): string[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const firstDayOfWeek = firstDay.getDay();
  const offsetToMonday = (firstDayOfWeek + 6) % 7;
  let currentStart = new Date(year, monthIndex, 1 - offsetToMonday);

  const weeks: string[] = [];
  let weekIndex = 1;

  while (currentStart <= lastDay && weeks.length < 5) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6);

    if (currentEnd >= firstDay) {
      weeks.push(`W${weekIndex}`);
      weekIndex++;
    }
    currentStart.setDate(currentStart.getDate() + 7);
  }

  return weeks.slice(0, 4);
}

// Month selector options (last 12 months)
function getMonthOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const options = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    });
  }

  return options;
}

export function AttendanceChart({
  branches,
  attendanceData,
  enrollmentData,
}: AttendanceChartProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [mode, setMode] = useState<"attendance" | "enrollment">("attendance");

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const weeks = useMemo(
    () => getWeeksInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  // Select the appropriate dataset based on mode
  const chartData = mode === "attendance" ? attendanceData : enrollmentData;

  // Calculate max value for Y axis
  const maxValue = useMemo(() => {
    let max = 0;
    weeks.forEach((_, weekIdx) => {
      branches.forEach((branch) => {
        const weekData = chartData[branch.id]?.[selectedMonth]?.[weekIdx];
        if (weekData) {
          const total = weekData.attendance + weekData.trial;
          if (total > max) max = total;
        }
      });
    });
    return Math.max(Math.ceil(max / 10) * 10, 20); // Minimum 20
  }, [weeks, branches, chartData, selectedMonth]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= maxValue; i += 10) {
      ticks.push(i);
    }
    return ticks;
  }, [maxValue]);

  const usableHeight = CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
  const scale = maxValue > 0 ? usableHeight / maxValue : 0;

  const selectedLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;
  const primaryLabel = mode === "attendance" ? "Attendance" : "Enrollment";
  const secondaryLabel = mode === "attendance" ? "Trial" : "Dropped";

  // Check if there's any data
  const hasData = branches.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Mode Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 text-base font-bold hover:bg-transparent"
              >
                {primaryLabel}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setMode("attendance")}>
                Attendance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("enrollment")}>
                Enrollment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Legend and Month Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Legend */}
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: branch.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {branch.name}
                </span>
              </div>
            ))}

            {/* Secondary Legend */}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-orange-500" />
              <span className="text-xs text-muted-foreground">
                {secondaryLabel}
              </span>
            </div>

            {/* Month Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 font-semibold"
                >
                  {selectedLabel}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-64 overflow-y-auto"
              >
                {monthOptions.map((opt) => (
                  <DropdownMenuItem
                    key={`${opt.year}-${opt.month}`}
                    onClick={() => {
                      setSelectedYear(opt.year);
                      setSelectedMonth(opt.month);
                    }}
                    className={cn(
                      opt.label === selectedLabel && "font-semibold bg-accent",
                    )}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No branch data available
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Y Axis */}
            <div
              className="relative w-7 shrink-0"
              style={{ height: CHART_HEIGHT }}
            >
              {yTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 text-xs text-muted-foreground"
                  style={{ bottom: BOTTOM_MARGIN + tick * scale - 6 }}
                >
                  {tick}
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="relative flex-1" style={{ height: CHART_HEIGHT }}>
              {/* Grid Lines */}
              {yTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-border"
                  style={{ bottom: BOTTOM_MARGIN + tick * scale }}
                />
              ))}

              {/* Bars */}
              <div
                className="absolute inset-x-0 flex items-end justify-around"
                style={{ bottom: BOTTOM_MARGIN, top: TOP_MARGIN }}
              >
                {weeks.map((week, weekIdx) => (
                  <div key={week} className="flex flex-col items-center">
                    <div className="flex items-end gap-1">
                      {branches.map((branch) => {
                        const weekData = chartData[branch.id]?.[
                          selectedMonth
                        ]?.[weekIdx] ?? {
                          attendance: 0,
                          trial: 0,
                        };
                        const attendanceHeight = weekData.attendance * scale;
                        const trialHeight = weekData.trial * scale;

                        return (
                          <div
                            key={branch.id}
                            className="group relative flex w-5 flex-col-reverse"
                            style={{
                              height: Math.max(
                                attendanceHeight + trialHeight,
                                1,
                              ),
                            }}
                          >
                            {/* Main Bar (Attendance/Enrollment) */}
                            <div
                              className="w-full transition-opacity hover:opacity-80"
                              style={{
                                height: attendanceHeight,
                                backgroundColor: branch.color,
                              }}
                              title={`${branch.name} ${primaryLabel}: ${weekData.attendance}`}
                            />
                            {/* Secondary Bar (Trial/Dropped) */}
                            <div
                              className="w-full bg-orange-500 transition-opacity hover:opacity-80"
                              style={{ height: trialHeight }}
                              title={`${branch.name} ${secondaryLabel}: ${weekData.trial}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <span className="absolute -bottom-5 text-xs text-muted-foreground">
                      {week}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
