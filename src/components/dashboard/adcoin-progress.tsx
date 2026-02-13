import Image from "next/image";
import { Card } from "@/components/ui/card";

interface AdcoinProgressProps {
  currentTotal: number;
  poolLimit: number;
  imageUrl: string;
}

export function AdcoinProgress({
  currentTotal,
  poolLimit,
  imageUrl,
}: AdcoinProgressProps) {
  const remaining = poolLimit - currentTotal;
  const percentage = Math.min((currentTotal / poolLimit) * 100, 100);

  return (
    <Card className="flex flex-row items-center gap-4 p-6">
      {/* Left: Image */}
      <div className="shrink-0">
        <div className="h-16 w-16 overflow-hidden rounded-[10px]">
          <Image
            src={imageUrl}
            alt="Adcoin illustration"
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-base text-muted-foreground font-medium">
            <span className="text-2xl font-black text-foreground">
              +{remaining.toLocaleString()}
            </span>{" "}
            away from the Adcoin pool limit
          </span>
          <span className="text-xs font-bold text-muted-foreground uppercase">
            {currentTotal.toLocaleString()} total Adcoin issued to students
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#615DFA] to-[#23D2E2] transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
