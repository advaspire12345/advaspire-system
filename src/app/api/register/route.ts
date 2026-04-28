import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/db";

interface RegisterPayload {
  branchId: string;
  parent: {
    name: string;
    email: string;
    phone: string;
    address: string | null;
    postcode: string | null;
    city: string | null;
  };
  students: {
    name: string;
    dateOfBirth: string;
    gender: string;
    schoolName: string | null;
    programSlots: { courseId: string; slotId: string }[];
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterPayload = await request.json();

    // Validate branch
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("id, code")
      .eq("id", body.branchId)
      .is("deleted_at", null)
      .single();

    if (!branch) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    // Check for existing parent by email
    const { data: existingParent } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("email", body.parent.email.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();

    let parentId: string;

    if (existingParent) {
      parentId = existingParent.id;
      // Update parent info
      await supabaseAdmin
        .from("parents")
        .update({
          name: body.parent.name,
          phone: body.parent.phone,
          address: body.parent.address,
          postcode: body.parent.postcode,
          city: body.parent.city,
        })
        .eq("id", parentId);
    } else {
      // Create new parent
      const { data: newParent, error: parentError } = await supabaseAdmin
        .from("parents")
        .insert({
          name: body.parent.name,
          email: body.parent.email.toLowerCase(),
          phone: body.parent.phone,
          address: body.parent.address,
          postcode: body.parent.postcode,
          city: body.parent.city,
        })
        .select("id")
        .single();

      if (parentError || !newParent) {
        console.error("Error creating parent:", parentError);
        return NextResponse.json({ error: "Failed to create parent record" }, { status: 500 });
      }

      parentId = newParent.id;
    }

    // Generate student IDs and create students
    const branchCode = branch.code || "000";
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

    const createdStudents: string[] = [];

    for (const student of body.students) {
      const studentId = `${prefix}${sequence.toString().padStart(3, "0")}`;
      sequence++;

      // Create student
      const { data: newStudent, error: studentError } = await supabaseAdmin
        .from("students")
        .insert({
          student_id: studentId,
          name: student.name,
          date_of_birth: student.dateOfBirth,
          gender: student.gender,
          school_name: student.schoolName,
          branch_id: body.branchId,
          level: 1,
          adcoin_balance: 0,
        })
        .select("id")
        .single();

      if (studentError || !newStudent) {
        console.error("Error creating student:", studentError);
        continue;
      }

      createdStudents.push(studentId);

      // Link parent to student
      await supabaseAdmin
        .from("parent_students")
        .insert({
          parent_id: parentId,
          student_id: newStudent.id,
          relationship: "parent",
        });

      // Group programSlots by courseId — same program gets one enrollment with multiple slots
      const courseGroups = new Map<string, string[]>();
      for (const ps of student.programSlots) {
        const existing = courseGroups.get(ps.courseId) ?? [];
        existing.push(ps.slotId);
        courseGroups.set(ps.courseId, existing);
      }

      for (const [courseId, slotIds] of courseGroups) {
        // Fetch all slot details for this group
        const scheduleEntries: { day: string; time: string }[] = [];
        for (const slotId of slotIds) {
          const { data: slot } = await supabaseAdmin
            .from("course_slots")
            .select("day, time")
            .eq("id", slotId)
            .single();
          if (slot) {
            scheduleEntries.push({ day: slot.day, time: slot.time });
          }
        }

        const days = scheduleEntries.map((s) => s.day);
        const firstTime = scheduleEntries[0]?.time || null;

        await supabaseAdmin
          .from("enrollments")
          .insert({
            student_id: newStudent.id,
            course_id: courseId,
            status: "pending",
            sessions_remaining: 0,
            day_of_week: days.length > 0 ? JSON.stringify(days) : null,
            start_time: firstTime,
            schedule: scheduleEntries.length > 0 ? JSON.stringify(scheduleEntries) : null,
          });
      }
    }

    if (createdStudents.length === 0) {
      return NextResponse.json({ error: "Failed to create any students" }, { status: 500 });
    }

    // Revalidate all related pages so data shows immediately
    revalidatePath("/student");
    revalidatePath("/trial");
    revalidatePath("/pending-payments");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      studentIds: createdStudents,
      message: `Successfully registered ${createdStudents.length} student(s)`,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
