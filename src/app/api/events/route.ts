import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/data/users";
import { getParentByAuthId } from "@/data/parents";
import { getStudentFromCookie } from "@/lib/student-auth";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import {
  getEventsForCaller,
  createEvent,
  updateEvent,
  softDeleteEvent,
  approveEvent,
  rejectEvent,
  type EventCaller,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/data/events";

async function resolveCaller(): Promise<EventCaller | null> {
  // Student cookie path (no Supabase auth)
  const cookieStore = await cookies();
  const studentId = await getStudentFromCookie(
    cookieStore as unknown as RequestCookies,
  );
  if (studentId) return { kind: "student", studentId };

  const authUser = await getUser();
  if (!authUser) return null;

  const staff = await getUserByAuthId(authUser.id);
  if (staff) {
    return {
      kind: "staff",
      userId: staff.id,
      role: staff.role,
      branchId: staff.branch_id ?? null,
    };
  }

  const parent = await getParentByAuthId(authUser.id);
  if (parent) return { kind: "parent", parentId: parent.id };

  return null;
}

export async function GET(req: NextRequest) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const events = await getEventsForCaller(caller, { from, to });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const required = ["title", "event_type", "scope"] as const;
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
  }

  // Either occurrences[] (specific-dates mode) or recurrence config must be
  // present — createEvent enforces the full shape, this is the cheap gate.
  if (!body.is_recurring && (!Array.isArray(body.occurrences) || body.occurrences.length === 0)) {
    return NextResponse.json({ error: "Missing occurrences" }, { status: 400 });
  }

  const input: CreateEventInput = {
    title: String(body.title),
    description: body.description ?? null,
    event_type: body.event_type,
    scope: body.scope,
    audience: body.audience,
    color: body.color,
    branch_id: body.branch_id ?? null,
    company_id: body.company_id ?? null,
    occurrences: Array.isArray(body.occurrences) ? body.occurrences : undefined,
    is_recurring: body.is_recurring === true,
    is_bounded: body.is_bounded === true,
    recurring_days: body.recurring_days ?? null,
    recurring_start_date: body.recurring_start_date ?? null,
    recurring_end_date: body.recurring_end_date ?? null,
    recurring_start_time: body.recurring_start_time ?? null,
    recurring_end_time: body.recurring_end_time ?? null,
  };

  const res = await createEvent(caller, input);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ event: res.event });
}

export async function PATCH(req: NextRequest) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Approval actions are signalled by action: 'approve' | 'reject'
  if (body.action === "approve") {
    const res = await approveEvent(caller, String(body.id));
    return res.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: res.error }, { status: 403 });
  }
  if (body.action === "reject") {
    const res = await rejectEvent(caller, String(body.id), String(body.reason ?? ""));
    return res.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: res.error }, { status: 403 });
  }

  const update: UpdateEventInput = {};
  if (body.title !== undefined) update.title = String(body.title);
  if (body.description !== undefined) update.description = body.description;
  if (body.event_type !== undefined) update.event_type = body.event_type;
  if (body.scope !== undefined) update.scope = body.scope;
  if (body.audience !== undefined) update.audience = body.audience;
  if (body.color !== undefined) update.color = body.color;
  if (body.branch_id !== undefined) update.branch_id = body.branch_id;
  if (body.company_id !== undefined) update.company_id = body.company_id;
  // Scheduling — pass through the same fields createEvent understands. If
  // any one is provided, updateEvent treats the full bundle as the source.
  if (body.occurrences !== undefined) update.occurrences = body.occurrences;
  if (body.is_recurring !== undefined) update.is_recurring = body.is_recurring === true;
  if (body.is_bounded !== undefined) update.is_bounded = body.is_bounded === true;
  if (body.recurring_days !== undefined) update.recurring_days = body.recurring_days ?? null;
  if (body.recurring_start_date !== undefined) update.recurring_start_date = body.recurring_start_date ?? null;
  if (body.recurring_end_date !== undefined) update.recurring_end_date = body.recurring_end_date ?? null;
  if (body.recurring_start_time !== undefined) update.recurring_start_time = body.recurring_start_time ?? null;
  if (body.recurring_end_time !== undefined) update.recurring_end_time = body.recurring_end_time ?? null;

  const res = await updateEvent(caller, String(body.id), update);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ event: res.event });
}

export async function DELETE(req: NextRequest) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");
  if (!eventId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const res = await softDeleteEvent(caller, eventId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
