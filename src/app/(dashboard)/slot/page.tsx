import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { SlotTable } from "@/components/slot/slot-table";
import { supabaseAdmin } from "@/db";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds } from "@/data/users";
import { getAllBranches } from "@/data/branches";
import { getAllCourses } from "@/data/courses";

export const dynamic = "force-dynamic";

export interface SlotTableRow {
  id: string;
  courseId: string;
  courseName: string;
  branchId: string;
  branchName: string;
  day: string;
  time: string;
  duration: number;
  limitStudent: number;
}

async function getSlotsForTable(userEmail: string, useCityName: boolean): Promise<SlotTableRow[]> {
  let branchIds = await getUserBranchIds(userEmail);
  const { getUserByEmail } = await import("@/data/users");
  const user = await getUserByEmail(userEmail);

  // Expand for group_admin
  if (branchIds && branchIds.length > 0 && user?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches").select("id, type, parent_id").in("id", branchIds).is("deleted_at", null);
    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }
    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches").select("id").in("parent_id", [...companyIds]).in("type", ["hq", "branch"]).is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

  let query = supabaseAdmin
    .from("course_slots")
    .select(`
      id, course_id, branch_id, day, time, duration, limit_student,
      course:courses!inner(id, name),
      branch:branches!inner(id, name, city)
    `)
    .is("deleted_at", null)
    .order("day")
    .order("time");

  if (branchIds) {
    query = query.in("branch_id", branchIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching slots:", error);
    return [];
  }

  return (data ?? []).map((s: any) => ({
    id: s.id,
    courseId: s.course_id,
    courseName: s.course?.name ?? "Unknown",
    branchId: s.branch_id,
    branchName: useCityName ? (s.branch?.city || s.branch?.name || "N/A") : (s.branch?.name || "N/A"),
    day: s.day,
    time: s.time,
    duration: s.duration,
    limitStudent: s.limit_student,
  }));
}

export default async function SlotPage() {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.programs;
  if (!perms?.can_view) redirect(permData ? getFirstViewablePath(permData.permissions) : "/login");

  const useCityName = permData!.role !== "super_admin";
  const hideBranch = permData!.role === "company_admin" || permData!.role === "instructor";
  const showBranchInModal = permData!.role === "super_admin" || permData!.role === "group_admin";

  // Fetch branches for the modal
  let branchesData = await getAllBranches();
  if (useCityName) {
    const branchIds = await getUserBranchIds(user.email);
    if (branchIds && branchIds.length > 0) {
      if (permData!.role === "group_admin") {
        const companyIds = new Set<string>();
        for (const b of branchesData) {
          if (branchIds.includes(b.id)) {
            if (b.type === "company") companyIds.add(b.id);
            else if (b.parent_id) companyIds.add(b.parent_id);
          }
        }
        branchesData = branchesData.filter(
          (b) => b.type !== "company" && b.parent_id && companyIds.has(b.parent_id)
        );
      } else {
        branchesData = branchesData.filter((b) => branchIds.includes(b.id));
      }
    }
  }

  const branches = branchesData.map((b) => ({
    id: b.id,
    name: useCityName ? (b.city || b.name) : b.name,
  }));

  const coursesData = await getAllCourses();
  const courses = coursesData.map((c) => ({ id: c.id, name: c.name }));

  const slots = await getSlotsForTable(user.email, useCityName);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Slot"
          description="Manage time slots for programs across branches"
          mascotImage="/banners/mascot.png"
        />

        <SlotTable
          data={slots}
          hideBranch={hideBranch}
          showBranchInModal={showBranchInModal}
          canAdd={perms?.can_create}
          canEdit={perms?.can_edit}
          canDelete={perms?.can_delete}
          courses={courses}
          branches={branches}
          defaultBranchId={!showBranchInModal && branches.length === 1 ? branches[0].id : undefined}
        />
      </div>
    </main>
  );
}
