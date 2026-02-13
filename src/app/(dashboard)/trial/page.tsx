import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { TrialTable } from "@/components/trial/trial-table";
import { getTrialsForTable } from "@/data/trial";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";

export default async function TrialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const [trials, branchesData, coursesData] = await Promise.all([
    getTrialsForTable(user.email),
    getAllBranches(),
    getAllCourses(),
  ]);

  // Map branches and courses to option format
  const branches = branchesData.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const courses = coursesData.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Trials"
          description="Manage trial class bookings for prospective students"
          mascotImage="/banners/mascot.png"
        />

        <TrialTable
          initialData={trials}
          branches={branches}
          courses={courses}
        />
      </div>
    </main>
  );
}
