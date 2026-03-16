"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createStudent,
  updateStudent,
  softDeleteStudent,
  createEnrollment,
  linkParentToStudent,
} from "@/data/students";
import { createParent, getParentByEmail, updateParent } from "@/data/parents";
import { checkEmailExists, getEmailConflictMessage } from "@/data/email-validation";
import { createPayment } from "@/data/payments";
import { supabaseAdmin } from "@/db";
import type { StudentInsert, StudentUpdate, EnrollmentInsert, ParentInsert, ParentUpdate, Gender, PaymentInsert, AdcoinTransactionInsert } from "@/db/schema";

/**
 * Generate the next student ID in format ADV + YY + 3-digit sequence
 * e.g., ADV26001 for first student in 2026
 */
export async function generateNextStudentId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // e.g., "26" for 2026
  const prefix = `ADV${yearSuffix}`;

  // Find the highest student_id for this year
  const { data: latestStudent, error } = await supabaseAdmin
    .from('students')
    .select('student_id')
    .like('student_id', `${prefix}%`)
    .order('student_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest student ID:', error);
    // Default to 001 if error
    return `${prefix}001`;
  }

  if (!latestStudent?.student_id) {
    // First student of this year
    return `${prefix}001`;
  }

  // Extract the sequence number and increment
  const latestId = latestStudent.student_id;
  const sequenceStr = latestId.slice(-3); // Last 3 digits
  const nextSequence = parseInt(sequenceStr, 10) + 1;

  // Pad to 3 digits
  const nextSequenceStr = nextSequence.toString().padStart(3, '0');

  return `${prefix}${nextSequenceStr}`;
}

export interface StudentFormPayload {
  // Basic Info
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  schoolName: string | null;
  coverPhotoUrl: string | null;

  // Student Account
  studentId: string | null;
  level: number | null;
  adcoinBalance: number;

  // Parent Info (for creating new parent)
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;
  parentRelationship: string | null;

  // Enrollment
  branchId: string;
  courseId: string | null;
  instructorId: string | null;
  packageId: string | null;
  packageType: "monthly" | "session" | null;
  numberOfMonths: number | null;
  numberOfSessions: number | null;
  scheduleEntries: { day: string; time: string }[];

  // Sibling Sharing
  shareWithSibling: boolean;
  existingPoolId: string | null;

  // Notes
  notes: string | null;
}

export async function createStudentAction(
  payload: StudentFormPayload
): Promise<{ success: boolean; error?: string; studentId?: string }> {
  try {
    // 1. Check student email uniqueness (if email provided)
    if (payload.email?.trim()) {
      const emailCheck = await checkEmailExists(payload.email.trim());
      if (emailCheck.exists) {
        return {
          success: false,
          error: getEmailConflictMessage(emailCheck.table!)
        };
      }
    }

    // 2. Check parent email BEFORE creating student to avoid orphaned records
    const shouldHandleParent = (payload.parentId === "new" || !payload.parentId) && payload.parentName?.trim();
    if (shouldHandleParent) {
      const parentEmail = payload.parentEmail?.trim() || `${payload.parentName!.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;

      // Check if parent email is same as student email - not allowed
      if (payload.email?.trim() && parentEmail.toLowerCase() === payload.email.trim().toLowerCase()) {
        return {
          success: false,
          error: "Parent email cannot be the same as student email. Please use different emails for student and parent accounts."
        };
      }

      // Check if parent with this email already exists (that's OK, we'll link to them)
      const existingParent = await getParentByEmail(parentEmail);

      if (!existingParent) {
        // Check if email is used elsewhere (student/user) - this is NOT OK
        const parentEmailCheck = await checkEmailExists(parentEmail, "parents");
        if (parentEmailCheck.exists) {
          return {
            success: false,
            error: `Parent email "${parentEmail}" is already registered as a ${parentEmailCheck.table === "students" ? "student" : "team member"}. Please use a different email.`
          };
        }
      }
    }

    // 3. Generate student ID if not provided
    let studentId = payload.studentId?.trim() || null;
    if (!studentId) {
      studentId = await generateNextStudentId();
    }

    // 4. Create the student
    const studentData: StudentInsert = {
      student_id: studentId,
      name: payload.name,
      email: payload.email?.trim() || null,
      phone: payload.phone || null,
      photo: payload.photoUrl || null,
      date_of_birth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      school_name: payload.schoolName || null,
      cover_photo: payload.coverPhotoUrl || null,
      branch_id: payload.branchId,
      level: payload.level || 1,
      adcoin_balance: payload.adcoinBalance || 0,
    };

    const student = await createStudent(studentData);

    if (!student) {
      return { success: false, error: "Failed to create student record" };
    }

    // 5. Handle parent creation/linking if provided (email already validated above)
    if (shouldHandleParent) {
      const parentEmail = payload.parentEmail?.trim() || `${payload.parentName!.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;

      // Check if parent with this email already exists
      const existingParent = await getParentByEmail(parentEmail);

      if (existingParent) {
        // Link existing parent instead of creating duplicate
        await linkParentToStudent(existingParent.id, student.id, payload.parentRelationship);
      } else {
        // Email was already validated above, safe to create new parent
        const parentData: ParentInsert = {
          name: payload.parentName!.trim(),
          email: parentEmail,
          phone: payload.parentPhone?.trim() || null,
          address: payload.parentAddress?.trim() || null,
          postcode: payload.parentPostcode?.trim() || null,
          city: payload.parentCity?.trim() || null,
        };

        const parent = await createParent(parentData);
        if (parent) {
          await linkParentToStudent(parent.id, student.id, payload.parentRelationship);
        }
      }
    } else if (payload.parentId && payload.parentId !== "new") {
      // Link existing parent
      await linkParentToStudent(payload.parentId, student.id, payload.parentRelationship);
    }

    // 6. Create enrollment if course is selected
    if (payload.courseId) {
      // Filter out empty schedule entries
      const validScheduleEntries = payload.scheduleEntries.filter(
        (e) => e.day && e.day.trim() !== ""
      );
      const days = validScheduleEntries.map((e) => e.day);
      const firstEntry = validScheduleEntries[0];

      // sessions_remaining starts at 0 - will be set when payment is approved
      const enrollmentData: EnrollmentInsert = {
        student_id: student.id,
        course_id: payload.courseId,
        package_id: payload.packageId || null,
        instructor_id: payload.instructorId || null,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        schedule: JSON.stringify(validScheduleEntries),
        status: "active",
        sessions_remaining: 0, // Start with 0, will be set when payment approved
        pool_id: payload.existingPoolId || null, // Link to pool if joining existing
      };

      const enrollment = await createEnrollment(enrollmentData);
      const enrollmentId = enrollment?.id;

      // 6a. Handle sibling session sharing
      if (enrollmentId && payload.shareWithSibling && payload.parentId && payload.parentId !== "new") {
        const { createPoolWithSiblings, addStudentToPool } = await import("@/data/pools");

        // Check if joining existing pool or creating new
        if (payload.existingPoolId) {
          // Join existing pool
          await addStudentToPool(payload.existingPoolId, student.id, enrollmentId);
          console.log(`Student ${student.id} joined existing pool ${payload.existingPoolId}`);
        } else {
          // Need to create a new pool with first sibling
          // Check if parent has other children enrolled in this course
          const { data: parentStudents } = await supabaseAdmin
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', payload.parentId);

          const siblingStudentIds = (parentStudents ?? []).map(ps => ps.student_id);

          // Find sibling enrollment in same course
          const { data: siblingEnrollmentData } = await supabaseAdmin
            .from('enrollments')
            .select('id, student_id')
            .eq('course_id', payload.courseId)
            .in('student_id', siblingStudentIds)
            .neq('student_id', student.id)
            .eq('status', 'active')
            .is('deleted_at', null)
            .maybeSingle();

          if (siblingEnrollmentData) {
            // Get parent name and course name for pool name
            const { data: parentData } = await supabaseAdmin
              .from('parents')
              .select('name')
              .eq('id', payload.parentId)
              .single();

            const { data: courseData } = await supabaseAdmin
              .from('courses')
              .select('name')
              .eq('id', payload.courseId)
              .single();

            const pool = await createPoolWithSiblings(
              payload.parentId,
              payload.courseId,
              payload.packageId,
              parentData?.name || 'Family',
              courseData?.name || 'Course',
              { studentId: siblingEnrollmentData.student_id, enrollmentId: siblingEnrollmentData.id },
              { studentId: student.id, enrollmentId: enrollmentId }
            );

            if (pool) {
              console.log(`Created new sibling pool ${pool.id} with students`);

              // If there's a pending payment for the first sibling, convert it to pool payment
              const { data: siblingPendingPayment } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('student_id', siblingEnrollmentData.student_id)
                .eq('course_id', payload.courseId)
                .eq('status', 'pending')
                .maybeSingle();

              if (siblingPendingPayment) {
                // Convert to shared pool payment
                await supabaseAdmin
                  .from('payments')
                  .update({
                    pool_id: pool.id,
                    is_shared_package: true,
                    shared_with: [siblingEnrollmentData.student_id, student.id],
                    notes: `Shared package for ${parentData?.name || 'Family'} siblings`,
                  })
                  .eq('id', siblingPendingPayment.id);
              }
            }
          }
        }
      }

      // 7. Create pending payment if package is selected (and not sharing with sibling who has pending payment)
      if (payload.packageId && !payload.shareWithSibling) {
        // Fetch the package price from course_pricing
        const { data: pricing, error: pricingError } = await supabaseAdmin
          .from('course_pricing')
          .select('price, description')
          .eq('id', payload.packageId)
          .is('deleted_at', null)
          .single();

        if (pricingError) {
          console.error('Error fetching course pricing:', pricingError);
        }

        if (pricing?.price) {
          // Note: payments.package_id references 'packages' table, not 'course_pricing'
          // So we don't set package_id here, just store the amount and course
          const paymentData: PaymentInsert = {
            student_id: student.id,
            course_id: payload.courseId,
            amount: pricing.price,
            payment_type: 'registration',
            status: 'pending',
            notes: pricing.description || `Registration payment for enrollment`,
          };

          const paymentResult = await createPayment(paymentData);
          if (!paymentResult) {
            console.error('Failed to create pending payment for student:', student.id);
          }
        }
      }
    }

    // 8. Create adcoin transaction if initial balance is provided
    if (payload.adcoinBalance > 0) {
      // Get pool account (advaspire) user ID for sender
      const { getSettings } = await import("@/data/settings");
      const { getUserByEmail } = await import("@/data/users");
      const settings = await getSettings();
      const poolEmail = settings.pool_account_email || 'advaspire@gmail.com';
      const poolUser = await getUserByEmail(poolEmail);

      const transactionData: AdcoinTransactionInsert = {
        sender_id: poolUser?.id || null,
        receiver_id: student.id,
        amount: payload.adcoinBalance,
        type: 'adjusted',
        description: 'Initial adcoin balance on registration',
      };

      const { error: txError } = await supabaseAdmin
        .from('adcoin_transactions')
        .insert(transactionData);

      if (txError) {
        console.error('Error creating adcoin transaction:', txError);
      }
    }

    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true, studentId: student.id };
  } catch (error) {
    console.error("Error in createStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateStudentAction(
  studentId: string,
  payload: StudentFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check student email uniqueness (excluding current student)
    if (payload.email?.trim()) {
      const { data: currentStudent } = await import("@/db").then(m =>
        m.supabaseAdmin.from("students").select("email").eq("id", studentId).single()
      );

      // Only check if email is different from current
      if (currentStudent?.email !== payload.email.trim()) {
        const emailCheck = await checkEmailExists(payload.email.trim());
        if (emailCheck.exists) {
          return {
            success: false,
            error: getEmailConflictMessage(emailCheck.table!)
          };
        }
      }
    }

    // 2. Update student basic info
    const updateData: StudentUpdate = {
      student_id: payload.studentId || null,
      name: payload.name,
      email: payload.email?.trim() || null,
      phone: payload.phone || null,
      photo: payload.photoUrl || null,
      date_of_birth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      school_name: payload.schoolName || null,
      cover_photo: payload.coverPhotoUrl || null,
      branch_id: payload.branchId,
      level: payload.level || 1,
      adcoin_balance: payload.adcoinBalance || 0,
    };

    const result = await updateStudent(studentId, updateData);

    if (!result) {
      return { success: false, error: "Failed to update student record" };
    }

    // 3. Handle parent creation/linking if provided
    const shouldHandleParent = (payload.parentId === "new" || !payload.parentId) && payload.parentName?.trim();

    if (shouldHandleParent) {
      const parentEmail = payload.parentEmail?.trim() || `${payload.parentName!.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;

      // Check if parent email is same as student email - not allowed
      if (payload.email?.trim() && parentEmail.toLowerCase() === payload.email.trim().toLowerCase()) {
        return {
          success: false,
          error: "Parent email cannot be the same as student email. Please use different emails for student and parent accounts."
        };
      }

      // Check if parent with this email already exists
      const existingParent = await getParentByEmail(parentEmail);

      if (existingParent) {
        // Link existing parent instead of creating duplicate
        await linkParentToStudent(existingParent.id, studentId, payload.parentRelationship);
      } else {
        // Check if email is used elsewhere (student/user)
        const parentEmailCheck = await checkEmailExists(parentEmail, "parents");
        if (parentEmailCheck.exists) {
          // Return error - parent email conflicts with student/user
          return {
            success: false,
            error: `Parent email "${parentEmail}" is already registered as a ${parentEmailCheck.table === "students" ? "student" : "team member"}. Please use a different email.`
          };
        }

        // Create new parent
        const parentData: ParentInsert = {
          name: payload.parentName!.trim(),
          email: parentEmail,
          phone: payload.parentPhone?.trim() || null,
          address: payload.parentAddress?.trim() || null,
          postcode: payload.parentPostcode?.trim() || null,
          city: payload.parentCity?.trim() || null,
        };

        const parent = await createParent(parentData);
        if (parent) {
          await linkParentToStudent(parent.id, studentId, payload.parentRelationship);
        }
      }
    } else if (payload.parentId && payload.parentId !== "new") {
      // Update existing parent details if any fields were modified
      const hasParentUpdates = payload.parentName?.trim() || payload.parentPhone?.trim() ||
        payload.parentEmail?.trim() || payload.parentAddress?.trim() ||
        payload.parentPostcode?.trim() || payload.parentCity?.trim();
      if (hasParentUpdates) {
        // Check if parent email is same as student email - not allowed
        if (payload.parentEmail?.trim() && payload.email?.trim() &&
            payload.parentEmail.trim().toLowerCase() === payload.email.trim().toLowerCase()) {
          return {
            success: false,
            error: "Parent email cannot be the same as student email. Please use different emails for student and parent accounts."
          };
        }

        // Check if the email is being changed
        if (payload.parentEmail?.trim()) {
          const { data: currentParent } = await import("@/db").then(m =>
            m.supabaseAdmin.from("parents").select("email").eq("id", payload.parentId).single()
          );

          // Only check email uniqueness if it's different from current
          if (currentParent?.email !== payload.parentEmail.trim()) {
            const parentEmailCheck = await checkEmailExists(payload.parentEmail.trim(), "parents", payload.parentId);
            if (parentEmailCheck.exists) {
              return {
                success: false,
                error: `Parent email "${payload.parentEmail}" is already registered as a ${parentEmailCheck.table === "students" ? "student" : parentEmailCheck.table === "parents" ? "parent" : "team member"}. Please use a different email.`
              };
            }
          }
        }

        // Update parent record
        const parentUpdateData: ParentUpdate = {
          name: payload.parentName?.trim() || undefined,
          email: payload.parentEmail?.trim() || undefined,
          phone: payload.parentPhone?.trim() || null,
          address: payload.parentAddress?.trim() || null,
          postcode: payload.parentPostcode?.trim() || null,
          city: payload.parentCity?.trim() || null,
        };

        await updateParent(payload.parentId, parentUpdateData);
      }

      // Link existing parent to student (and update relationship)
      await linkParentToStudent(payload.parentId, studentId, payload.parentRelationship);
    }

    // 4. Handle enrollment update if course is selected
    if (payload.courseId && payload.courseId.trim() !== "") {
      const { updateOrCreateEnrollment } = await import("@/data/students");

      // Filter out empty schedule entries
      const validScheduleEntries = payload.scheduleEntries.filter(
        (e) => e.day && e.day.trim() !== ""
      );

      // sessions_remaining is managed by payment approval and attendance, not here
      // updateOrCreateEnrollment will preserve existing sessions if != 0
      // (both positive from payment or negative from attendance before payment)
      await updateOrCreateEnrollment(studentId, {
        course_id: payload.courseId,
        package_id: payload.packageId || null,
        instructor_id: payload.instructorId || null,
        schedule: validScheduleEntries,
        sessions_remaining: 0, // Will be ignored if existing sessions != 0
      });

      // 5. Update pending payment if package changed
      if (payload.packageId) {
        // Get the new package price and duration
        const { data: newPricing } = await supabaseAdmin
          .from('course_pricing')
          .select('price, description, duration, package_type')
          .eq('id', payload.packageId)
          .is('deleted_at', null)
          .single();

        if (newPricing?.price) {
          // Check if this student is part of a shared pool
          const { data: enrollmentWithPool } = await supabaseAdmin
            .from('enrollments')
            .select('id, pool_id')
            .eq('student_id', studentId)
            .eq('course_id', payload.courseId)
            .eq('status', 'active')
            .is('deleted_at', null)
            .maybeSingle();

          const poolId = enrollmentWithPool?.pool_id;

          if (poolId) {
            // SHARED POOL: Update pool's package and sync all sibling enrollments
            // Update the pool's package_id
            await supabaseAdmin
              .from('shared_session_pools')
              .update({
                package_id: payload.packageId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', poolId);

            // Get all students in the pool
            const { data: poolStudents } = await supabaseAdmin
              .from('pool_students')
              .select('student_id, enrollment_id')
              .eq('pool_id', poolId);

            const poolStudentIds = (poolStudents ?? []).map(ps => ps.student_id);
            const poolEnrollmentIds = (poolStudents ?? []).map(ps => ps.enrollment_id);

            // Update all sibling enrollments with the same package
            if (poolEnrollmentIds.length > 0) {
              await supabaseAdmin
                .from('enrollments')
                .update({ package_id: payload.packageId })
                .in('id', poolEnrollmentIds);
            }

            // Update/create shared pending payment for the pool
            // First check if there's already a pool payment
            const { data: existingPoolPayment } = await supabaseAdmin
              .from('payments')
              .select('id')
              .eq('pool_id', poolId)
              .eq('status', 'pending')
              .maybeSingle();

            if (existingPoolPayment) {
              // Update existing pool payment
              await supabaseAdmin
                .from('payments')
                .update({
                  amount: newPricing.price,
                  notes: newPricing.description || 'Updated shared package payment',
                  shared_with: poolStudentIds,
                })
                .eq('id', existingPoolPayment.id);
            } else {
              // Check if any sibling has a pending payment for this course and convert it
              const { data: siblingPayment } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('course_id', payload.courseId)
                .eq('status', 'pending')
                .in('student_id', poolStudentIds)
                .maybeSingle();

              if (siblingPayment) {
                // Convert to pool payment
                await supabaseAdmin
                  .from('payments')
                  .update({
                    amount: newPricing.price,
                    pool_id: poolId,
                    is_shared_package: true,
                    shared_with: poolStudentIds,
                    notes: newPricing.description || 'Shared package payment',
                  })
                  .eq('id', siblingPayment.id);
              } else {
                // Create new pool payment
                const paymentData: PaymentInsert = {
                  student_id: poolStudentIds[0], // Use first student as primary
                  course_id: payload.courseId,
                  amount: newPricing.price,
                  payment_type: 'registration',
                  status: 'pending',
                  pool_id: poolId,
                  is_shared_package: true,
                  shared_with: poolStudentIds,
                  notes: newPricing.description || 'Shared package payment',
                };
                await createPayment(paymentData);
              }
            }
          } else {
            // NON-SHARED: Update just this student's payment
            const { data: existingPayment } = await supabaseAdmin
              .from('payments')
              .select('id')
              .eq('student_id', studentId)
              .eq('course_id', payload.courseId)
              .eq('status', 'pending')
              .maybeSingle();

            if (existingPayment) {
              // Update existing pending payment with new amount
              await supabaseAdmin
                .from('payments')
                .update({
                  amount: newPricing.price,
                  notes: newPricing.description || 'Updated package payment',
                })
                .eq('id', existingPayment.id);
            } else {
              // Create new pending payment if none exists
              const paymentData: PaymentInsert = {
                student_id: studentId,
                course_id: payload.courseId,
                amount: newPricing.price,
                payment_type: 'registration',
                status: 'pending',
                notes: newPricing.description || 'Registration payment for enrollment',
              };
              await createPayment(paymentData);
            }
          }
        }
      }
    }

    revalidatePath("/student");
    revalidatePath("/pending-payments");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error in updateStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function deleteStudentAction(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await softDeleteStudent(studentId);

    if (!success) {
      return { success: false, error: "Failed to delete student record" };
    }

    revalidatePath("/student");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteStudentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
