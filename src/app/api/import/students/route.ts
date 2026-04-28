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

    // Get branch from logged-in user
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("branch_id")
      .eq("auth_id", user.id)
      .single();

    if (!dbUser?.branch_id) {
      return NextResponse.json(
        { error: "User has no branch assigned" },
        { status: 400 }
      );
    }

    const branchId = dbUser.branch_id;

    // Get branch code for student ID generation
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("code")
      .eq("id", branchId)
      .single();

    const branchCode = branch?.code || "000";
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `ADV-${branchCode}-${year}`;

    // Get current max sequence for this prefix
    const { data: latestStudent } = await supabaseAdmin
      .from("students")
      .select("student_id")
      .like("student_id", `${prefix}%`)
      .order("student_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sequence = 1;
    if (latestStudent?.student_id) {
      const lastSeq = parseInt(latestStudent.student_id.slice(-3), 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      try {
        // Validate required fields
        if (!row.student_name?.trim()) {
          throw new Error("student_name is required");
        }
        if (!row.parent_name?.trim()) {
          throw new Error("parent_name is required");
        }
        if (!row.parent_email?.trim()) {
          throw new Error("parent_email is required");
        }

        // 1. Check if parent exists by email → create or reuse
        const parentEmail = row.parent_email.trim().toLowerCase();
        const { data: existingParent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("email", parentEmail)
          .is("deleted_at", null)
          .maybeSingle();

        let parentId: string;

        if (existingParent) {
          parentId = existingParent.id;
        } else {
          const { data: newParent, error: parentError } = await supabaseAdmin
            .from("parents")
            .insert({
              name: row.parent_name.trim(),
              email: parentEmail,
              phone: row.parent_phone?.trim() || null,
              address: row.parent_address?.trim() || null,
              city: row.parent_city?.trim() || null,
            })
            .select("id")
            .single();

          if (parentError || !newParent) {
            throw new Error(`Failed to create parent: ${parentError?.message}`);
          }
          parentId = newParent.id;
        }

        // 2. Generate student ID
        const studentId = `${prefix}${sequence.toString().padStart(3, "0")}`;
        sequence++;

        // 3. Create student
        const { data: newStudent, error: studentError } = await supabaseAdmin
          .from("students")
          .insert({
            student_id: studentId,
            name: row.student_name.trim(),
            date_of_birth: row.date_of_birth?.trim() || null,
            gender: row.gender?.trim() || null,
            school_name: row.school_name?.trim() || null,
            branch_id: branchId,
            level: 1,
            adcoin_balance: 0,
          })
          .select("id")
          .single();

        if (studentError || !newStudent) {
          throw new Error(
            `Failed to create student: ${studentError?.message}`
          );
        }

        // 4. Link parent to student
        await supabaseAdmin.from("parent_students").insert({
          parent_id: parentId,
          student_id: newStudent.id,
          relationship: "parent",
        });

        // 5. If program_name provided, create enrollment
        if (row.program_name?.trim()) {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id")
            .ilike("name", row.program_name.trim())
            .maybeSingle();

          if (course) {
            const enrollmentStatus =
              row.enrollment_status?.trim() || "active";
            const sessionsRemaining = parseInt(
              row.sessions_remaining?.trim() || "0",
              10
            );

            const schedule: { day: string; time: string }[] = [];
            if (row.schedule_day?.trim()) {
              schedule.push({
                day: row.schedule_day.trim(),
                time: row.schedule_time?.trim() || "",
              });
            }

            await supabaseAdmin.from("enrollments").insert({
              student_id: newStudent.id,
              course_id: course.id,
              status: enrollmentStatus,
              sessions_remaining: isNaN(sessionsRemaining)
                ? 0
                : sessionsRemaining,
              schedule: schedule.length > 0 ? JSON.stringify(schedule) : null,
            });
          }
        }

        success++;
      } catch (err) {
        failed++;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowIndex}: ${message}`);
      }
    }

    revalidatePath("/student");

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error("Import students error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
