import { NextResponse } from "next/server";
import { getStudentByUsername } from "@/data/students";
import {
  verifyPassword,
  signStudentToken,
  setStudentCookie,
} from "@/lib/student-auth";

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

    if (!student || !student.password_hash) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, student.password_hash);

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
