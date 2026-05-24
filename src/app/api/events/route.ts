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

  const required = ["title", "event_type", "scope", "date"] as const;
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
  }

  const input: CreateEventInput = {
    title: String(body.title),
    description: body.description ?? null,
    event_type: body.event_type,
    scope: body.scope,
    audience: body.audience,
    date: body.date,
    end_date: body.end_date ?? null,
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    color: body.color,
    branch_id: body.branch_id ?? null,
    company_id: body.company_id ?? null,
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
  if (body.date !== undefined) update.date = body.date;
  if (body.end_date !== undefined) update.end_date = body.end_date;
  if (body.start_time !== undefined) update.start_time = body.start_time;
  if (body.end_time !== undefined) update.end_time = body.end_time;
  if (body.color !== undefined) update.color = body.color;
  if (body.branch_id !== undefined) update.branch_id = body.branch_id;
  if (body.company_id !== undefined) update.company_id = body.company_id;

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
