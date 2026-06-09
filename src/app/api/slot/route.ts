import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { courseId, branchId, slots } = body;

  if (!courseId || !branchId || !slots?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  type IncomingSlot = { day: string; time: string; duration: number; limitStudent: number };

  // Reject duplicates within the submitted batch.
  const seen = new Set<string>();
  for (const s of slots as IncomingSlot[]) {
    const key = `${s.day}|${s.time}`;
    if (seen.has(key)) {
      return NextResponse.json(
        { error: `Duplicate slot in this batch: ${s.day} ${s.time}.` },
        { status: 409 },
      );
    }
    seen.add(key);
  }

  // Reject duplicates against existing rows (same program, branch, day, time).
  const { data: existing } = await supabaseAdmin
    .from("course_slots")
    .select("day, time")
    .eq("course_id", courseId)
    .eq("branch_id", branchId)
    .is("deleted_at", null);

  const existingKeys = new Set((existing ?? []).map((r) => `${r.day}|${normalizeTime(r.time)}`));
  for (const s of slots as IncomingSlot[]) {
    if (existingKeys.has(`${s.day}|${normalizeTime(s.time)}`)) {
      return NextResponse.json(
        { error: `A slot for this program already exists on ${s.day} at ${s.time}.` },
        { status: 409 },
      );
    }
  }

  const rows = (slots as IncomingSlot[]).map((s) => ({
    course_id: courseId,
    branch_id: branchId,
    day: s.day,
    time: s.time,
    duration: s.duration,
    limit_student: s.limitStudent,
  }));

  const { error } = await supabaseAdmin.from("course_slots").insert(rows);

  if (error) {
    console.error("Error creating slots:", error);
    return NextResponse.json({ error: "Failed to create slots" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Postgres `time` round-trips as "HH:MM:SS"; incoming values may be "HH:MM".
// Trim to "HH:MM" so the duplicate-key compare doesn't miss equal times.
function normalizeTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export async function PUT(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { courseId, branchId, originalSlotIds, slots } = body;

  if (!courseId || !branchId || !slots?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Soft-delete original slots that are no longer present
  const newDbIds = new Set(
    slots.filter((s: { id: string | null }) => s.id).map((s: { id: string }) => s.id)
  );
  const toDelete = (originalSlotIds ?? []).filter((id: string) => !newDbIds.has(id));

  if (toDelete.length > 0) {
    await supabaseAdmin
      .from("course_slots")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", toDelete);
  }

  // Duplicate check: every (day, time) in the incoming list must be unique
  // within the batch, and may not collide with any non-deleted existing slot
  // for this (program, branch) — except a slot's own id, which is allowed to
  // keep its current day/time.
  const batchSeen = new Set<string>();
  for (const s of slots as { day: string; time: string }[]) {
    const key = `${s.day}|${normalizeTime(s.time)}`;
    if (batchSeen.has(key)) {
      return NextResponse.json(
        { error: `Duplicate slot in this batch: ${s.day} ${s.time}.` },
        { status: 409 },
      );
    }
    batchSeen.add(key);
  }

  const { data: existingRows } = await supabaseAdmin
    .from("course_slots")
    .select("id, day, time")
    .eq("course_id", courseId)
    .eq("branch_id", branchId)
    .is("deleted_at", null);

  const otherKeys = new Map<string, string>(); // key -> id of the row that owns it
  for (const r of existingRows ?? []) {
    if (toDelete.includes(r.id)) continue;
    otherKeys.set(`${r.day}|${normalizeTime(r.time)}`, r.id as string);
  }
  for (const s of slots as { id: string | null; day: string; time: string }[]) {
    const key = `${s.day}|${normalizeTime(s.time)}`;
    const conflictId = otherKeys.get(key);
    if (conflictId && conflictId !== s.id) {
      return NextResponse.json(
        { error: `A slot for this program already exists on ${s.day} at ${s.time}.` },
        { status: 409 },
      );
    }
  }

  // Update existing slots and insert new ones
  for (const s of slots) {
    if (s.id) {
      // Update existing
      await supabaseAdmin
        .from("course_slots")
        .update({
          day: s.day,
          time: s.time,
          duration: s.duration,
          limit_student: s.limitStudent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", s.id);
    } else {
      // Insert new
      await supabaseAdmin
        .from("course_slots")
        .insert({
          course_id: courseId,
          branch_id: branchId,
          day: s.day,
          time: s.time,
          duration: s.duration,
          limit_student: s.limitStudent,
        });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { slotIds } = body;

  if (!slotIds?.length) {
    return NextResponse.json({ error: "No slots specified" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("course_slots")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", slotIds);

  if (error) {
    console.error("Error deleting slots:", error);
    return NextResponse.json({ error: "Failed to delete slots" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
