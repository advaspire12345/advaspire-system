import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/data/users";
import {
  createSessionTransfer,
  senderApprove,
  receiverAccept,
  cancelSessionTransfer,
  getSessionTransferById,
} from "@/data/session-transfers";
import { supabaseAdmin } from "@/db";

/**
 * Admin-only: create a session transfer between two students (any parents).
 *
 *   POST { from_student_id, to_student_id, course_id, sessions, notes? }
 *
 * No price, no admin approval. The created row enters status='pending_sender'
 * and shows up on the sender-parent's portal for approval.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const me = await getUserByAuthId(user.id);
    if (!me || !["super_admin", "group_admin", "company_admin", "assistant_admin"].includes(me.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      from_student_id?: string;
      to_student_id?: string;
      course_id?: string;
      sessions?: number;
      notes?: string;
    };
    if (!body.from_student_id || !body.to_student_id || !body.course_id || !body.sessions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (body.from_student_id === body.to_student_id) {
      return NextResponse.json({ error: "From and to must be different students" }, { status: 400 });
    }
    if (body.sessions <= 0) {
      return NextResponse.json({ error: "Sessions must be > 0" }, { status: 400 });
    }

    const created = await createSessionTransfer({
      from_student_id: body.from_student_id,
      to_student_id: body.to_student_id,
      course_id: body.course_id,
      sessions: body.sessions,
      created_by: me.id,
      notes: body.notes ?? null,
    });
    if (!created) {
      return NextResponse.json({ error: "Failed to create transfer" }, { status: 500 });
    }
    revalidatePath("/parent");
    revalidatePath("/transactions");
    return NextResponse.json({ ok: true, transfer: created });
  } catch (err) {
    console.error("[POST /session-transfers]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

/**
 * Parent action endpoint.
 *
 *   PATCH { id, action: 'approve' | 'accept' | 'reject' }
 *
 * - approve: sender's parent — moves status pending_sender → pending_receiver.
 * - accept:  receiver's parent — moves pending_receiver → executed and runs the deduct/credit.
 * - reject:  either party — moves to cancelled.
 *
 * Auth: caller must own the relevant student (from_student for approve/reject-as-sender,
 * to_student for accept/reject-as-receiver). Admin can also cancel.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string; action?: string };
    if (!body.id || !body.action) {
      return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
    }
    const transfer = await getSessionTransferById(body.id);
    if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });

    // Resolve which student the caller represents.
    const { data: parentRow } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    const { data: parentStudents } = parentRow
      ? await supabaseAdmin.from("parent_students").select("student_id").eq("parent_id", parentRow.id)
      : { data: [] };
    const studentIds = new Set((parentStudents ?? []).map((r) => r.student_id));
    const isSender = studentIds.has(transfer.from_student_id);
    const isReceiver = studentIds.has(transfer.to_student_id);

    if (body.action === "approve") {
      if (!isSender) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (transfer.status !== "pending_sender") {
        return NextResponse.json({ error: `Cannot approve in status ${transfer.status}` }, { status: 400 });
      }
      await senderApprove(body.id);
    } else if (body.action === "accept") {
      if (!isReceiver) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (transfer.status !== "pending_receiver") {
        return NextResponse.json({ error: `Cannot accept in status ${transfer.status}` }, { status: 400 });
      }
      await receiverAccept(body.id);
    } else if (body.action === "reject") {
      // Both sides can reject; admins can also cancel via this route.
      const me = await getUserByAuthId(user.id);
      const isAdmin = me && ["super_admin", "group_admin", "company_admin", "assistant_admin"].includes(me.role);
      const role: "sender" | "receiver" | "admin" = isSender ? "sender" : isReceiver ? "receiver" : isAdmin ? "admin" : "sender";
      if (!isSender && !isReceiver && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await cancelSessionTransfer(body.id, role);
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    revalidatePath("/parent");
    revalidatePath("/transactions");
    revalidatePath("/student");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /session-transfers]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
