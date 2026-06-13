import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the link from Supabase auth emails (password recovery, email confirm, etc.)
// It verifies the one-time token server-side, sets the session cookies, then
// redirects the user to the appropriate page.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/reset-password';

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Verification failed (expired / already used / invalid) — send back to login
  // with a flag so the UI can prompt the user to request a fresh link.
  return NextResponse.redirect(new URL('/login?error=invalid_reset_link', request.url));
}
