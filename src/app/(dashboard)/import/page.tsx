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

  // Build the importer's scope:
  //   - super_admin: branchIds=null → no scoping
  //   - group_admin: scoped to all hq/branch under their company
  //   - company_admin / assistant / instructor: scoped to their own branch
  // We separately track the "company scope" (used for program/package fetches —
  // programs are owned at company level) and the "branch scope" (used for slots,
  // instructors — which are physically located at one branch).
  const ownBranchIds = await getUserBranchIds(user.email);
  let companyIds: string[] | null = null;
  let branchScope: string[] | null = null;

  if (ownBranchIds === null) {
    // super_admin — no scoping
  } else if (ownBranchIds.length === 0) {
    companyIds = [];
    branchScope = [];
  } else {
    // Resolve company id(s) from the user's branch row(s).
    const { data: ownBranches } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", ownBranchIds)
      .is("deleted_at", null);
    const cIds = new Set<string>();
    for (const b of ownBranches ?? []) {
      if (b.type === "company") cIds.add(b.id);
      else if (b.parent_id) cIds.add(b.parent_id);
    }
    companyIds = [...cIds];

    if (permData!.role === "group_admin") {
      // Group admin: every hq/branch under their company.
      if (companyIds.length > 0) {
        const { data: siblings } = await supabaseAdmin
          .from("branches")
          .select("id")
          .in("parent_id", companyIds)
          .in("type", ["hq", "branch"])
          .is("deleted_at", null);
        branchScope = (siblings ?? []).map((b) => b.id as string);
      } else {
        branchScope = [];
      }
    } else {
      // Company admin / assistant / instructor: locked to their own branch.
      branchScope = ownBranchIds.filter((id) => {
        const row = (ownBranches ?? []).find((b) => b.id === id);
        return row?.type !== "company";
      });
    }
  }

  // Branches the importer can target — hq/branch rows in their branchScope.
  let branchQuery = supabaseAdmin
    .from("branches")
    .select("id, name, code, type")
    .is("deleted_at", null)
    .neq("type", "company")
    .order("name");
  if (branchScope !== null) {
    if (branchScope.length === 0) branchQuery = branchQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
    else branchQuery = branchQuery.in("id", branchScope);
  }
  const { data: branchRows } = await branchQuery;
  const branchOptions = (branchRows ?? []).map((b) => ({
    name: b.name as string,
    code: (b.code as string | null) ?? null,
  }));
  const branchNameById = new Map<string, string>(
    (branchRows ?? []).map((b) => [b.id as string, b.name as string]),
  );

  // Programs (courses) — scoped by company so a CA only sees programs from
  // companies they belong to. branch_id on courses points either at the
  // company row OR at a child hq/branch under it; include both.
  let courseQuery = supabaseAdmin
    .from("courses")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  if (companyIds !== null) {
    if (companyIds.length === 0) {
      courseQuery = courseQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      const inCompanyOrSibling = new Set<string>(companyIds);
      const { data: childBranches } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", companyIds)
        .is("deleted_at", null);
      for (const c of childBranches ?? []) inCompanyOrSibling.add(c.id as string);
      courseQuery = courseQuery.in("branch_id", [...inCompanyOrSibling]);
    }
  }
  const { data: courseRows } = await courseQuery;
  const programOptions = (courseRows ?? []).map((c) => c.name as string);

  // Packages — grouped under each program. The import endpoint matches
  // (course_id, package_type, duration) together, so showing a global
  // combo list is misleading when programs offer different packages.
  const courseIds = (courseRows ?? []).map((c) => c.id as string);
  let pricingQuery = supabaseAdmin
    .from("course_pricing")
    .select("course_id, package_type, duration, price")
    .is("deleted_at", null);
  if (courseIds.length > 0) pricingQuery = pricingQuery.in("course_id", courseIds);
  const { data: pricingRows } = courseIds.length > 0 ? await pricingQuery : { data: [] };
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
  // schedule_day / schedule_time CSV columns to a real slot. Scoped to the
  // importer's branch scope so a company_admin only sees slots at their
  // branch; a group_admin sees every branch under their company (each row
  // tagged with the branch name so the uploader knows which one is which).
  let slotQuery = supabaseAdmin
    .from("course_slots")
    .select("course_id, branch_id, day, time, limit_student")
    .is("deleted_at", null);
  if (courseIds.length > 0) slotQuery = slotQuery.in("course_id", courseIds);
  if (branchScope !== null) {
    if (branchScope.length === 0) slotQuery = slotQuery.in("branch_id", ["00000000-0000-0000-0000-000000000000"]);
    else slotQuery = slotQuery.in("branch_id", branchScope);
  }
  const { data: slotRows } = courseIds.length > 0 ? await slotQuery : { data: [] };
  const slotsByCourse = new Map<string, { branch: string | null; day: string; time: string; limit_student: number }[]>();
  for (const s of slotRows ?? []) {
    const cid = s.course_id as string;
    if (!slotsByCourse.has(cid)) slotsByCourse.set(cid, []);
    slotsByCourse.get(cid)!.push({
      branch: branchNameById.get(s.branch_id as string) ?? null,
      day: s.day as string,
      time: (s.time as string).slice(0, 5), // HH:MM
      limit_student: s.limit_student as number,
    });
  }
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const list of slotsByCourse.values()) {
    list.sort(
      (a, b) =>
        (a.branch ?? "").localeCompare(b.branch ?? "") ||
        dayOrder.indexOf(a.day.toLowerCase()) - dayOrder.indexOf(b.day.toLowerCase()) ||
        a.time.localeCompare(b.time),
    );
  }
  // Surface the branch name on each slot only when the user can see more than
  // one branch — for a company_admin who's only ever looking at slots from
  // their own branch the extra label is noise.
  const showSlotBranch = branchScope === null || branchScope.length > 1;
  const programSlots = (courseRows ?? [])
    .map((c) => ({
      program: c.name as string,
      slots: (slotsByCourse.get(c.id as string) ?? []).map((s) => ({
        day: s.day,
        time: s.time,
        limit_student: s.limit_student,
        branch: showSlotBranch ? s.branch : null,
      })),
    }))
    .filter((p) => p.slots.length > 0);

  // "Instructors" for the attendance/transactions reference panels — broadened
  // to include company_admin and assistant_admin, since in practice those
  // roles also teach classes here. Scoped to the importer's branch scope so
  // the dropdown doesn't leak users from another branch or company. For
  // group_admin (multi-branch scope) each row carries the branch name so the
  // uploader can disambiguate when two branches have similarly-named staff.
  let instructorQuery = supabaseAdmin
    .from("users")
    .select("name, email, branch_id, role")
    .in("role", ["instructor", "assistant_admin", "company_admin"])
    .is("deleted_at", null)
    .order("name");
  if (branchScope !== null) {
    if (branchScope.length === 0) instructorQuery = instructorQuery.in("branch_id", ["00000000-0000-0000-0000-000000000000"]);
    else instructorQuery = instructorQuery.in("branch_id", branchScope);
  }
  const { data: instructorRows } = await instructorQuery;
  const showInstructorBranch = branchScope === null || branchScope.length > 1;
  const instructorOptions = (instructorRows ?? []).map((u) => ({
    name: u.name as string,
    email: u.email as string,
    branch: showInstructorBranch ? (branchNameById.get(u.branch_id as string) ?? null) : null,
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
          hideStudentBranchColumn={branchScope !== null && branchScope.length === 1}
        />
      </div>
    </main>
  );
}
