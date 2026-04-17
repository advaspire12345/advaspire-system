import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getParentByAuthId } from "@/data/parents";
import { supabaseAdmin } from "@/db";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parent = await getParentByAuthId(user.id);
  if (!parent) return NextResponse.json({ error: "Not a parent" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("parent_events")
    .select("*")
    .eq("parent_id", parent.id)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map((e: any) => ({
      id: e.id,
      parentId: e.parent_id,
      title: e.title,
      date: e.date,
      endDate: e.end_date ?? null,
      startTime: e.start_time,
      endTime: e.end_time,
      color: e.color ?? "#615DFA",
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parent = await getParentByAuthId(user.id);
  if (!parent) return NextResponse.json({ error: "Not a parent" }, { status: 403 });

  const body = await req.json();
  const { title, date, endDate, startTime, endTime, color } = body;

  if (!title || !date || !startTime) {
    return NextResponse.json({ error: "Title, date, and start time are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("parent_events")
    .insert({
      parent_id: parent.id,
      title,
      date,
      end_date: endDate || null,
      start_time: startTime,
      end_time: endTime || null,
      color: color || "#615DFA",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    parentId: data.parent_id,
    title: data.title,
    date: data.date,
    endDate: data.end_date ?? null,
    startTime: data.start_time,
    endTime: data.end_time,
    color: data.color,
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parent = await getParentByAuthId(user.id);
  if (!parent) return NextResponse.json({ error: "Not a parent" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("parent_events")
    .delete()
    .eq("id", eventId)
    .eq("parent_id", parent.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
