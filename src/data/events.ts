import { supabaseAdmin } from "@/db";
import type {
  Event,
  EventInsert,
  EventUpdate,
  EventOccurrence,
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
  const events = Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Attach occurrences to non-recurring events so calendar / day-check
  // consumers can iterate the full schedule without an extra round trip.
  const nonRecurringIds = events.filter((e) => !e.is_recurring).map((e) => e.id);
  if (nonRecurringIds.length > 0) {
    const { data: occRows } = await supabaseAdmin
      .from("event_occurrences")
      .select("id, event_id, date, start_time, end_time, sort_order, created_at")
      .in("event_id", nonRecurringIds)
      .order("sort_order");
    const byEventId = new Map<string, EventOccurrence[]>();
    for (const r of occRows ?? []) {
      const list = byEventId.get(r.event_id as string) ?? [];
      list.push(r as EventOccurrence);
      byEventId.set(r.event_id as string, list);
    }
    for (const ev of events) {
      if (!ev.is_recurring) ev.occurrences = byEventId.get(ev.id) ?? [];
    }
  }

  return events;
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

/** Three modes:
 *   1. Specific dates (default) — `occurrences` array of {date, start_time, end_time}.
 *      Each entry is one event_occurrences row.
 *   2. Recurring open-ended — `is_recurring=true`, `is_bounded=false`,
 *      `recurring_days` (e.g. ['monday','saturday']), `recurring_start_time`,
 *      `recurring_end_time`. No date bounds.
 *   3. Recurring bounded — `is_recurring=true`, `is_bounded=true`, all of
 *      the above plus `recurring_start_date`, `recurring_end_date`.
 *
 * Legacy columns (date/end_date/start_time/end_time) are auto-denormalised
 * server-side as the "first occurrence" so 52+ existing read sites that key
 * off them keep working.
 */
export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_type: EventType;
  scope: EventScope;
  audience?: EventAudience;
  color?: string;
  branch_id?: string | null;
  company_id?: string | null;
  // Mode 1
  occurrences?: { date: string; start_time?: string | null; end_time?: string | null }[];
  // Modes 2 & 3
  is_recurring?: boolean;
  is_bounded?: boolean;
  recurring_days?: string[] | null;
  recurring_start_date?: string | null;
  recurring_end_date?: string | null;
  recurring_start_time?: string | null;
  recurring_end_time?: string | null;
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

  // Four valid modes from the (is_recurring, is_bounded) checkbox combo:
  //   Mode 1 — Specific dates (both off): `occurrences[]` carries the schedule.
  //   Mode 2 — Recurring open-ended (Recurring on, Multi-day off): every future
  //            matching weekday from `recurring_days[]`.
  //   Mode 3 — Recurring bounded (both on): weekday rule + [start_date, end_date].
  //   Mode 4 — Multi-day only (Recurring off, Multi-day on): consecutive day
  //            range `recurring_start_date..recurring_end_date` with `recurring_*_time`.
  const isRecurring = input.is_recurring === true;
  const isBounded = input.is_bounded === true;
  const isMultiDayOnly = !isRecurring && isBounded;
  const isSpecificDates = !isRecurring && !isBounded;
  const occurrences = isRecurring ? [] : (input.occurrences ?? []);

  if (isSpecificDates && occurrences.length === 0) {
    return { ok: false, error: "Specific-date events need at least one date." };
  }
  if (isMultiDayOnly) {
    if (!input.recurring_start_date || !input.recurring_end_date) {
      return { ok: false, error: "Multi-day events need both start and end dates." };
    }
    if (input.recurring_start_date > input.recurring_end_date) {
      return { ok: false, error: "End date must be after start date." };
    }
    if (!input.recurring_start_time || !input.recurring_end_time) {
      return { ok: false, error: "Multi-day events need start and end times." };
    }
  }
  if (isRecurring) {
    if (!input.recurring_days || input.recurring_days.length === 0) {
      return { ok: false, error: "Recurring events need at least one day of the week." };
    }
    if (!input.recurring_start_time || !input.recurring_end_time) {
      return { ok: false, error: "Recurring events need start and end times." };
    }
    if (isBounded && (!input.recurring_start_date || !input.recurring_end_date)) {
      return { ok: false, error: "Bounded recurring events need both start and end dates." };
    }
    if (
      isBounded &&
      input.recurring_start_date &&
      input.recurring_end_date &&
      input.recurring_start_date > input.recurring_end_date
    ) {
      return { ok: false, error: "End date must be after start date." };
    }
  }

  // Build the denormalised "first occurrence" / "range start" values that
  // legacy reads still rely on. Multi-day-only mode uses recurring_*_date
  // semantically as start/end of the range — store them in the legacy date /
  // end_date columns so the calendar grid renders the full span.
  const sortedOccurrences = occurrences
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstOccurrence = sortedOccurrences[0];
  let legacyDate: string;
  let legacyStart: string | null;
  let legacyEnd: string | null;
  let legacyEndDate: string | null = null;
  if (isSpecificDates) {
    legacyDate = firstOccurrence.date;
    legacyStart = firstOccurrence.start_time ?? null;
    legacyEnd = firstOccurrence.end_time ?? null;
  } else if (isMultiDayOnly) {
    legacyDate = input.recurring_start_date!;
    legacyStart = input.recurring_start_time ?? null;
    legacyEnd = input.recurring_end_time ?? null;
    legacyEndDate = input.recurring_end_date!;
  } else {
    // Recurring (open or bounded)
    legacyDate = input.recurring_start_date ?? new Date().toISOString().slice(0, 10);
    legacyStart = input.recurring_start_time ?? null;
    legacyEnd = input.recurring_end_time ?? null;
    legacyEndDate = isBounded ? (input.recurring_end_date ?? null) : null;
  }

  const row: EventInsert = {
    title: input.title.trim(),
    description: input.description ?? null,
    event_type: input.event_type,
    scope: input.scope,
    audience: input.scope === "self" ? "everyone" : (input.audience ?? "everyone"),
    date: legacyDate,
    end_date: legacyEndDate,
    start_time: legacyStart,
    end_time: legacyEnd,
    color: input.color ?? defaultColorForType(input.event_type),
    branch_id: input.scope === "branch" ? input.branch_id ?? null : null,
    company_id: input.scope === "branch" || input.scope === "company"
      ? input.company_id ?? null
      : null,
    status,
    is_recurring: isRecurring,
    is_bounded: isBounded,
    // recurring_days only meaningful for recurring modes (2 & 3).
    recurring_days: isRecurring ? (input.recurring_days ?? null) : null,
    // recurring_start_date / end_date populated for any bounded mode (3 & 4).
    recurring_start_date: isBounded ? input.recurring_start_date ?? null : null,
    recurring_end_date: isBounded ? input.recurring_end_date ?? null : null,
    // recurring_start_time / end_time populated for any mode that has them:
    // recurring (2 & 3) AND multi-day-only (4).
    recurring_start_time:
      isRecurring || isMultiDayOnly ? input.recurring_start_time ?? null : null,
    recurring_end_time:
      isRecurring || isMultiDayOnly ? input.recurring_end_time ?? null : null,
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

  // Write the occurrences for specific-dates mode. Recurring events have
  // no occurrence rows — the recurring_* columns drive the schedule.
  if (!isRecurring && sortedOccurrences.length > 0) {
    const occRows = sortedOccurrences.map((o, i) => ({
      event_id: data.id,
      date: o.date,
      start_time: o.start_time ?? null,
      end_time: o.end_time ?? null,
      sort_order: i,
    }));
    const { error: occErr } = await supabaseAdmin.from("event_occurrences").insert(occRows);
    if (occErr) {
      console.error("[createEvent] event_occurrences insert failed:", occErr);
      // Don't roll the event back — the denormalised columns mean it's
      // still visible/usable; just log for diagnosis.
    }
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

  // Resolve mode like createEvent — when any scheduling input is provided
  // the caller must give a fully-coherent set so we don't half-update.
  const scheduleProvided =
    input.is_recurring !== undefined ||
    input.is_bounded !== undefined ||
    input.recurring_days !== undefined ||
    input.recurring_start_date !== undefined ||
    input.recurring_end_date !== undefined ||
    input.recurring_start_time !== undefined ||
    input.recurring_end_time !== undefined ||
    input.occurrences !== undefined;

  const update: EventUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.description !== undefined) update.description = input.description;
  if (input.event_type !== undefined) update.event_type = input.event_type;
  if (input.scope !== undefined) update.scope = input.scope;
  if (input.audience !== undefined) update.audience = input.audience;
  if (input.color !== undefined) update.color = input.color;
  if (input.branch_id !== undefined) update.branch_id = input.branch_id;
  if (input.company_id !== undefined) update.company_id = input.company_id;

  if (scheduleProvided) {
    const isRecurring = input.is_recurring === true;
    const isBounded = input.is_bounded === true;
    const isMultiDayOnly = !isRecurring && isBounded;
    const isSpecificDates = !isRecurring && !isBounded;
    const occurrences = isRecurring ? [] : (input.occurrences ?? []);

    if (isSpecificDates && occurrences.length === 0) {
      return { ok: false, error: "Specific-date events need at least one date." };
    }
    if (isMultiDayOnly) {
      if (!input.recurring_start_date || !input.recurring_end_date) {
        return { ok: false, error: "Multi-day events need both start and end dates." };
      }
      if (input.recurring_start_date > input.recurring_end_date) {
        return { ok: false, error: "End date must be after start date." };
      }
      if (!input.recurring_start_time || !input.recurring_end_time) {
        return { ok: false, error: "Multi-day events need start and end times." };
      }
    }
    if (isRecurring) {
      if (!input.recurring_days || input.recurring_days.length === 0) {
        return { ok: false, error: "Recurring events need at least one day of the week." };
      }
      if (!input.recurring_start_time || !input.recurring_end_time) {
        return { ok: false, error: "Recurring events need start and end times." };
      }
      if (isBounded && (!input.recurring_start_date || !input.recurring_end_date)) {
        return { ok: false, error: "Bounded recurring events need both start and end dates." };
      }
      if (
        isBounded &&
        input.recurring_start_date &&
        input.recurring_end_date &&
        input.recurring_start_date > input.recurring_end_date
      ) {
        return { ok: false, error: "End date must be after start date." };
      }
    }

    const sortedOccurrences = occurrences.slice().sort((a, b) => a.date.localeCompare(b.date));
    const firstOccurrence = sortedOccurrences[0];

    update.is_recurring = isRecurring;
    update.is_bounded = isBounded;
    update.recurring_days = isRecurring ? (input.recurring_days ?? null) : null;
    update.recurring_start_date = isBounded ? input.recurring_start_date ?? null : null;
    update.recurring_end_date = isBounded ? input.recurring_end_date ?? null : null;
    update.recurring_start_time =
      isRecurring || isMultiDayOnly ? input.recurring_start_time ?? null : null;
    update.recurring_end_time =
      isRecurring || isMultiDayOnly ? input.recurring_end_time ?? null : null;

    if (isSpecificDates) {
      update.date = firstOccurrence.date;
      update.start_time = firstOccurrence.start_time ?? null;
      update.end_time = firstOccurrence.end_time ?? null;
      update.end_date = null;
    } else if (isMultiDayOnly) {
      update.date = input.recurring_start_date!;
      update.start_time = input.recurring_start_time ?? null;
      update.end_time = input.recurring_end_time ?? null;
      update.end_date = input.recurring_end_date!;
    } else {
      update.date = input.recurring_start_date ?? new Date().toISOString().slice(0, 10);
      update.start_time = input.recurring_start_time ?? null;
      update.end_time = input.recurring_end_time ?? null;
      update.end_date = isBounded ? (input.recurring_end_date ?? null) : null;
    }

    // Replace occurrences atomically: wipe then re-insert (only specific-dates
    // mode has any).
    await supabaseAdmin.from("event_occurrences").delete().eq("event_id", eventId);
    if (isSpecificDates && sortedOccurrences.length > 0) {
      const occRows = sortedOccurrences.map((o, i) => ({
        event_id: eventId,
        date: o.date,
        start_time: o.start_time ?? null,
        end_time: o.end_time ?? null,
        sort_order: i,
      }));
      const { error: occErr } = await supabaseAdmin.from("event_occurrences").insert(occRows);
      if (occErr) console.error("[updateEvent] event_occurrences insert failed:", occErr);
    }
  }

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

// ============================================
// Recurrence-aware helpers
// ============================================

const WEEKDAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/**
 * Whether `event` is scheduled on the given day. Handles all three modes:
 *   - Specific dates: any occurrence.date === day.
 *   - Recurring open-ended: weekday matches recurring_days.
 *   - Recurring bounded: weekday matches AND day is in [start_date, end_date].
 */
export function isEventOnDate(
  event: Event,
  day: Date | string,
): boolean {
  const dayStr = typeof day === "string" ? day : day.toISOString().slice(0, 10);
  const dayDate = typeof day === "string" ? new Date(day + "T00:00:00") : day;
  if (event.is_recurring) {
    const weekday = WEEKDAY_NAMES[dayDate.getDay()];
    if (!event.recurring_days?.includes(weekday)) return false;
    if (event.is_bounded) {
      if (event.recurring_start_date && dayStr < event.recurring_start_date) return false;
      if (event.recurring_end_date && dayStr > event.recurring_end_date) return false;
    }
    return true;
  }
  return (event.occurrences ?? []).some((o) => o.date === dayStr);
}

/**
 * Active "activity" events the teacher can pick in the Lesson dropdown when
 * marking attendance for a student. An activity is "active" when:
 *   - event_type === 'activity'
 *   - the event is approved (no pending drafts)
 *   - the LATEST occurrence's end_time hasn't passed yet
 *     (for recurring events, that means the recurring_end_date — open-ended
 *     events stay active until the event is soft-deleted)
 *
 * Scope: events scoped to the student's branch / company / global. Trial
 * students currently get no activities (their branch isn't always set).
 */
export async function getActiveActivityEventsForStudent(
  studentId: string,
): Promise<{ id: string; title: string; expiresLabel: string | null }[]> {
  // Resolve the targeted student's branch / company. The `studentId` may be
  // either a real students.id (`branch:` aliased join below) or a trials.id
  // (the modal passes trial.id through the same field). Try students first,
  // fall back to trials, return [] if neither resolves.
  let branchId: string | null = null;
  let companyId: string | null = null;
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("branch_id, branch:branches!students_branch_id_branches_id_fk(id, parent_id, type)")
    .eq("id", studentId)
    .maybeSingle();
  if (student) {
    branchId = student.branch_id as string | null;
    const br = (student as unknown as { branch: { id: string; parent_id: string | null; type: string } | null }).branch;
    companyId = br?.type === "company" ? br.id : (br?.parent_id ?? null);
  } else {
    const { data: trial } = await supabaseAdmin
      .from("trials")
      .select("branch_id, branch:branches!inner(id, parent_id, type)")
      .eq("id", studentId)
      .maybeSingle();
    if (trial) {
      branchId = trial.branch_id as string | null;
      const br = (trial as unknown as { branch: { id: string; parent_id: string | null; type: string } | null }).branch;
      companyId = br?.type === "company" ? br.id : (br?.parent_id ?? null);
    } else {
      return [];
    }
  }

  // Pull every activity-type event in scope. Filter recurrence + expiry in JS
  // since the rules differ per row.
  const today = new Date().toISOString().slice(0, 10);
  let q = supabaseAdmin
    .from("events")
    .select("*")
    .eq("event_type", "activity")
    .eq("status", "published")
    .is("deleted_at", null);
  // Scope: global OR matching branch OR matching company.
  const scopeFilters: string[] = ["scope.eq.global"];
  if (companyId) scopeFilters.push(`and(scope.eq.company,company_id.eq.${companyId})`);
  if (branchId) scopeFilters.push(`and(scope.eq.branch,branch_id.eq.${branchId})`);
  q = q.or(scopeFilters.join(","));
  const { data: events } = await q;

  // For each event, decide active + compute the "expires on …" label.
  const active: { id: string; title: string; expiresLabel: string | null }[] = [];
  for (const ev of events ?? []) {
    if ((ev as Event).is_recurring) {
      if ((ev as Event).is_bounded) {
        const endDate = (ev as Event).recurring_end_date;
        if (endDate && endDate < today) continue;
        active.push({ id: ev.id as string, title: ev.title as string, expiresLabel: endDate ?? null });
      } else {
        // Open-ended recurring — always active.
        active.push({ id: ev.id as string, title: ev.title as string, expiresLabel: null });
      }
    } else {
      // Specific-dates mode — load this event's occurrences and pick the max
      // date. We do this in one query per event for simplicity; the call site
      // (mark-attendance modal) hits this once per page so the n+1 is bounded.
      const { data: occs } = await supabaseAdmin
        .from("event_occurrences")
        .select("date")
        .eq("event_id", ev.id);
      const lastDate = (occs ?? [])
        .map((r) => r.date as string)
        .sort()
        .at(-1);
      if (!lastDate || lastDate < today) continue;
      active.push({ id: ev.id as string, title: ev.title as string, expiresLabel: lastDate });
    }
  }
  return active;
}
