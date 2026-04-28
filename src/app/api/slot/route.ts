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

  const rows = slots.map((s: { day: string; time: string; duration: number; limitStudent: number }) => ({
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
