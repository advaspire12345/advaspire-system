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

// Types
export interface OverviewBranch {
  id: string;
  name: string;
  color: string;
}

export interface MonthlyOverviewData {
  [branchId: string]: number[]; // 60 months of data (5 years)
}

interface OverviewChartProps {
  branches: OverviewBranch[];
  attendanceData: MonthlyOverviewData;
  engagementData: MonthlyOverviewData;
}

// Constants
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CHART_HEIGHT = 260;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 25;
const PADDING_X = 20;

type Mode = "attendance" | "enrollment";
type RangeKey =
  | "last3"
  | "last6"
  | "last9"
  | "last12"
  | "thisYear"
  | "lastYear"
  | "fiveYears";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "last3", label: "Last 3 months" },
  { key: "last6", label: "Last 6 months" },
  { key: "last9", label: "Last 9 months" },
  { key: "last12", label: "Last 12 months" },
  { key: "thisYear", label: "This year" },
  { key: "lastYear", label: "Last year" },
  { key: "fiveYears", label: "5 years" },
];

interface MonthLabel {
  label: string;
  year: number;
}

function getMonthLabels(): MonthLabel[] {
  const now = new Date();
  const labels: MonthLabel[] = [];

  // Generate 60 months (5 years) of labels
  for (let i = 59; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearShort = date.getFullYear().toString().slice(-2);
    labels.push({
      label: `${MONTHS[date.getMonth()]} ${yearShort}`,
      year: date.getFullYear(),
    });
  }

  return labels;
}

export function OverviewChart({
  branches,
  attendanceData,
  engagementData,
}: OverviewChartProps) {
  const [mode, setMode] = useState<Mode>("attendance");
  const [range, setRange] = useState<RangeKey>("last12");
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: "" });

  const now = new Date();
  const monthLabels = useMemo(() => getMonthLabels(), []);
  const chartData = mode === "attendance" ? attendanceData : engagementData;

  // Filter data based on range
  const visibleMonths = useMemo(() => {
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    switch (range) {
      case "last3":
        return monthLabels.slice(-3);
      case "last6":
        return monthLabels.slice(-6);
      case "last9":
        return monthLabels.slice(-9);
      case "last12":
        return monthLabels.slice(-12);
      case "thisYear":
        return monthLabels.filter((m) => m.year === currentYear);
      case "lastYear":
        // Show all 12 months of the previous year (Jan - Dec)
        return monthLabels.filter((m) => m.year === lastYear);
      case "fiveYears":
        return monthLabels;
      default:
        return monthLabels.slice(-12);
    }
  }, [monthLabels, range, now]);

  // Get data points for visible range (aggregated by year for fiveYears)
  const dataPoints = useMemo(() => {
    if (range === "fiveYears") {
      // Aggregate data by year for 5 years view
      const currentYear = now.getFullYear();
      const years = [
        currentYear - 4,
        currentYear - 3,
        currentYear - 2,
        currentYear - 1,
        currentYear,
      ];

      return years.map((year) => {
        const values: Record<string, number> = {};
        branches.forEach((branch) => {
          // Sum all months for this year
          let yearTotal = 0;
          monthLabels.forEach((month, idx) => {
            if (month.year === year) {
              yearTotal += chartData[branch.id]?.[idx] ?? 0;
            }
          });
          values[branch.id] = yearTotal;
        });
        return { label: year.toString(), values };
      });
    }

    return visibleMonths.map((month) => {
      const dataIndex = monthLabels.indexOf(month);
      const values: Record<string, number> = {};
      branches.forEach((branch) => {
        values[branch.id] = chartData[branch.id]?.[dataIndex] ?? 0;
      });
      return { label: month.label, values };
    });
  }, [visibleMonths, monthLabels, branches, chartData, range, now]);

  // Calculate max value for Y axis
  const maxValue = useMemo(() => {
    let max = 0;
    dataPoints.forEach((point) => {
      branches.forEach((branch) => {
        if (point.values[branch.id] > max) {
          max = point.values[branch.id];
        }
      });
    });
    return max <= 20 ? 20 : max <= 60 ? 60 : Math.ceil(max / 10) * 10;
  }, [dataPoints, branches]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= maxValue; i += 10) {
      ticks.push(i);
    }
    return ticks;
  }, [maxValue]);

  const usableHeight = CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
  const scaleY = maxValue > 0 ? usableHeight / maxValue : 0;

  // Fixed SVG internal width - chart scales to container via viewBox
  const SVG_WIDTH = 400;

  const getX = (index: number) => {
    const usableWidth = SVG_WIDTH - PADDING_X * 2;
    return (
      PADDING_X + (index * usableWidth) / Math.max(dataPoints.length - 1, 1)
    );
  };

  const getY = (value: number) => CHART_HEIGHT - BOTTOM_MARGIN - value * scaleY;

  // Generate polyline points for each branch
  const getPolylinePoints = (branchId: string) => {
    return dataPoints
      .map((point, idx) => `${getX(idx)},${getY(point.values[branchId])}`)
      .join(" ");
  };

  const handleMouseEnter = (
    e: React.MouseEvent<SVGCircleElement>,
    branchName: string,
    value: number,
  ) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = svg.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    const label = mode === "attendance" ? "present" : "enrollment";
    setTooltip({
      visible: true,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
      content: `${branchName} ${label}: ${value}`,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const primaryLabel = mode === "attendance" ? "Attendance" : "Enrollment";
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";
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
                {primaryLabel} (Monthly)
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

          {/* Legend and Range Selector */}
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

            {/* Range Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 font-semibold text-sm"
                >
                  {rangeLabel}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {RANGE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.key}
                    onClick={() => setRange(opt.key)}
                    className={cn(
                      opt.key === range && "font-semibold bg-accent",
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
                  style={{ bottom: BOTTOM_MARGIN + tick * scaleY - 6 }}
                >
                  {tick}
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="relative flex-1" style={{ height: CHART_HEIGHT }}>
              {/* Horizontal Grid Lines (HTML) */}
              {yTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-5 border-t border-border"
                  style={{ bottom: BOTTOM_MARGIN + tick * scaleY }}
                />
              ))}

              {/* Tooltip */}
              {tooltip.visible && (
                <div
                  className="pointer-events-none absolute z-20"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="rounded bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap">
                    {tooltip.content}
                  </div>
                </div>
              )}

              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
                className="absolute inset-0 w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Vertical Grid Lines */}
                {dataPoints.map((_, idx) => {
                  const x = getX(idx);
                  return (
                    <line
                      key={`v-${idx}`}
                      x1={x}
                      x2={x}
                      y1={getY(maxValue)}
                      y2={getY(0)}
                      className="stroke-border"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Lines */}
                {branches.map((branch) => (
                  <polyline
                    key={branch.id}
                    fill="none"
                    stroke={branch.color}
                    strokeWidth={2}
                    points={getPolylinePoints(branch.id)}
                  />
                ))}

                {/* Data Points */}
                {branches.map((branch) =>
                  dataPoints.map((point, idx) => {
                    const value = point.values[branch.id];
                    return (
                      <circle
                        key={`${branch.id}-${idx}`}
                        cx={getX(idx)}
                        cy={getY(value)}
                        r={5}
                        className="fill-background cursor-pointer"
                        stroke={branch.color}
                        strokeWidth={2}
                        onMouseEnter={(e) =>
                          handleMouseEnter(e, branch.name, value)
                        }
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  }),
                )}

                {/* X-axis Labels */}
                {dataPoints.map((point, idx) => (
                  <text
                    key={point.label}
                    x={getX(idx)}
                    y={CHART_HEIGHT - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {point.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
