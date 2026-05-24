import { supabaseAdmin } from "@/db";
import type {
  Event,
  EventInsert,
  EventUpdate,
  EventScope,
  EventStatus,
  EventType,
  EventAudience,
  UserRole,
} from "@/db/schema";
import { getUserBranchIds, isCompanyAdminRole } from "@/data/users";
import { notifyEventApprovers } from "@/data/notifications";

// ============================================
// Caller resolution
// ============================================

export type EventCaller =
  | { kind: "staff"; userId: string; role: UserRole; branchId: string | null }
  | { kind: "parent"; parentId: string }
  | { kind: "student"; studentId: string };

interface CallerScope {
  branchIds: string[] | null;   // null = all branches (super_admin / group_admin w/o branch assignment)
  companyIds: string[] | null;  // null = all companies
  linkedStudentIds?: string[];  // populated for parent callers — used for self-scope visibility
}

async function resolveStaffScope(userId: string, role: UserRole): Promise<CallerScope> {
  if (role === "super_admin") return { branchIds: null, companyIds: null };

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email, branch_id")
    .eq("id", userId)
    .single();
  if (!user) return { branchIds: [], companyIds: [] };

  const branchIds = await getUserBranchIds(user.email);

  if (branchIds === null) return { branchIds: null, companyIds: null };
  if (branchIds.length === 0) return { branchIds: [], companyIds: [] };

  const companyIds = await branchesToCompanies(branchIds);
  return { branchIds, companyIds };
}

async function resolveParentScope(parentId: string): Promise<CallerScope> {
  const { data: links } = await supabaseAdmin
    .from("parent_students")
    .select("student_id, student:students!inner(id, branch_id)")
    .eq("parent_id", parentId);

  const branchIds = Array.from(
    new Set(
      (links ?? [])
        .map((l) => (l.student as unknown as { branch_id: string | null }).branch_id)
        .filter((b): b is string => !!b),
    ),
  );
  const linkedStudentIds = Array.from(
    new Set(
      (links ?? [])
        .map((l) => (l.student as unknown as { id: string | null }).id)
        .filter((s): s is string => !!s),
    ),
  );

  const companyIds = await branchesToCompanies(branchIds);
  return { branchIds, companyIds, linkedStudentIds };
}

async function resolveStudentScope(studentId: string): Promise<CallerScope> {
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("branch_id")
    .eq("id", studentId)
    .single();
  if (!student?.branch_id) return { branchIds: [], companyIds: [] };
  const companyIds = await branchesToCompanies([student.branch_id]);
  return { branchIds: [student.branch_id], companyIds };
}

async function branchesToCompanies(branchIds: string[]): Promise<string[]> {
  if (branchIds.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("branches")
    .select("id, type, parent_id")
    .in("id", branchIds);
  const companies = new Set<string>();
  for (const b of data ?? []) {
    companies.add(b.type === "company" ? b.id : (b.parent_id ?? ""));
  }
  companies.delete("");
  return Array.from(companies);
}

async function getCallerScope(caller: EventCaller): Promise<CallerScope> {
  if (caller.kind === "staff") return resolveStaffScope(caller.userId, caller.role);
  if (caller.kind === "parent") return resolveParentScope(caller.parentId);
  return resolveStudentScope(caller.studentId);
}

// ============================================
// Read
// ============================================

export async function getEventsForCaller(
  caller: EventCaller,
  range?: { from?: string; to?: string },
): Promise<Event[]> {
  const scope = await getCallerScope(caller);
  const isStaffRole = caller.kind === "staff";

  // Build the set of audience-matched, scope-matched rows.
  let query = supabaseAdmin
    .from("events")
    .select("*")
    .is("deleted_at", null);

  if (range?.from) query = query.gte("date", range.from);
  if (range?.to) query = query.lte("date", range.to);

  // We can't do the full OR in PostgREST cleanly, so fetch the published-visible
  // set with .or() and then merge in the caller's own pending/rejected rows.
  const visibilityClauses: string[] = [];

  // Self events created by this caller
  if (caller.kind === "staff") {
    visibilityClauses.push(`and(scope.eq.self,created_by_user_id.eq.${caller.userId})`);
  } else if (caller.kind === "parent") {
    visibilityClauses.push(`and(scope.eq.self,created_by_parent_id.eq.${caller.parentId})`);
    // Parents also see self-scope events tied to their linked children
    // (e.g. session reschedule pair events created on the student's behalf).
    if (scope.linkedStudentIds && scope.linkedStudentIds.length > 0) {
      visibilityClauses.push(
        `and(scope.eq.self,created_by_student_id.in.(${scope.linkedStudentIds.join(",")}))`,
      );
    }
  } else {
    visibilityClauses.push(`and(scope.eq.self,created_by_student_id.eq.${caller.studentId})`);
  }

  // Global events — everyone passes the scope check; audience may filter parents/students out
  visibilityClauses.push(`scope.eq.global`);

  // Company-scope events
  if (scope.companyIds === null) {
    visibilityClauses.push(`scope.eq.company`);
  } else if (scope.companyIds.length > 0) {
    visibilityClauses.push(`and(scope.eq.company,company_id.in.(${scope.companyIds.join(",")}))`);
  }

  // Branch-scope events
  if (scope.branchIds === null) {
    visibilityClauses.push(`scope.eq.branch`);
  } else if (scope.branchIds.length > 0) {
    visibilityClauses.push(`and(scope.eq.branch,branch_id.in.(${scope.branchIds.join(",")}))`);
  }

  query = query.eq("status", "published").or(visibilityClauses.join(","));

  const { data: publishedRaw, error } = await query;
  if (error) {
    console.error("[getEventsForCaller] published query failed:", error);
    return [];
  }

  // Apply audience filter in JS (non-staff cannot see staff_only events).
  const published = (publishedRaw ?? []).filter((row) => {
    if (row.scope === "self") return true;
    if (row.audience === "everyone") return true;
    return isStaffRole;
  });

  // Pending/rejected: only the creator sees them.
  let pendingQuery = supabaseAdmin
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .in("status", ["pending", "rejected"]);

  if (range?.from) pendingQuery = pendingQuery.gte("date", range.from);
  if (range?.to) pendingQuery = pendingQuery.lte("date", range.to);

  if (caller.kind === "staff") {
    pendingQuery = pendingQuery.eq("created_by_user_id", caller.userId);
  } else if (caller.kind === "parent") {
    pendingQuery = pendingQuery.eq("created_by_parent_id", caller.parentId);
  } else {
    pendingQuery = pendingQuery.eq("created_by_student_id", caller.studentId);
  }

  const { data: pending } = await pendingQuery;

  const all = [...(published as Event[]), ...((pending ?? []) as Event[])];
  // Deduplicate by id in case any row matched twice.
  const byId = new Map<string, Event>();
  for (const row of all) byId.set(row.id, row);
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getPendingApprovals(caller: EventCaller): Promise<Event[]> {
  if (caller.kind !== "staff") return [];
  if (!isCompanyAdminRole(caller.role)) return [];

  const scope = await getCallerScope(caller);

  let query = supabaseAdmin
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .eq("status", "pending");

  // Pending events are always branch-scoped (only assistant_admin can create them).
  // Filter by company membership.
  if (scope.companyIds !== null) {
    if (scope.companyIds.length === 0) return [];
    query = query.in("company_id", scope.companyIds);
  }

  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as Event[];
}

// ============================================
// Create / Update / Delete
// ============================================

const ROLE_MAX_SCOPE: Record<string, EventScope[]> = {
  super_admin: ["self", "branch", "company", "global"],
  group_admin: ["self", "branch", "company"],
  company_admin: ["self", "branch"],
  assistant_admin: ["self", "branch"],
  instructor: ["self"],
  parent: ["self"],
  student: ["self"],
};

export function allowedScopesForRole(role: UserRole): EventScope[] {
  return ROLE_MAX_SCOPE[role] ?? ["self"];
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_type: EventType;
  scope: EventScope;
  audience?: EventAudience;
  date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  color?: string;
  branch_id?: string | null;
  company_id?: string | null;
}

export async function createEvent(
  caller: EventCaller,
  input: CreateEventInput,
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  const callerRole: UserRole =
    caller.kind === "staff" ? caller.role : (caller.kind as UserRole);

  const allowed = allowedScopesForRole(callerRole);
  if (!allowed.includes(input.scope)) {
    return { ok: false, error: `Your role cannot create ${input.scope}-scope events.` };
  }

  // Scope target validation
  if (input.scope === "branch" && (!input.branch_id || !input.company_id)) {
    return { ok: false, error: "Branch-scope events require branch_id and company_id." };
  }
  if (input.scope === "company" && !input.company_id) {
    return { ok: false, error: "Company-scope events require company_id." };
  }
  if (input.scope === "global" && (input.branch_id || input.company_id)) {
    return { ok: false, error: "Global-scope events must not set branch_id or company_id." };
  }

  // Approval gate: assistant_admin branch events go pending
  const needsApproval =
    callerRole === "assistant_admin" && input.scope === "branch";
  const status: EventStatus = needsApproval ? "pending" : "published";

  const row: EventInsert = {
    title: input.title.trim(),
    description: input.description ?? null,
    event_type: input.event_type,
    scope: input.scope,
    audience: input.scope === "self" ? "everyone" : (input.audience ?? "everyone"),
    date: input.date,
    end_date: input.end_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    color: input.color ?? defaultColorForType(input.event_type),
    branch_id: input.scope === "branch" ? input.branch_id ?? null : null,
    company_id: input.scope === "branch" || input.scope === "company"
      ? input.company_id ?? null
      : null,
    status,
  };

  if (caller.kind === "staff") row.created_by_user_id = caller.userId;
  else if (caller.kind === "parent") row.created_by_parent_id = caller.parentId;
  else row.created_by_student_id = caller.studentId;

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert(row)
    .select()
    .single();
  if (error || !data) {
    console.error("[createEvent] insert failed:", error);
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  if (needsApproval) {
    try {
      if (input.company_id) {
        await notifyEventApprovers(input.company_id, data.id, data.title);
      }
    } catch (e) {
      console.warn("[createEvent] approval notification failed:", e);
    }
  }

  return { ok: true, event: data as Event };
}

export interface UpdateEventInput
  extends Partial<Omit<CreateEventInput, "scope">> {
  scope?: EventScope;
}

export async function updateEvent(
  caller: EventCaller,
  eventId: string,
  input: UpdateEventInput,
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();
  if (!existing) return { ok: false, error: "Event not found." };

  if (existing.source_course_id) {
    return { ok: false, error: "This event is synced from a program — edit the program instead." };
  }

  const canModify = await callerCanModify(caller, existing as Event);
  if (!canModify) return { ok: false, error: "You do not have permission to edit this event." };

  const update: EventUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.description !== undefined) update.description = input.description;
  if (input.event_type !== undefined) update.event_type = input.event_type;
  if (input.scope !== undefined) update.scope = input.scope;
  if (input.audience !== undefined) update.audience = input.audience;
  if (input.date !== undefined) update.date = input.date;
  if (input.end_date !== undefined) update.end_date = input.end_date;
  if (input.start_time !== undefined) update.start_time = input.start_time;
  if (input.end_time !== undefined) update.end_time = input.end_time;
  if (input.color !== undefined) update.color = input.color;
  if (input.branch_id !== undefined) update.branch_id = input.branch_id;
  if (input.company_id !== undefined) update.company_id = input.company_id;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update(update)
    .eq("id", eventId)
    .select()
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed" };
  return { ok: true, event: data as Event };
}

export async function softDeleteEvent(
  caller: EventCaller,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();
  if (!existing) return { ok: false, error: "Event not found." };

  if (existing.source_course_id) {
    return { ok: false, error: "This event is synced from a program — delete the program instead." };
  }

  const canModify = await callerCanModify(caller, existing as Event);
  if (!canModify) return { ok: false, error: "You do not have permission to delete this event." };

  const { error } = await supabaseAdmin
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function approveEvent(
  caller: EventCaller,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (caller.kind !== "staff") return { ok: false, error: "Forbidden" };
  if (!isCompanyAdminRole(caller.role)) return { ok: false, error: "Forbidden" };

  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .single();
  if (!existing) return { ok: false, error: "Pending event not found." };

  // Verify the approver shares the company
  const scope = await getCallerScope(caller);
  if (scope.companyIds !== null && existing.company_id && !scope.companyIds.includes(existing.company_id)) {
    return { ok: false, error: "Cannot approve an event outside your company." };
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update({
      status: "published",
      approved_by_user_id: caller.userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  // Notify the creator directly
  if (existing.created_by_user_id) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: existing.created_by_user_id,
        type: "event_approved",
        title: "Event approved",
        body: `Your event "${existing.title}" has been approved.`,
        link: `/events?highlight=${eventId}`,
        data: { eventId },
      });
    } catch {}
  }

  return { ok: true };
}

export async function rejectEvent(
  caller: EventCaller,
  eventId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (caller.kind !== "staff") return { ok: false, error: "Forbidden" };
  if (!isCompanyAdminRole(caller.role)) return { ok: false, error: "Forbidden" };

  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .single();
  if (!existing) return { ok: false, error: "Pending event not found." };

  const scope = await getCallerScope(caller);
  if (scope.companyIds !== null && existing.company_id && !scope.companyIds.includes(existing.company_id)) {
    return { ok: false, error: "Cannot reject an event outside your company." };
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update({
      status: "rejected",
      rejected_reason: reason.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  if (existing.created_by_user_id) {
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: existing.created_by_user_id,
        type: "event_rejected",
        title: "Event rejected",
        body: reason.trim()
          ? `Your event "${existing.title}" was rejected: ${reason.trim()}`
          : `Your event "${existing.title}" was rejected.`,
        link: `/events?highlight=${eventId}`,
        data: { eventId },
      });
    } catch {}
  }

  return { ok: true };
}

// ============================================
// Program (course) auto-sync
// ============================================

interface CourseSyncSource {
  id: string;
  name: string;
  description: string | null;
  program_type: string | null;
  start_date: string | null;
  end_date: string | null;
  branch_id: string | null;
  deleted_at: string | null;
  created_by?: string | null;
}

function isPastEvent(row: Pick<Event, "date" | "end_date" | "end_time">): boolean {
  const dayStr = row.end_date ?? row.date;
  const timeStr = row.end_time ?? "23:59:59";
  return new Date(`${dayStr}T${timeStr}`).getTime() < Date.now();
}

function dateOnly(ts: string | null): string | null {
  if (!ts) return null;
  // courses.start_date / end_date are timestamptz — cut to date portion.
  return ts.slice(0, 10);
}

/**
 * Idempotently reconcile the event row mirrored from a workshop/bootcamp course.
 * Past linked events are frozen (detached) and a fresh row is inserted for the
 * new dates. See plan §"Auto-event sync from programs".
 */
export async function syncEventFromProgram(courseId: string): Promise<void> {
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, name, description, program_type, start_date, end_date, branch_id, deleted_at")
    .eq("id", courseId)
    .single();
  if (!course) return;

  const c = course as CourseSyncSource;
  const startDate = dateOnly(c.start_date);
  const endDate = dateOnly(c.end_date);

  const eligible =
    !c.deleted_at &&
    (c.program_type === "workshop" || c.program_type === "bootcamp") &&
    !!startDate &&
    !!endDate &&
    !!c.branch_id;

  // Look up existing live link
  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("source_course_id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!eligible) {
    // Program is no longer eligible — soft-delete the live link if it's still future.
    if (existing && !isPastEvent(existing as Event)) {
      await supabaseAdmin
        .from("events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return;
  }

  const companyId = c.branch_id ? await resolveCompanyForBranch(c.branch_id) : null;

  if (existing) {
    if (isPastEvent(existing as Event)) {
      // Freeze the past row by detaching it, then insert a fresh row.
      await supabaseAdmin
        .from("events")
        .update({ source_course_id: null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      await insertProgramEvent(c, startDate!, endDate!, c.branch_id!, companyId);
      return;
    }

    // Live update in place
    await supabaseAdmin
      .from("events")
      .update({
        title: c.name,
        description: c.description ?? null,
        date: startDate!,
        end_date: endDate!,
        branch_id: c.branch_id!,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await insertProgramEvent(c, startDate!, endDate!, c.branch_id!, companyId);
}

async function insertProgramEvent(
  course: CourseSyncSource,
  startDate: string,
  endDate: string,
  branchId: string,
  companyId: string | null,
): Promise<void> {
  if (!companyId) return; // can't satisfy the events_branch_scope_targets check

  // Use the course's creator if we can attribute it; otherwise leave null and rely on
  // the column being SET NULL on user delete (creator_exactly_one still needs one creator).
  // Since the constraint requires one creator, fall back to the first super_admin user.
  const creatorId = await firstSuperAdminId();
  if (!creatorId) return;

  const row: EventInsert = {
    title: course.name,
    description: course.description ?? null,
    event_type: "activity",
    scope: "branch",
    audience: "everyone",
    date: startDate,
    end_date: endDate,
    start_time: null,
    end_time: null,
    color: "#22c55e", // activity green default
    created_by_user_id: creatorId,
    branch_id: branchId,
    company_id: companyId,
    status: "published",
    source_course_id: course.id,
  };

  const { error } = await supabaseAdmin.from("events").insert(row);
  if (error) console.error("[syncEventFromProgram] insert failed:", error);
}

async function resolveCompanyForBranch(branchId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("branches")
    .select("id, type, parent_id")
    .eq("id", branchId)
    .single();
  if (!data) return null;
  return data.type === "company" ? data.id : data.parent_id;
}

async function firstSuperAdminId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("role", "super_admin")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Soft-delete the live linked event when a program is soft-deleted.
 * Past linked events stay untouched (historical record).
 */
export async function softDeleteEventForProgram(courseId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("source_course_id", courseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return;
  if (isPastEvent(existing as Event)) return;

  await supabaseAdmin
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", existing.id);
}

// ============================================
// Internal helpers
// ============================================

async function callerCanModify(caller: EventCaller, event: Event): Promise<boolean> {
  // Creator can always modify their own row
  if (caller.kind === "staff" && event.created_by_user_id === caller.userId) return true;
  if (caller.kind === "parent" && event.created_by_parent_id === caller.parentId) return true;
  if (caller.kind === "student" && event.created_by_student_id === caller.studentId) return true;

  // Company-tier admins can modify anything in their company
  if (caller.kind === "staff") {
    if (isCompanyAdminRole(caller.role)) {
      const scope = await getCallerScope(caller);
      if (scope.companyIds === null) return true;
      if (event.company_id && scope.companyIds.includes(event.company_id)) return true;
      if (event.scope === "global") return caller.role === "super_admin";
    }
  }

  return false;
}

function defaultColorForType(t: EventType): string {
  switch (t) {
    case "activity":
      return "#22c55e";
    case "competition":
      return "#ef4444";
    case "own_schedule":
      return "#23D2E2";
    case "holiday":
      return "#a855f7";
  }
}

// ============================================
// Reschedule-pair helpers (used by src/data/reschedules.ts)
// ============================================

export const RESCHEDULE_ORIGIN_COLOR = "#94a3b8"; // grey — cancelled session
export const RESCHEDULE_TARGET_COLOR = "#615DFA"; // purple — newly scheduled

export interface ReschedulePairInput {
  studentId: string;
  courseName: string;
  originalDate: string;
  originalStartTime: string | null;
  originalEndTime: string | null;
  newDate: string;
  newStartTime: string | null;
  newEndTime: string | null;
}

export async function createReschedulePairEvents(
  input: ReschedulePairInput,
): Promise<{ originEventId: string; targetEventId: string }> {
  const baseRow = {
    event_type: "own_schedule" as const,
    scope: "self" as const,
    audience: "everyone" as const,
    status: "published" as const,
    created_by_student_id: input.studentId,
    description: null,
    branch_id: null,
    company_id: null,
    source_course_id: null,
  };

  const { data: origin, error: originErr } = await supabaseAdmin
    .from("events")
    .insert({
      ...baseRow,
      title: `Cancelled — ${input.courseName}`,
      date: input.originalDate,
      end_date: null,
      start_time: input.originalStartTime,
      end_time: input.originalEndTime,
      color: RESCHEDULE_ORIGIN_COLOR,
    })
    .select()
    .single();
  if (originErr || !origin) {
    throw new Error(`Failed to create origin event: ${originErr?.message ?? "unknown"}`);
  }

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("events")
    .insert({
      ...baseRow,
      title: `Rescheduled — ${input.courseName}`,
      date: input.newDate,
      end_date: null,
      start_time: input.newStartTime,
      end_time: input.newEndTime,
      color: RESCHEDULE_TARGET_COLOR,
    })
    .select()
    .single();
  if (targetErr || !target) {
    // Roll back the origin we just created so we don't leave an orphan.
    await supabaseAdmin.from("events").delete().eq("id", origin.id);
    throw new Error(`Failed to create target event: ${targetErr?.message ?? "unknown"}`);
  }

  return { originEventId: origin.id as string, targetEventId: target.id as string };
}

export async function updateReschedulePairTarget(
  targetEventId: string,
  input: { courseName: string; newDate: string; newStartTime: string | null; newEndTime: string | null },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("events")
    .update({
      title: `Rescheduled — ${input.courseName}`,
      date: input.newDate,
      start_time: input.newStartTime,
      end_time: input.newEndTime,
      color: RESCHEDULE_TARGET_COLOR,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetEventId);
  if (error) throw new Error(`Failed to update reschedule target event: ${error.message}`);
}

export async function softDeleteReschedulePair(
  originEventId: string | null,
  targetEventId: string | null,
): Promise<void> {
  const ids = [originEventId, targetEventId].filter((x): x is string => !!x);
  if (ids.length === 0) return;
  await supabaseAdmin
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
}
