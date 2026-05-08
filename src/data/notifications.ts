import { supabaseAdmin } from "@/db";
import type { Notification, NotificationType, UserRole } from "@/db/schema";

/**
 * Recipient filter for staff notifications. All conditions are AND-ed.
 *  - role:      one or more roles to target (e.g. ['group_admin','company_admin'])
 *  - branchId:  recipient must be assigned to this branch (exact match on users.branch_id)
 *  - companyId: recipient must belong to a branch under this company
 *  - excludeUserId: typically the actor — don't notify the person who triggered the event
 */
export interface StaffNotifyFilter {
  roles: (UserRole | string)[];
  branchId?: string | null;
  companyId?: string | null;
  excludeUserId?: string | null;
}

interface NotificationPayload {
  type: NotificationType | string;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Record<string, unknown> | null;
}

/** Fan out a notification to every staff user matching the filter. */
export async function notifyStaff(
  filter: StaffNotifyFilter,
  payload: NotificationPayload,
): Promise<number> {
  let query = supabaseAdmin
    .from("users")
    .select("id, role, branch_id")
    .in("role", filter.roles)
    .is("deleted_at", null);

  if (filter.branchId) query = query.eq("branch_id", filter.branchId);

  const { data: candidates } = await query;
  if (!candidates || candidates.length === 0) return 0;

  let recipients = candidates;

  // Company filter requires resolving each user's branch → company_id.
  if (filter.companyId) {
    const branchIds = Array.from(new Set(recipients.map((u) => u.branch_id).filter(Boolean) as string[]));
    if (branchIds.length === 0) return 0;
    const { data: branchRows } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds);
    const branchToCompany = new Map<string, string | null>();
    for (const b of branchRows ?? []) {
      branchToCompany.set(b.id, b.type === "company" ? b.id : b.parent_id);
    }
    recipients = recipients.filter(
      (u) => u.branch_id && branchToCompany.get(u.branch_id) === filter.companyId,
    );
  }

  if (filter.excludeUserId) {
    recipients = recipients.filter((u) => u.id !== filter.excludeUserId);
  }

  if (recipients.length === 0) return 0;

  const rows = recipients.map((u) => ({
    user_id: u.id,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    data: payload.data ?? null,
  }));

  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifyStaff] insert failed:", error);
    return 0;
  }
  return rows.length;
}

/** Notify a single parent (parent portal). */
export async function notifyParent(
  parentId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    parent_id: parentId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    data: payload.data ?? null,
  });
  if (error) {
    console.error("[notifyParent] insert failed:", error);
    return false;
  }
  return true;
}

/** Helper: resolve the company_id for a given branch_id (walks parent if needed). */
export async function resolveBranchCompanyId(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  const { data } = await supabaseAdmin
    .from("branches")
    .select("id, type, parent_id")
    .eq("id", branchId)
    .single();
  if (!data) return null;
  return data.type === "company" ? data.id : data.parent_id;
}

export async function getNotificationsForUser(
  userId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<Notification[]> {
  const limit = opts.limit ?? 30;
  let query = supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) {
    console.error("[getNotificationsForUser] failed:", error);
    return [];
  }
  return (data ?? []) as Notification[];
}

export async function getNotificationsForParent(
  parentId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<Notification[]> {
  const limit = opts.limit ?? 30;
  let query = supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) {
    console.error("[getNotificationsForParent] failed:", error);
    return [];
  }
  return (data ?? []) as Notification[];
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function getUnreadCountForParent(parentId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  return !error;
}

export async function markAllReadForUser(userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  return !error;
}

export async function markAllReadForParent(parentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("parent_id", parentId)
    .is("read_at", null);
  return !error;
}

/** Cron-driven cleanup: delete anything older than 30 days. */
export async function purgeOldNotifications(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .lt("created_at", cutoff.toISOString())
    .select("id");
  if (error) {
    console.error("[purgeOldNotifications] failed:", error);
    return 0;
  }
  return (data ?? []).length;
}
