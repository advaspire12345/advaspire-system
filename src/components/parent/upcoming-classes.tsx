import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { UpcomingClass } from "@/data/parent-portal";

interface UpcomingClassesProps {
  classes: UpcomingClass[];
}

const childColors = [
  "#615DFA",
  "#23D2E2",
  "#FB06D4",
  "#F17521",
  "#EB1A33",
];

export function UpcomingClasses({ classes }: UpcomingClassesProps) {
  // Map child names to colors
  const childColorMap = new Map<string, string>();
  const uniqueNames = [...new Set(classes.map((c) => c.childName))];
  uniqueNames.forEach((name, i) => {
    childColorMap.set(name, childColors[i % childColors.length]);
  });

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)] flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-[#615DFA]" />
        <h2 className="text-base font-bold text-[#3e3f5e]">
          Upcoming Classes
        </h2>
      </div>

      {!classes.length ? (
        <p className="text-sm text-[#8f91ac] text-center py-4 flex-1 flex items-center justify-center">
          No upcoming classes
        </p>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          {classes.slice(0, 7).map((cls, idx) => {
            const date = new Date(cls.date);
            const color = childColorMap.get(cls.childName) ?? "#615DFA";

            return (
              <div
                key={`${cls.date}-${cls.childName}-${idx}`}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition-colors"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                {/* Date badge */}
                <div className="flex flex-col items-center min-w-[40px]">
                  <span className="text-lg font-bold text-[#3e3f5e] leading-none">
                    {format(date, "d")}
                  </span>
                  <span className="text-[10px] font-semibold text-[#8f91ac] uppercase">
                    {format(date, "MMM")}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3e3f5e] truncate">
                    {cls.courseName}
                  </p>
                  <p className="text-xs text-[#8f91ac]">
                    {cls.childName} &middot;{" "}
                    {format(date, "EEEE")} &middot;{" "}
                    {cls.startTime}
                    {cls.endTime ? ` - ${cls.endTime}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
