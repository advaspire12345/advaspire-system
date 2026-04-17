import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import type { ParentChildData } from "@/data/parent-portal";
import { format } from "date-fns";

interface ChildCardProps {
  child: ParentChildData;
}

export function ChildCard({ child }: ChildCardProps) {
  const percentage =
    child.totalSessions > 0
      ? Math.max(0, child.sessionsRemaining / child.totalSessions)
      : 0;

  const isNegative = child.sessionsRemaining < 0;

  return (
    <div className="min-w-[200px] flex-shrink-0 snap-center rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex flex-col items-center gap-3">
        {/* Avatar with level badge */}
        <div className="relative">
          <HexagonAvatar
            size={80}
            imageUrl={child.photo ?? undefined}
            percentage={percentage}
            fallbackInitials={child.name.charAt(0)}
          />
          <div className="absolute -bottom-1 -right-1">
            <HexagonNumberBadge
              value={child.level}
              size={28}
              color="#615DFA"
            />
          </div>
        </div>

        {/* Name */}
        <h3 className="text-base font-bold text-[#3e3f5e] text-center leading-tight">
          {child.name}
        </h3>

        {/* Course */}
        {child.courseName && (
          <span className="text-xs font-semibold text-[#8f91ac] text-center">
            {child.courseName}
          </span>
        )}

        {/* Session Active */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#8f91ac] uppercase">
              Session Active
            </span>
            <span
              className={`text-xs font-bold ${isNegative ? "text-red-500" : "text-[#3e3f5e]"}`}
            >
              {child.sessionsRemaining}/{child.totalSessions}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(0, percentage * 100)}%`,
                background: isNegative
                  ? "#ef4444"
                  : "linear-gradient(90deg, #615DFA, #23D2E2)",
              }}
            />
          </div>
        </div>

        {/* Expiry */}
        <span className="text-[11px] font-medium text-[#8f91ac]">
          {child.expiresAt
            ? `Exp: ${format(new Date(child.expiresAt), "do MMM yyyy")}`
            : "No expiry"}
        </span>
      </div>
    </div>
  );
}
