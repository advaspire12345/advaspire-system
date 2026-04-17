import { format } from "date-fns";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";

interface ParentStatsProps {
  childrenCount: number;
  totalSessionsActive: number;
  totalSessionsAttended: number;
  nextClass: {
    date: string;
    startTime: string;
    dayOfWeek: string;
  } | null;
}

export function ParentStats({
  childrenCount,
  totalSessionsActive,
  totalSessionsAttended,
  nextClass,
}: ParentStatsProps) {
  const nextClassLabel = nextClass
    ? `${format(new Date(nextClass.date), "d MMM")} ${nextClass.startTime}`
    : "—";

  const stats = [
    {
      value: childrenCount,
      label: "Children",
      color: "#615DFA",
    },
    {
      value: totalSessionsActive,
      label: "Session Active",
      color: "#23D2E2",
    },
    {
      value: totalSessionsAttended,
      label: "Session Attended",
      color: "#F17521",
    },
    {
      value: nextClassLabel,
      label: "Next Class",
      color: "#FB06D4",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8 py-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center gap-1.5">
          <HexagonNumberBadge
            value={stat.value}
            size={48}
            color={stat.color}
          />
          <span className="text-[10px] md:text-xs font-semibold text-[#8f91ac] uppercase tracking-wide text-center leading-tight">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
