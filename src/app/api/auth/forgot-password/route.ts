import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isResetLimited,
  recordResetSend,
  getClientIp,
  RESET_MAX_SENDS,
  RESET_WINDOW_MINUTES,
} from "@/lib/auth-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Spam guard: max RESET_MAX_SENDS per RESET_WINDOW_MINUTES.
    if (await isResetLimited(email)) {
      return NextResponse.json(
        {
          error: `You can only request ${RESET_MAX_SENDS} password reset emails every ${RESET_WINDOW_MINUTES} minutes. Please try again later.`,
        },
        { status: 429 }
      );
    }

    // Record the send before dispatching so concurrent requests count too.
    await recordResetSend(email, getClientIp(request));

    const origin =
      request.headers.get("origin") ?? new URL(request.url).origin;

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // Always return generic success to avoid email-enumeration.
    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a password reset link has been sent. Please check your inbox.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
