import { supabaseAdmin } from "@/db";
import type { SessionTransfer, SessionTransferInsert, SessionTransferStatus } from "@/db/schema";

// ============================================
// READ
// ============================================

export async function getSessionTransferById(id: string): Promise<SessionTransfer | null> {
  const { data } = await supabaseAdmin
    .from("session_transfers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SessionTransfer | null) ?? null;
}

export interface SessionTransferRow {
  transfer: SessionTransfer;
  fromStudentName: string;
  toStudentName: string;
  courseName: string;
}

/**
 * Admin listing: every session transfer, newest first, with denormalized
 * names so the transfers page can render without N+1 queries.
 */
export async function listAllSessionTransfers(): Promise<SessionTransferRow[]> {
  const { data: rows } = await supabaseAdmin
    .from("session_transfers")
    .select(`
      *,
      from_student:students!session_transfers_from_student_id_fkey(name),
      to_student:students!session_transfers_to_student_id_fkey(name),
      course:courses(name)
    `)
    .order("created_at", { ascending: false });

  return (rows ?? []).map((r: any) => ({
    transfer: r as SessionTransfer,
    fromStudentName: r.from_student?.name ?? "",
    toStudentName: r.to_student?.name ?? "",
    courseName: r.course?.name ?? "",
  }));
}

export interface TransferableStudent {
  id: string;
  name: string;
  parentName: string | null;
  courseId: string;
  courseName: string;
  /** Effective available sessions for transfer (pool member count if pooled, else enrollment count). */
  sessionsAvailable: number;
}

/**
 * Admin picker source: every active enrollment grouped per student+course
 * with the effective transfer balance precomputed. Used by both the
 * From-student and To-student selectors on the admin transfer form.
 */
export async function getTransferableStudents(): Promise<TransferableStudent[]> {
  // Pull active enrollments; resolve student + course details in a separate
  // pass so we don't depend on a Supabase FK-hint name that doesn't match.
  const { data: enrollRows } = await supabaseAdmin
    .from("enrollments")
    .select("id, student_id, course_id, sessions_remaining, pool_id")
    .eq("status", "active")
    .is("deleted_at", null);

  const baseRows = (enrollRows ?? []) as Array<{
    id: string;
    student_id: string;
    course_id: string;
    sessions_remaining: number | null;
    pool_id: string | null;
  }>;

  const studentIdSet = Array.from(new Set(baseRows.map((r) => r.student_id)));
  const courseIdSet = Array.from(new Set(baseRows.map((r) => r.course_id)));
  const [studentLookup, courseLookup] = await Promise.all([
    studentIdSet.length === 0
      ? Promise.resolve({ data: [] as Array<{ id: string; name: string }> })
      : supabaseAdmin.from("students").select("id, name").in("id", studentIdSet),
    courseIdSet.length === 0
      ? Promise.resolve({ data: [] as Array<{ id: string; name: string }> })
      : supabaseAdmin.from("courses").select("id, name").in("id", courseIdSet),
  ]);
  const studentMap = new Map<string, string>(
    ((studentLookup.data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]),
  );
  const courseMap = new Map<string, string>(
    ((courseLookup.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );

  const enrollments = baseRows
    .filter((r) => studentMap.has(r.student_id) && courseMap.has(r.course_id))
    .map((r) => ({
      ...r,
      student: { id: r.student_id, name: studentMap.get(r.student_id)! },
      course: { id: r.course_id, name: courseMap.get(r.course_id)! },
    }));

  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  const parentByStudent = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from("parent_students")
      .select("student_id, parent:parents(name)")
      .in("student_id", studentIds);
    (links ?? []).forEach((l: any) => {
      if (l.parent?.name) parentByStudent.set(l.student_id, l.parent.name);
    });
  }

  const poolPairs = enrollments
    .filter((e) => e.pool_id)
    .map((e) => ({ pool_id: e.pool_id!, student_id: e.student_id }));
  const poolBalance = new Map<string, number>();
  if (poolPairs.length > 0) {
    const poolIds = Array.from(new Set(poolPairs.map((p) => p.pool_id)));
    const memberStudentIds = Array.from(new Set(poolPairs.map((p) => p.student_id)));
    const { data: members } = await supabaseAdmin
      .from("pool_students")
      .select("pool_id, student_id, sessions_remaining")
      .in("pool_id", poolIds)
      .in("student_id", memberStudentIds);
    (members ?? []).forEach((m: any) => {
      poolBalance.set(`${m.pool_id}:${m.student_id}`, m.sessions_remaining ?? 0);
    });
  }

  return enrollments
    .filter((e) => e.student && e.course)
    .map((e) => {
      const balance = e.pool_id
        ? poolBalance.get(`${e.pool_id}:${e.student_id}`) ?? 0
        : e.sessions_remaining ?? 0;
      return {
        id: e.student!.id,
        name: e.student!.name,
        parentName: parentByStudent.get(e.student_id) ?? null,
        courseId: e.course!.id,
        courseName: e.course!.name,
        sessionsAvailable: balance,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Transfers awaiting the sender's parent approval, joined to the from-student
 * info so the card on `/parent` can show "Approve giving N sessions to X?".
 */
export async function getPendingSenderTransfersForParent(parentUserId: string): Promise<
  Array<{
    transfer: SessionTransfer;
    fromStudentName: string;
    toStudentName: string;
    courseName: string;
  }>
> {
  // Load every transfer in pending_sender state whose from_student is owned
  // by this parent. We resolve parent → students via parent_students join.
  const { data: parentRow } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("auth_id", parentUserId)
    .maybeSingle();
  if (!parentRow) return [];

  const { data: parentStudents } = await supabaseAdmin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentRow.id);
  const studentIds = (parentStudents ?? []).map((r) => r.student_id);
  if (studentIds.length === 0) return [];

  const { data: rows } = await supabaseAdmin
    .from("session_transfers")
    .select(`
      *,
      from_student:students!session_transfers_from_student_id_fkey(name),
      to_student:students!session_transfers_to_student_id_fkey(name),
      course:courses(name)
    `)
    .eq("status", "pending_sender")
    .in("from_student_id", studentIds);

  return (rows ?? []).map((r: any) => ({
    transfer: r as SessionTransfer,
    fromStudentName: r.from_student?.name ?? "",
    toStudentName: r.to_student?.name ?? "",
    courseName: r.course?.name ?? "",
  }));
}

/**
 * Transfers awaiting the receiver's parent acceptance.
 */
export async function getPendingReceiverTransfersForParent(parentUserId: string): Promise<
  Array<{
    transfer: SessionTransfer;
    fromStudentName: string;
    toStudentName: string;
    courseName: string;
  }>
> {
  const { data: parentRow } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("auth_id", parentUserId)
    .maybeSingle();
  if (!parentRow) return [];
  const { data: parentStudents } = await supabaseAdmin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentRow.id);
  const studentIds = (parentStudents ?? []).map((r) => r.student_id);
  if (studentIds.length === 0) return [];

  const { data: rows } = await supabaseAdmin
    .from("session_transfers")
    .select(`
      *,
      from_student:students!session_transfers_from_student_id_fkey(name),
      to_student:students!session_transfers_to_student_id_fkey(name),
      course:courses(name)
    `)
    .eq("status", "pending_receiver")
    .in("to_student_id", studentIds);

  return (rows ?? []).map((r: any) => ({
    transfer: r as SessionTransfer,
    fromStudentName: r.from_student?.name ?? "",
    toStudentName: r.to_student?.name ?? "",
    courseName: r.course?.name ?? "",
  }));
}

// ============================================
// WRITE — admin creates, parents approve / accept
// ============================================

export async function createSessionTransfer(
  payload: SessionTransferInsert,
): Promise<SessionTransfer | null> {
  // Validate: same course constraint. From-student must currently have at
  // least `sessions` sessions available (pool or individual).
  const { data: fromEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, sessions_remaining, pool_id")
    .eq("student_id", payload.from_student_id)
    .eq("course_id", payload.course_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!fromEnrollment) {
    throw new Error("Sender has no active enrollment for this course.");
  }
  const { data: toEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("student_id", payload.to_student_id)
    .eq("course_id", payload.course_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!toEnrollment) {
    throw new Error("Receiver has no active enrollment for this course.");
  }

  // Sender balance check (against pool if pooled, else enrollment).
  let availableSessions = fromEnrollment.sessions_remaining ?? 0;
  if (fromEnrollment.pool_id) {
    const { data: poolMember } = await supabaseAdmin
      .from("pool_students")
      .select("sessions_remaining")
      .eq("pool_id", fromEnrollment.pool_id)
      .eq("student_id", payload.from_student_id)
      .maybeSingle();
    availableSessions = poolMember?.sessions_remaining ?? 0;
  }
  if (availableSessions < payload.sessions) {
    throw new Error(`Sender only has ${availableSessions} sessions available.`);
  }

  const { data, error } = await supabaseAdmin
    .from("session_transfers")
    .insert({
      from_student_id: payload.from_student_id,
      to_student_id: payload.to_student_id,
      course_id: payload.course_id,
      sessions: payload.sessions,
      status: "pending_sender" as SessionTransferStatus,
      created_by: payload.created_by ?? null,
      notes: payload.notes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[createSessionTransfer] insert failed:", error);
    return null;
  }
  return data as SessionTransfer;
}

export async function senderApprove(transferId: string): Promise<void> {
  await supabaseAdmin
    .from("session_transfers")
    .update({
      status: "pending_receiver" as SessionTransferStatus,
      sender_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId)
    .eq("status", "pending_sender");
}

export async function receiverAccept(transferId: string): Promise<void> {
  // Mark accepted, then run executeTransfer atomically.
  await supabaseAdmin
    .from("session_transfers")
    .update({
      receiver_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId)
    .eq("status", "pending_receiver");
  await executeTransfer(transferId);
}

export async function cancelSessionTransfer(
  transferId: string,
  role: "sender" | "receiver" | "admin",
): Promise<void> {
  await supabaseAdmin
    .from("session_transfers")
    .update({
      status: "cancelled" as SessionTransferStatus,
      cancelled_by_role: role,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId)
    .in("status", ["pending_sender", "pending_receiver"]);
}

/**
 * Move `sessions` from sender → receiver. Routes through pool counts if
 * pooled, else through `enrollments.sessions_remaining`. Idempotent: bails
 * if status isn't 'pending_receiver' and re-fetched.
 */
async function executeTransfer(transferId: string): Promise<void> {
  const transfer = await getSessionTransferById(transferId);
  if (!transfer) return;
  if (transfer.status !== "pending_receiver") return;

  // Sender deduct ------------------------------------------------------
  const { data: senderEnr } = await supabaseAdmin
    .from("enrollments")
    .select("id, sessions_remaining, pool_id")
    .eq("student_id", transfer.from_student_id)
    .eq("course_id", transfer.course_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!senderEnr) {
    console.warn("[executeTransfer] sender enrollment missing for", transferId);
    return;
  }
  if (senderEnr.pool_id) {
    const { data: poolMember } = await supabaseAdmin
      .from("pool_students")
      .select("id, sessions_remaining")
      .eq("pool_id", senderEnr.pool_id)
      .eq("student_id", transfer.from_student_id)
      .maybeSingle();
    if (poolMember) {
      await supabaseAdmin
        .from("pool_students")
        .update({ sessions_remaining: (poolMember.sessions_remaining ?? 0) - transfer.sessions })
        .eq("id", poolMember.id);
    }
  } else {
    await supabaseAdmin
      .from("enrollments")
      .update({
        sessions_remaining: (senderEnr.sessions_remaining ?? 0) - transfer.sessions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", senderEnr.id);
  }

  // Receiver credit ----------------------------------------------------
  const { data: receiverEnr } = await supabaseAdmin
    .from("enrollments")
    .select("id, sessions_remaining, pool_id")
    .eq("student_id", transfer.to_student_id)
    .eq("course_id", transfer.course_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!receiverEnr) {
    console.warn("[executeTransfer] receiver enrollment missing for", transferId);
    return;
  }
  if (receiverEnr.pool_id) {
    const { data: poolMember } = await supabaseAdmin
      .from("pool_students")
      .select("id, sessions_remaining")
      .eq("pool_id", receiverEnr.pool_id)
      .eq("student_id", transfer.to_student_id)
      .maybeSingle();
    if (poolMember) {
      await supabaseAdmin
        .from("pool_students")
        .update({ sessions_remaining: (poolMember.sessions_remaining ?? 0) + transfer.sessions })
        .eq("id", poolMember.id);
    }
  } else {
    await supabaseAdmin
      .from("enrollments")
      .update({
        sessions_remaining: (receiverEnr.sessions_remaining ?? 0) + transfer.sessions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiverEnr.id);
  }

  // Mark executed -------------------------------------------------------
  await supabaseAdmin
    .from("session_transfers")
    .update({
      status: "executed" as SessionTransferStatus,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);
}
