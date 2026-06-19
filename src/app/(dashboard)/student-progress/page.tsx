import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getProgressForDateSlot } from "@/data/student-progress";
import { getScheduleSlotsForFilter } from "@/data/attendance-slots";
import { ProgressDateTable } from "@/components/student-progress/progress-date-table";
import { Banner } from "@/components/ui/banner";

export const metadata = { title: "Student Progress" };

/** Today's local date as YYYY-MM-DD (server-side). */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function StudentProgressPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  if (!permData?.permissions.student_progress?.can_view) {
    redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");
  }
  const canEdit = !!permData.permissions.student_progress?.can_edit;

  const sp = await searchParams;
  const date = sp.date ?? todayLocal();
  const slot = sp.slot ?? "";

  const [rows, slotOptions] = await Promise.all([
    getProgressForDateSlot(user.email, { date, slot: slot || undefined }),
    getScheduleSlotsForFilter(user.email),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Student Progress"
          description="Track and tick off what each student has learnt"
          mascotImage="/banners/mascot.png"
        />

        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Lesson progress for students who attended on the selected date. Pick a
            date and slot, then tick off what each student learnt.
          </p>
        </div>

        <ProgressDateTable
          rows={rows}
          slotOptions={slotOptions}
          date={date}
          slot={slot}
          canEdit={canEdit}
          toolbarLeft={
            <Link
              href="/student-progress/all"
              className="inline-flex h-[40px] shrink-0 items-center justify-center rounded-lg bg-[#615DFA] px-5 text-sm font-semibold text-white transition hover:bg-[#504bdb]"
            >
              All Progresses
            </Link>
          }
        />
      </div>
    </main>
  );
}
