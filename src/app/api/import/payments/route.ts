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
  package_type?: string;
  package_duration?: string;
  receipt_seq?: string;
  notes?: string;
}

// Transform branches.code → the receipt/invoice branch token.
// Numeric codes like "001" → "s01" (strip leading zeros, pad to 2, prefix "s").
// Non-numeric codes are used as-is, lowercased, prefixed with "s".
function branchTokenFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return `s${String(n).padStart(2, "0")}`;
  }
  return `s${trimmed.toLowerCase()}`;
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
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as PaymentRow;
      const rowIndex = i + 1;

      // Skip template example rows
      if ((row.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE")) {
        skipped++;
        continue;
      }

      try {
        // Validate required fields
        if (!row.student_id || !row.amount || !row.status) {
          throw new Error("Missing required fields: student_id, amount, status");
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

        // Find student by student_id (case-insensitive — admins migrating
        // from old systems often have inconsistent casing, e.g. "Adv24001"
        // vs "ADV24001"). ilike with no wildcards = exact match ignoring case.
        // The branch join MUST disambiguate the FK because students has both
        // branch_id and previous_branch_id pointing to branches.
        const studentIdQuery = row.student_id.trim();
        const { data: student, error: studentError } = await supabaseAdmin
          .from("students")
          .select("id, branch_id, branch:branches!students_branch_id_branches_id_fk(code)")
          .ilike("student_id", studentIdQuery)
          .maybeSingle();

        if (studentError || !student) {
          throw new Error(
            `Student not found: ${row.student_id}${studentError ? ` (db error: ${studentError.message})` : ""}`,
          );
        }
        const branchCode = (student.branch as unknown as { code: string | null } | null)?.code ?? null;

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

        // Resolve package via (course, package_type, package_duration). Same
        // convention as the Students import. If only one of type/duration is
        // provided, error out — both are needed to find a unique row.
        let packageId: string | null = null;
        const packageType = row.package_type?.trim().toLowerCase();
        const packageDurationRaw = row.package_duration?.trim();
        if (packageType || packageDurationRaw) {
          if (!packageType || !packageDurationRaw) {
            throw new Error(
              "package_type and package_duration must both be provided together (or both left blank)",
            );
          }
          if (!courseId) {
            throw new Error(
              "package_type/package_duration requires program_name to be set so we can find the matching course_pricing row",
            );
          }
          const duration = parseInt(packageDurationRaw, 10);
          if (isNaN(duration)) {
            throw new Error(`package_duration "${packageDurationRaw}" is not a number`);
          }
          const { data: pricing } = await supabaseAdmin
            .from("course_pricing")
            .select("id")
            .eq("course_id", courseId)
            .eq("package_type", packageType)
            .eq("duration", duration)
            .is("deleted_at", null)
            .maybeSingle();
          if (!pricing) {
            throw new Error(
              `No package matching package_type="${packageType}" + package_duration=${duration} for "${row.program_name}"`,
            );
          }
          packageId = pricing.id as string;
        }

        // Build payment record. payment_type is NOT NULL in the DB schema;
        // every other path in the LMS (manual create, renewal, etc.) sets
        // 'package' as the default — match that here.
        const paymentData: Record<string, unknown> = {
          student_id: student.id,
          amount,
          status,
          payment_type: "package",
          payment_method: row.payment_method?.toLowerCase() || null,
          notes: row.notes || null,
        };

        if (courseId) {
          paymentData.course_id = courseId;
        }
        if (packageId) {
          paymentData.package_id = packageId;
        }

        if (row.paid_at) {
          paymentData.paid_at = new Date(row.paid_at).toISOString();
        }

        // Construct receipt_number + invoice_number from receipt_seq + branch
        // code + year (from paid_at, falling back to current year). Both
        // numbers share the same 4-digit sequence; the format differs only
        // in prefix (s-...-E- vs adv-...-e-).
        const receiptSeqRaw = row.receipt_seq?.trim();
        if (receiptSeqRaw) {
          const seqNum = parseInt(receiptSeqRaw, 10);
          if (isNaN(seqNum) || seqNum < 1 || seqNum > 9999) {
            throw new Error(`receipt_seq "${receiptSeqRaw}" must be a number 1–9999`);
          }
          const branchToken = branchTokenFromCode(branchCode);
          if (!branchToken) {
            throw new Error(
              `Cannot build receipt number — student's branch has no code set`,
            );
          }
          const yearSource = row.paid_at ? new Date(row.paid_at) : new Date();
          const yy = String(yearSource.getFullYear()).slice(-2);
          const seq = String(seqNum).padStart(4, "0");
          // All-caps per spec: S-S01-E-260288 / ADV-S01-E-260288
          const branchTokenUpper = branchToken.toUpperCase();
          const receiptNumber = `S-${branchTokenUpper}-E-${yy}${seq}`;
          const invoiceNumber = `ADV-${branchTokenUpper}-E-${yy}${seq}`;

          // Uniqueness check — same receipt/invoice number can't be assigned
          // to two different payments. The legacy old-system numbers should
          // already be distinct; if the user accidentally re-types one, we
          // want a clear error pointing at the conflict, not a silent insert
          // followed by a duplicate-row mess.
          const { data: conflict } = await supabaseAdmin
            .from("payments")
            .select("id, student_id, receipt_number, students!inner(student_id, name)")
            .or(`receipt_number.eq.${receiptNumber},invoice_number.eq.${invoiceNumber}`)
            .limit(1)
            .maybeSingle();
          if (conflict) {
            const conflictStu = (conflict as unknown as { students: { student_id: string; name: string } }).students;
            throw new Error(
              `receipt_seq ${seqNum} (${receiptNumber}) is already taken by ${conflictStu.student_id} (${conflictStu.name}). Pick a different unused sequence number.`,
            );
          }

          paymentData.receipt_number = receiptNumber;
          paymentData.invoice_number = invoiceNumber;
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

    return NextResponse.json({ success, failed, skipped, errors });
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

