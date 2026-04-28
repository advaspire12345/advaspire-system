import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";

interface PaymentRow {
  student_id: string;
  amount: string;
  status: string;
  payment_method?: string;
  paid_at?: string;
  program_name?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = (await request.json()) as { rows: Record<string, string>[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as PaymentRow;
      const rowIndex = i + 1;

      try {
        // Validate required fields
        if (!row.student_id || !row.amount || !row.status) {
          throw new Error("Missing required fields: student_id, amount, status");
        }

        // Validate student_id format
        if (!/^ADV-\w+/.test(row.student_id)) {
          throw new Error(`Invalid student_id format: ${row.student_id} (expected ADV-xxx)`);
        }

        // Validate status
        const status = row.status.toLowerCase();
        if (status !== "paid" && status !== "pending") {
          throw new Error(`Invalid status: ${row.status} (expected paid or pending)`);
        }

        // Validate payment_method if provided
        const validMethods = ["cash", "credit_card", "bank_transfer", "promptpay", "other"];
        if (row.payment_method && !validMethods.includes(row.payment_method.toLowerCase())) {
          throw new Error(`Invalid payment_method: ${row.payment_method}`);
        }

        // Validate amount
        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
          throw new Error(`Invalid amount: ${row.amount}`);
        }

        // Find student by student_id
        const { data: student, error: studentError } = await supabaseAdmin
          .from("students")
          .select("id")
          .eq("student_id", row.student_id)
          .single();

        if (studentError || !student) {
          throw new Error(`Student not found: ${row.student_id}`);
        }

        // Find course by program_name if provided
        let courseId: string | null = null;
        if (row.program_name && row.program_name.trim()) {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id")
            .ilike("name", row.program_name.trim())
            .single();

          if (course) {
            courseId = course.id;
          }
        }

        // Build payment record
        const paymentData: Record<string, unknown> = {
          student_id: student.id,
          amount,
          status,
          payment_method: row.payment_method?.toLowerCase() || null,
          notes: row.notes || null,
        };

        if (courseId) {
          paymentData.course_id = courseId;
        }

        if (row.paid_at) {
          paymentData.paid_at = new Date(row.paid_at).toISOString();
        }

        // Insert payment
        const { error: insertError } = await supabaseAdmin
          .from("payments")
          .insert(paymentData);

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        success++;
      } catch (err) {
        failed++;
        errors.push(`Row ${rowIndex}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    revalidatePath("/payment-record");
    revalidatePath("/pending-payments");

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error("Error importing payments:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
