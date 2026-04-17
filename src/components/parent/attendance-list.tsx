import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import type { ParentAttendanceRecord } from "@/data/parent-portal";

interface AttendanceListProps {
  records: ParentAttendanceRecord[];
}

const statusConfig: Record<
  string,
  { color: string; label: string }
> = {
  present: { color: "#22c55e", label: "Present" },
  absent: { color: "#ef4444", label: "Absent" },
  late: { color: "#eab308", label: "Late" },
  excused: { color: "#3b82f6", label: "Excused" },
};

export function AttendanceList({ records }: AttendanceListProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-[#615DFA]" />
        <h2 className="text-base font-bold text-[#3e3f5e]">
          Attendance History
        </h2>
      </div>

      {!records.length ? (
        <p className="text-sm text-[#8f91ac] text-center py-4">
          No attendance records yet
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-hide">
          {records.map((record) => {
            const config = statusConfig[record.status] ?? statusConfig.present;

            return (
              <div
                key={record.id}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition-colors"
              >
                {/* Date */}
                <span className="text-xs font-semibold text-[#8f91ac] min-w-[60px]">
                  {format(new Date(record.date), "d MMM")}
                </span>

                {/* Status dot */}
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                  title={config.label}
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3e3f5e] truncate">
                    {record.childName}
                  </p>
                  <p className="text-xs text-[#8f91ac] truncate">
                    {record.courseName}
                  </p>
                </div>

                {/* Status label */}
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: config.color,
                    backgroundColor: `${config.color}15`,
                  }}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
