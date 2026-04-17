import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentFromCookie, verifyPassword } from "@/lib/student-auth";
import { getStudentById } from "@/data/students";
import { transferAdcoins } from "@/data/adcoins";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const studentId = await getStudentFromCookie(
      cookieStore as unknown as RequestCookies
    );
    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, amount, password } = body as {
      receiverId: string;
      amount: number;
      password: string;
    };

    if (!receiverId || !amount || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    if (receiverId === studentId) {
      return NextResponse.json(
        { error: "Cannot transfer to yourself" },
        { status: 400 }
      );
    }

    const sender = await getStudentById(studentId);
    if (!sender || !sender.password_hash) {
      return NextResponse.json(
        { error: "Student not found or no password set" },
        { status: 404 }
      );
    }

    const passwordValid = await verifyPassword(password, sender.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 403 }
      );
    }

    if ((sender.adcoin_balance ?? 0) < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const transaction = await transferAdcoins(studentId, receiverId, amount);
    if (!transaction) {
      return NextResponse.json(
        { error: "Transfer failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, transactionId: transaction.id });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
