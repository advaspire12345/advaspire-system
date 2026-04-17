import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  // If not found in users table, check parents table
  if (!data) {
    const { data: parent } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("auth_id", user.id)
      .is("deleted_at", null)
      .single();

    if (parent) {
      return NextResponse.json({ role: "parent" });
    }

    return NextResponse.json({ role: null });
  }

  return NextResponse.json({ role: data.role });
}
