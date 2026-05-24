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
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      // Skip template example rows
      if ((row.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE")) {
        skipped++;
        continue;
      }

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

        // 1. Find student by student_id — case-insensitive so legacy IDs
        // like "Adv24001" still match "ADV24001" in the DB.
        const { data: student } = await supabaseAdmin
          .from("students")
          .select("id, adcoin_balance")
          .ilike("student_id", row.student_id.trim())
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

        // 4. Insert attendance record.
        //   - `activity` CSV column → `last_activity` DB column (the field
        //     labelled "Activity Completed" in the mark-attendance modal).
        //   - `time` CSV column → `actual_start_time` (HH:MM 24-hour).
        //   - `notes` stays as notes.
        // Normalise time to HH:MM:SS so it matches the postgres `time` type.
        let actualStartTime: string | null = null;
        const rawTime = row.time?.trim();
        if (rawTime) {
          const m = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (!m) {
            throw new Error(`time "${rawTime}" is invalid — use HH:MM (24-hour)`);
          }
          actualStartTime = `${String(m[1]).padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
        }

        // `absence_reason` is the new column name. Accept legacy `notes` too
        // so any CSVs built before the rename keep working. Either value goes
        // into the DB's `notes` column (which the absent flow reads as the
        // "Reason" field in the UI).
        const absenceReason = row.absence_reason?.trim() || row.notes?.trim() || null;

        // Dedup: skip if an attendance row already exists for this
        // (enrollment, date, time). Same student + same date + same time =
        // duplicate. Same date with DIFFERENT time = a separate valid session
        // (multi-slot same-day attendance), so create it.
        const date = row.date.trim();
        let dupQuery = supabaseAdmin
          .from("attendance")
          .select("id")
          .eq("enrollment_id", enrollment.id)
          .eq("date", date);
        dupQuery = actualStartTime
          ? dupQuery.eq("actual_start_time", actualStartTime)
          : dupQuery.is("actual_start_time", null);
        const { data: existingAtt } = await dupQuery.limit(1).maybeSingle();
        if (existingAtt) {
          skipped++;
          continue;
        }

        const { error: attendanceError } = await supabaseAdmin
          .from("attendance")
          .insert({
            enrollment_id: enrollment.id,
            date,
            actual_start_time: actualStartTime,
            status,
            // class_type is CHECK-constrained to exactly "Physical" or
            // "Online" (Title case). Normalise so any casing the user types
            // ends up matching — "physical"/"PHYSICAL"/"Physical" all → "Physical".
            class_type: (() => {
              const raw = row.class_type?.trim();
              if (!raw) return null;
              const lower = raw.toLowerCase();
              if (lower === "physical") return "Physical";
              if (lower === "online") return "Online";
              return null;
            })(),
            instructor_name: row.instructor_name?.trim() || null,
            lesson: row.lesson?.trim() || null,
            mission: row.mission?.trim() || null,
            last_activity: row.activity?.trim() || null,
            adcoin,
            notes: absenceReason,
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

    return NextResponse.json({ success, failed, skipped, errors });
  } catch (error) {
    console.error("Import attendance error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
