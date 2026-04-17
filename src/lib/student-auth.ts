import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

const COOKIE_NAME = "student_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET || "student-jwt-secret-change-me"
);

// ============================================
// PASSWORD UTILITIES
// ============================================

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ============================================
// JWT UTILITIES
// ============================================

export async function signStudentToken(studentId: string): Promise<string> {
  return new SignJWT({ studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyStudentToken(
  token: string
): Promise<{ studentId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.studentId === "string") {
      return { studentId: payload.studentId };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// COOKIE HELPERS
// ============================================

export function setStudentCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getStudentFromCookie(
  cookies: RequestCookies
): Promise<string | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await verifyStudentToken(token);
  return result?.studentId ?? null;
}

export function clearStudentCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
