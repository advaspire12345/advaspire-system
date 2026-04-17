import { Badge } from "@/components/ui/badge";
import { ChildCard } from "@/components/parent/child-card";
import type { ParentChildData } from "@/data/parent-portal";

interface ChildrenSectionProps {
  students: ParentChildData[];
}

export function ChildrenSection({ students }: ChildrenSectionProps) {
  if (!students.length) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
        <p className="text-sm text-[#8f91ac] text-center">
          No children linked to your account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-[#3e3f5e]">My Children</h2>
        <Badge className="bg-[#615DFA] text-white text-xs">
          {students.length}
        </Badge>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide md:grid md:grid-cols-2 md:overflow-x-visible md:snap-none">
        {students.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
    </div>
  );
}
