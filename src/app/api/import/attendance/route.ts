import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = (await request.json()) as {
      rows: Record<string, string>[];
    };

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        // Validate required fields
        if (!row.student_id?.trim()) {
          throw new Error("student_id is required");
        }
        if (!row.date?.trim()) {
          throw new Error("date is required");
        }
        if (!row.status?.trim()) {
          throw new Error("status is required");
        }

        const status = row.status.trim().toLowerCase();
        if (!["present", "absent", "late", "excused"].includes(status)) {
          throw new Error(
            `Invalid status "${status}". Must be present, absent, late, or excused`
          );
        }

        // 1. Find student by student_id
        const { data: student } = await supabaseAdmin
          .from("students")
          .select("id, adcoin_balance")
          .eq("student_id", row.student_id.trim())
          .maybeSingle();

        if (!student) {
          throw new Error(
            `Student not found with ID: ${row.student_id.trim()}`
          );
        }

        // 2. Find their enrollment
        const { data: enrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("student_id", student.id)
          .limit(1)
          .maybeSingle();

        if (!enrollment) {
          throw new Error(
            `No enrollment found for student: ${row.student_id.trim()}`
          );
        }

        // 3. Parse adcoin value
        const adcoinValue = row.adcoin?.trim()
          ? parseFloat(row.adcoin.trim())
          : 0;
        const adcoin = isNaN(adcoinValue) ? 0 : adcoinValue;

        // 4. Insert attendance record
        const { error: attendanceError } = await supabaseAdmin
          .from("attendance")
          .insert({
            enrollment_id: enrollment.id,
            date: row.date.trim(),
            status,
            class_type: row.class_type?.trim() || null,
            instructor_name: row.instructor_name?.trim() || null,
            lesson: row.lesson?.trim() || null,
            mission: row.mission?.trim() || null,
            adcoin,
            notes: row.notes?.trim() || null,
          });

        if (attendanceError) {
          throw new Error(
            `Failed to insert attendance: ${attendanceError.message}`
          );
        }

        // 5. If adcoin > 0, update student's adcoin_balance
        if (adcoin > 0) {
          await supabaseAdmin
            .from("students")
            .update({
              adcoin_balance: (student.adcoin_balance || 0) + adcoin,
            })
            .eq("id", student.id);
        }

        success++;
      } catch (err) {
        failed++;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowIndex}: ${message}`);
      }
    }

    revalidatePath("/attendance-log");

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error("Import attendance error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
