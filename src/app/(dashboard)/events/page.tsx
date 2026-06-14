import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getUserByAuthId, getUserBranchIds } from "@/data/users";
import { getCurrentUserPermissions, getFirstViewablePath } from "@/data/permissions";
import {
  getEventsForCaller,
  getPendingApprovals,
  allowedScopesForRole,
  type EventCaller,
} from "@/data/events";
import { Banner } from "@/components/ui/banner";
import { EventsView } from "@/components/events/events-view";
import { supabaseAdmin } from "@/db";
import { isCompanyAdminRole } from "@/data/users";

export default async function EventsPage() {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const permData = await getCurrentUserPermissions();
  const perms = permData?.permissions.events;
  if (!perms?.can_view) {
    redirect(permData ? getFirstViewablePath(permData.permissions, permData.role) : "/login");
  }

  const staff = await getUserByAuthId(authUser.id);
  if (!staff) redirect("/login");

  const caller: EventCaller = {
    kind: "staff",
    userId: staff.id,
    role: staff.role,
    branchId: staff.branch_id ?? null,
  };

  const [events, pending] = await Promise.all([
    getEventsForCaller(caller),
    getPendingApprovals(caller),
  ]);

  // Branch + company options for the modal (filtered to caller's scope).
  const branchIds = await getUserBranchIds(staff.email);
  let branchQuery = supabaseAdmin
    .from("branches")
    .select("id, name, type, parent_id, city")
    .is("deleted_at", null);
  if (branchIds !== null) branchQuery = branchQuery.in("id", branchIds);
  const { data: branchRows } = await branchQuery;

  const branchOptions = (branchRows ?? [])
    .filter((b) => b.type !== "company")
    .map((b) => ({
      value: b.id,
      label: b.city ? `${b.name} — ${b.city}` : b.name,
      companyId: b.parent_id as string | null,
    }));

  const companyIds = Array.from(
    new Set((branchRows ?? []).map((b) => (b.type === "company" ? b.id : b.parent_id)).filter(Boolean) as string[]),
  );
  const { data: companyRows } = await supabaseAdmin
    .from("branches")
    .select("id, name")
    .eq("type", "company")
    .in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"])
    .is("deleted_at", null);

  const companyOptions = (companyRows ?? []).map((c) => ({ value: c.id, label: c.name }));

  const canApprove = isCompanyAdminRole(staff.role);

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-2">
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Events"
          description="Activities, competitions, holidays and personal schedule"
          mascotImage="/banners/mascot.png"
        />
        <EventsView
          initialEvents={events}
          initialPending={pending}
          callerRole={staff.role}
          allowedScopes={allowedScopesForRole(staff.role)}
          canCreate={perms?.can_create ?? false}
          canEdit={perms?.can_edit ?? false}
          canDelete={perms?.can_delete ?? false}
          canApprove={canApprove}
          branchOptions={branchOptions}
          companyOptions={companyOptions}
          currentUserBranchId={staff.branch_id ?? null}
        />
      </div>
    </main>
  );
}
