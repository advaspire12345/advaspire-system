import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import {
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
  getClientIp,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MINUTES,
} from "@/lib/auth-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Brute-force lockout check before touching auth.
    if (await isLoginLocked(email)) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes or reset your password.`,
        },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await recordLoginFailure(email, getClientIp(request));

      // Re-check so the message reflects this just-recorded failure.
      const locked = await isLoginLocked(email);
      if (locked) {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes or reset your password.`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Success — clear the failure counter.
    await clearLoginFailures(email);

    // Resolve role for the redirect target (mirrors /api/auth/role).
    const authId = signInData.user?.id;
    let role: string | null = null;

    if (authId) {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("auth_id", authId)
        .single();

      if (userRow) {
        role = userRow.role;
      } else {
        const { data: parent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("auth_id", authId)
          .is("deleted_at", null)
          .single();
        if (parent) role = "parent";
      }
    }

    return NextResponse.json({ success: true, role });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
