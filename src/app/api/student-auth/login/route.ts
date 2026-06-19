import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStudentByUsername } from "@/data/students";
import {
  verifyPassword,
  signStudentToken,
  setStudentCookie,
} from "@/lib/student-auth";

const STUDENT_EMAIL_DOMAIN = "student.advaspire.com";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const student = await getStudentByUsername(username);

    if (!student) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Unified auth: students are Supabase Auth users with the synthetic email
    // <lower(student_id)>@student.advaspire.com. Verify the password against
    // Supabase using a throwaway client (we keep the existing JWT cookie for the
    // student portal session). Legacy students without an auth_id fall back to
    // the local password_hash.
    let valid = false;
    if (student.auth_id && student.student_id) {
      const email = `${student.student_id.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
      const verifier = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { error } = await verifier.auth.signInWithPassword({ email, password });
      valid = !error;
    } else if (student.password_hash) {
      valid = await verifyPassword(password, student.password_hash);
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await signStudentToken(student.id);
    const response = NextResponse.json({
      success: true,
      student: { id: student.id, name: student.name },
    });

    setStudentCookie(response, token);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
