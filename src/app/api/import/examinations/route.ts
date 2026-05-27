import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

interface ExamRow {
  student_id: string;
  exam_name: string;
  exam_level: string;
  exam_date: string;
  status: string;
  mark?: string;
  reattempt_count?: string;
  examiner_email?: string;
  certificate_number?: string;
  notes?: string;
}

const VALID_STATUSES = new Set([
  "eligible", "scheduled", "in_progress", "pass", "fail", "absent",
]);

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = (await request.json()) as { rows: Record<string, string>[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Track certificate numbers seen in THIS upload (case-insensitive). Any
    // duplicate within the file is rejected even before hitting the DB —
    // we don't want two different exam rows fighting over the same cert no.
    const certsInFile = new Map<string, number>(); // upper-cased cert → row index

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as ExamRow;
      const rowIndex = i + 1;

      if ((row.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE")) {
        skipped++;
        continue;
      }

      try {
        if (!row.student_id?.trim()) throw new Error("student_id is required");
        if (!row.exam_name?.trim()) throw new Error("exam_name is required");
        if (!row.exam_level?.trim()) throw new Error("exam_level is required");
        if (!row.exam_date?.trim()) throw new Error("exam_date is required");
        if (!row.status?.trim()) throw new Error("status is required");

        const examLevel = parseInt(row.exam_level.trim(), 10);
        if (isNaN(examLevel)) {
          throw new Error(`exam_level "${row.exam_level}" must be an integer`);
        }

        const status = row.status.trim().toLowerCase();
        if (!VALID_STATUSES.has(status)) {
          throw new Error(
            `Invalid status "${row.status}" — use one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          );
        }

        // Optional mark
        let mark: number | null = null;
        if (row.mark?.trim()) {
          mark = parseInt(row.mark.trim(), 10);
          if (isNaN(mark)) {
            throw new Error(`mark "${row.mark}" must be an integer`);
          }
        }

        // Optional reattempt_count (default 0)
        let reattemptCount = 0;
        if (row.reattempt_count?.trim()) {
          reattemptCount = parseInt(row.reattempt_count.trim(), 10);
          if (isNaN(reattemptCount) || reattemptCount < 0) {
            throw new Error(`reattempt_count "${row.reattempt_count}" must be a non-negative integer`);
          }
        }

        // Resolve student (case-insensitive) — also pick up enrollment_id
        // (the latest active one for this student) since examinations
        // optionally reference it.
        const { data: student } = await supabaseAdmin
          .from("students")
          .select("id")
          .ilike("student_id", row.student_id.trim())
          .maybeSingle();
        if (!student) {
          throw new Error(`Student not found: ${row.student_id}`);
        }
        const { data: enrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("student_id", student.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Resolve examiner (optional — by email, case-insensitive)
        let examinerId: string | null = null;
        if (row.examiner_email?.trim()) {
          const { data: examiner } = await supabaseAdmin
            .from("users")
            .select("id")
            .ilike("email", row.examiner_email.trim())
            .maybeSingle();
          if (!examiner) {
            throw new Error(`examiner_email "${row.examiner_email}" not found`);
          }
          examinerId = examiner.id;
        }

        // Certificate number rules:
        //   1. Only `pass` rows can have a cert number. fail / absent /
        //      scheduled / in_progress / eligible should NOT carry one —
        //      it implies the student passed.
        //   2. Must be unique across the existing examinations table.
        //   3. Must be unique within THIS upload (no two rows competing).
        // Comparison is case-insensitive (CERT-2026-001 == cert-2026-001).
        const certRaw = row.certificate_number?.trim();
        if (certRaw) {
          const certKey = certRaw.toUpperCase();
          if (status !== "pass") {
            throw new Error(
              `certificate_number "${certRaw}" is only allowed when status=pass (this row's status=${status}). Leave blank for fail/absent/scheduled rows.`,
            );
          }
          const dupRowInFile = certsInFile.get(certKey);
          if (dupRowInFile !== undefined) {
            throw new Error(
              `certificate_number "${certRaw}" is also used in row ${dupRowInFile} of this file. Each cert number must be unique.`,
            );
          }
          const { data: certExists } = await supabaseAdmin
            .from("examinations")
            .select("id, student_id, students!inner(student_id, name)")
            .ilike("certificate_number", certRaw)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();
          if (certExists) {
            const otherStu = (certExists as unknown as { students: { student_id: string; name: string } }).students;
            throw new Error(
              `certificate_number "${certRaw}" is already taken by ${otherStu.student_id} (${otherStu.name}). Pick a different unused certificate number.`,
            );
          }
          certsInFile.set(certKey, rowIndex);
        }

        // Dedup — same (student, exam_name, exam_level, exam_date,
        // reattempt_count) = the same exam attempt. Skip on re-upload.
        const { data: existing } = await supabaseAdmin
          .from("examinations")
          .select("id")
          .eq("student_id", student.id)
          .ilike("exam_name", row.exam_name.trim())
          .eq("exam_level", examLevel)
          .eq("exam_date", row.exam_date.trim())
          .eq("reattempt_count", reattemptCount)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        const { error: insertError } = await supabaseAdmin
          .from("examinations")
          .insert({
            student_id: student.id,
            enrollment_id: enrollment?.id ?? null,
            exam_name: row.exam_name.trim(),
            exam_level: examLevel,
            reattempt_count: reattemptCount,
            mark,
            notes: row.notes?.trim() || null,
            examiner_id: examinerId,
            exam_date: row.exam_date.trim(),
            certificate_number: row.certificate_number?.trim() || null,
            status,
          });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        success++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Unknown error";
        const sid = row.student_id?.trim();
        const label = sid ? `Row ${rowIndex} (${sid})` : `Row ${rowIndex}`;
        errors.push(`${label}: ${message}`);
      }
    }

    revalidatePath("/examinations");

    return NextResponse.json({ success, failed, skipped, errors });
  } catch (error) {
    console.error("Import examinations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
