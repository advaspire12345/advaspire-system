import { Skeleton } from "@/components/ui/skeleton";

export default function ExaminationLoading() {
  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Skeleton className="h-[140px] w-full rounded-2xl" />
        <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
          <Skeleton className="h-[50px] w-full max-w-md rounded-lg" />
          <Skeleton className="h-[50px] w-[160px] rounded-lg" />
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-4 px-4 py-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1 rounded" />
            ))}
          </div>
          <div className="bg-white rounded-lg">
            {Array.from({ length: 10 }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0">
                <Skeleton className="h-4 w-[120px] rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-[60px] rounded" />
                <Skeleton className="h-6 w-[70px] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
