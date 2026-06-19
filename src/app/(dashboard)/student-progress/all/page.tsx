import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import {
  searchStudentsForProgress,
  getAllProgressForStudent,
} from "@/data/student-progress";
import { AllProgressView } from "@/components/student-progress/all-progress-view";
import { Banner } from "@/components/ui/banner";

export const metadata = { title: "All Progresses" };

export default async function AllProgressPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<{ q?: string; student?: string }>;
}) {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  if (!permData?.permissions.student_progress?.can_view) {
    redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");
  }
  const canEdit = !!permData.permissions.student_progress?.can_edit;

  const sp = await searchParams;
  const q = sp.q ?? "";
  const studentId = sp.student ?? "";

  const [students, selected] = await Promise.all([
    searchStudentsForProgress(user.email, q),
    studentId
      ? getAllProgressForStudent(user.email, studentId)
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="All Progresses"
          description="Search a student to view all their lesson progress"
          mascotImage="/banners/mascot.png"
        />

        <p className="pt-4 text-sm text-muted-foreground">
          Search for a student to see their full lesson progress across all
          enrolled courses.
        </p>

        <AllProgressView
          students={students}
          selected={selected}
          q={q}
          canEdit={canEdit}
        />
      </div>
    </main>
  );
}
