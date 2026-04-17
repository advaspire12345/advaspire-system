import { format } from "date-fns";
import { Rocket, Coins } from "lucide-react";
import type { ParentAttendanceRecord } from "@/data/parent-portal";

interface MissionActivityProps {
  records: ParentAttendanceRecord[];
}

export function MissionActivity({ records }: MissionActivityProps) {
  // Filter to only records with lesson or mission content
  const activities = records.filter((r) => r.lesson || r.mission);

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-[#FB06D4]" />
        <h2 className="text-base font-bold text-[#3e3f5e]">
          Missions & Activities
        </h2>
      </div>

      {!activities.length ? (
        <p className="text-sm text-[#8f91ac] text-center py-4">
          No activities recorded yet
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-hide">
          {activities.map((record) => (
            <div
              key={record.id}
              className="rounded-lg border border-gray-100 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#8f91ac]">
                  {format(new Date(record.date), "d MMM")} &middot;{" "}
                  {record.childName}
                </span>
                {record.adcoin > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#615DFA]">
                    <Coins className="h-3 w-3" />
                    +{record.adcoin}
                  </span>
                )}
              </div>

              {record.lesson && (
                <p className="text-sm text-[#3e3f5e]">
                  <span className="font-semibold">Lesson:</span>{" "}
                  {record.lesson}
                </p>
              )}
              {record.mission && (
                <p className="text-sm text-[#3e3f5e]">
                  <span className="font-semibold text-[#FB06D4]">Mission:</span>{" "}
                  {record.mission}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
