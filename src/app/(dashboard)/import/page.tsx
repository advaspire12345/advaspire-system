import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ImportPage } from "@/components/import/import-page";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import { getUserBranchIds } from "@/data/users";
import { supabaseAdmin } from "@/db";

export const dynamic = "force-dynamic";

export default async function ImportPageRoute() {
  const user = await getUser();
  if (!user?.email) redirect("/login");

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.import;
  if (!perms?.can_view) {
    redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");
  }

  // Branches the importer can target
  const branchIds = await getUserBranchIds(user.email);
  let branchQuery = supabaseAdmin
    .from("branches")
    .select("id, name, code, type")
    .is("deleted_at", null)
    .order("name");
  if (branchIds !== null) branchQuery = branchQuery.in("id", branchIds);
  const { data: branchRows } = await branchQuery;
  const branchOptions = (branchRows ?? [])
    .filter((b) => b.type !== "company")
    .map((b) => ({ name: b.name as string, code: (b.code as string | null) ?? null }));

  // Programs (courses) — name only, for reference
  const { data: courseRows } = await supabaseAdmin
    .from("courses")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  const programOptions = (courseRows ?? []).map((c) => c.name as string);

  // Packages — grouped under each program. The import endpoint matches
  // (course_id, package_type, duration) together, so showing a global
  // combo list is misleading when programs offer different packages.
  const { data: pricingRows } = await supabaseAdmin
    .from("course_pricing")
    .select("course_id, package_type, duration, price")
    .is("deleted_at", null);
  const pricingsByCourse = new Map<string, { package_type: string; duration: number; price: number }[]>();
  for (const p of pricingRows ?? []) {
    const cid = p.course_id as string;
    if (!pricingsByCourse.has(cid)) pricingsByCourse.set(cid, []);
    pricingsByCourse.get(cid)!.push({
      package_type: p.package_type as string,
      duration: p.duration as number,
      price: Number(p.price ?? 0),
    });
  }
  for (const list of pricingsByCourse.values()) {
    list.sort(
      (a, b) => a.package_type.localeCompare(b.package_type) || a.duration - b.duration,
    );
  }
  const programPackages = (courseRows ?? [])
    .map((c) => ({
      program: c.name as string,
      packages: pricingsByCourse.get(c.id as string) ?? [],
    }))
    .filter((p) => p.packages.length > 0);

  // Slots — grouped under each program. Helps the uploader match the
  // schedule_day / schedule_time CSV columns to a real slot. The import
  // doesn't strictly require a slot match, but rows that don't match an
  // existing slot won't group cleanly on /attendance.
  const { data: slotRows } = await supabaseAdmin
    .from("course_slots")
    .select("course_id, day, time, limit_student")
    .is("deleted_at", null);
  const slotsByCourse = new Map<string, { day: string; time: string; limit_student: number }[]>();
  for (const s of slotRows ?? []) {
    const cid = s.course_id as string;
    if (!slotsByCourse.has(cid)) slotsByCourse.set(cid, []);
    slotsByCourse.get(cid)!.push({
      day: s.day as string,
      time: (s.time as string).slice(0, 5), // HH:MM
      limit_student: s.limit_student as number,
    });
  }
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const list of slotsByCourse.values()) {
    list.sort(
      (a, b) =>
        dayOrder.indexOf(a.day.toLowerCase()) - dayOrder.indexOf(b.day.toLowerCase()) ||
        a.time.localeCompare(b.time),
    );
  }
  const programSlots = (courseRows ?? [])
    .map((c) => ({
      program: c.name as string,
      slots: slotsByCourse.get(c.id as string) ?? [],
    }))
    .filter((p) => p.slots.length > 0);

  // Instructors (filtered to importer's accessible branches)
  let instructorQuery = supabaseAdmin
    .from("users")
    .select("name, email, branch_id")
    .eq("role", "instructor")
    .order("name");
  if (branchIds !== null) instructorQuery = instructorQuery.in("branch_id", branchIds);
  const { data: instructorRows } = await instructorQuery;
  const instructorOptions = (instructorRows ?? []).map((u) => ({
    name: u.name as string,
    email: u.email as string,
  }));

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Import"
          description="Bulk import students, attendance, payments and transactions via CSV"
          mascotImage="/banners/mascot.png"
        />

        <ImportPage
          canImport={perms?.can_create}
          branchOptions={branchOptions}
          programOptions={programOptions}
          programPackages={programPackages}
          programSlots={programSlots}
          instructorOptions={instructorOptions}
        />
      </div>
    </main>
  );
}
