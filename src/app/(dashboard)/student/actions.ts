"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createStudent,
  updateStudent,
  softDeleteStudent,
  createEnrollment,
  linkParentToStudent,
} from "@/data/students";
import { createParentWithAuth, getParentByEmail, updateParent, ensureParentAuth } from "@/data/parents";
import { checkEmailExists, getEmailConflictMessage } from "@/data/email-validation";
import { createPayment } from "@/data/payments";
import { supabaseAdmin } from "@/db";
import { authorizeAction } from "@/data/permissions";
import { hashPassword } from "@/lib/student-auth";
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
  // Existing student ID (when enrolling existing student in a new program)
  existingStudentId: string | null;

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
  username: string | null;
  portalPassword: string | null;
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

  // Enrollment Status (edit only)
  enrollmentStatus: string | null;

  // Notes
  notes: string | null;
}

export async function createStudentAction(
  payload: StudentFormPayload
): Promise<{ success: boolean; error?: string; studentId?: string }> {
  try {
    await authorizeAction('students', 'can_create');

    // Check if enrolling an existing student in a new program
    const isExistingStudent = !!payload.existingStudentId;

    let studentDbId: string;

    if (isExistingStudent) {
      // Use the existing student - no need to create a new one
      // Level and adcoin are saved per-enrollment, not updated on student record
      studentDbId = payload.existingStudentId!;

      // Update student's branch_id if it changed
      if (payload.branchId) {
        await updateStudent(studentDbId, { branch_id: payload.branchId });
      }

      // Still link parent if needed
      if (payload.parentId && payload.parentId !== "new") {
        await linkParentToStudent(payload.parentId, studentDbId, payload.parentRelationship);
      }
    } else {
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
      const portalPasswordHash = payload.portalPassword?.trim()
        ? await hashPassword(payload.portalPassword.trim())
        : null;

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
        username: payload.username?.trim() || null,
        password_hash: portalPasswordHash,
      };

      const student = await createStudent(studentData);

      if (!student) {
        return { success: false, error: "Failed to create student record" };
      }

      studentDbId = student.id;

      // 5. Handle parent creation/linking if provided (email already validated above)
      if (shouldHandleParent) {
        const parentEmail = payload.parentEmail?.trim() || `${payload.parentName!.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`;

        // Check if parent with this email already exists
        const existingParent = await getParentByEmail(parentEmail);

        if (existingParent) {
          // Link existing parent instead of creating duplicate
          await linkParentToStudent(existingParent.id, studentDbId, payload.parentRelationship);
          // Ensure existing parent has an auth account
          await ensureParentAuth(existingParent.id);
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

          const parent = await createParentWithAuth(parentData);
          if (parent) {
            await linkParentToStudent(parent.id, studentDbId, payload.parentRelationship);
          }
        }
      } else if (payload.parentId && payload.parentId !== "new") {
        // Link existing parent
        await linkParentToStudent(payload.parentId, studentDbId, payload.parentRelationship);
      }
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
        student_id: studentDbId,
        course_id: payload.courseId,
        package_id: payload.packageId || null,
        instructor_id: payload.instructorId || null,
        day_of_week: days.length > 0 ? JSON.stringify(days) : null,
        start_time: firstEntry?.time || null,
        schedule: JSON.stringify(validScheduleEntries),
        status: "active",
        sessions_remaining: 0, // Start with 0, will be set when payment approved
        pool_id: payload.existingPoolId || null, // Link to pool if joining existing
        level: payload.level || 1,
        adcoin_balance: payload.adcoinBalance || 0,
      };

      const enrollment = await createEnrollment(enrollmentData);
      const enrollmentId = enrollment?.id;

      // 6a. Handle sibling session sharing (only for session packages, not monthly)
      let skipPoolCreation = false;
      if (payload.packageId) {
        const { data: pkgCheck } = await supabaseAdmin
          .from('course_pricing')
          .select('package_type')
          .eq('id', payload.packageId)
          .single();
        if (pkgCheck?.package_type === 'monthly') {
          skipPoolCreation = true;
          console.log('[Pool] Skipping pool creation for monthly package');
        }
      }
      if (enrollmentId && payload.shareWithSibling && payload.parentId && payload.parentId !== "new" && !skipPoolCreation) {
        const { createPoolWithSiblings, addStudentToPool } = await import("@/data/pools");

        // Check if joining existing pool or creating new
        if (payload.existingPoolId) {
          // Join existing pool
          await addStudentToPool(payload.existingPoolId, studentDbId, enrollmentId);
          console.log(`Student ${studentDbId} joined existing pool ${payload.existingPoolId}`);

          // Update shared_with on all pool payments to include the new sibling
          const { data: allPoolMembers } = await supabaseAdmin
            .from('pool_students')
            .select('student_id')
            .eq('pool_id', payload.existingPoolId);
          const allMemberIds = (allPoolMembers ?? []).map(ps => ps.student_id);

          if (allMemberIds.length > 0) {
            // Update all pending and paid payments for this pool
            await supabaseAdmin
              .from('payments')
              .update({
                shared_with: allMemberIds,
                notes: `Shared package for ${allMemberIds.length} siblings`,
              })
              .eq('pool_id', payload.existingPoolId)
              .in('status', ['pending', 'paid']);
          }
        } else {
          // Need to create a new pool — include ALL siblings enrolled in the same course
          const { data: parentStudents } = await supabaseAdmin
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', payload.parentId);

          const siblingStudentIds = (parentStudents ?? []).map(ps => ps.student_id);

          // Find ALL sibling enrollments in same course (not just one)
          const { data: siblingEnrollments } = await supabaseAdmin
            .from('enrollments')
            .select('id, student_id')
            .eq('course_id', payload.courseId)
            .in('student_id', siblingStudentIds)
            .neq('student_id', studentDbId)
            .eq('status', 'active')
            .is('deleted_at', null);

          if (siblingEnrollments && siblingEnrollments.length > 0) {
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

            // Create pool with the first sibling + current student
            const firstSibling = siblingEnrollments[0];
            const pool = await createPoolWithSiblings(
              payload.parentId,
              payload.courseId,
              payload.packageId,
              parentData?.name || 'Family',
              courseData?.name || 'Course',
              { studentId: firstSibling.student_id, enrollmentId: firstSibling.id },
              { studentId: studentDbId, enrollmentId: enrollmentId }
            );

            if (pool) {
              // Add remaining siblings (2nd, 3rd, etc.) to the pool
              for (let i = 1; i < siblingEnrollments.length; i++) {
                const sibling = siblingEnrollments[i];
                await addStudentToPool(pool.id, sibling.student_id, sibling.id);
                console.log(`Added sibling ${sibling.student_id} to pool ${pool.id}`);
              }

              const allMemberIds = [
                ...siblingEnrollments.map(s => s.student_id),
                studentDbId,
              ];
              console.log(`Created new sibling pool ${pool.id} with ${allMemberIds.length} students`);

              // Convert any pending payments from siblings to pool payments
              const { data: siblingPendingPayments } = await supabaseAdmin
                .from('payments')
                .select('id, student_id')
                .in('student_id', siblingEnrollments.map(s => s.student_id))
                .eq('course_id', payload.courseId)
                .eq('status', 'pending');

              if (siblingPendingPayments && siblingPendingPayments.length > 0) {
                // Convert the first pending payment to a pool payment, delete the rest
                const firstPayment = siblingPendingPayments[0];
                await supabaseAdmin
                  .from('payments')
                  .update({
                    pool_id: pool.id,
                    is_shared_package: true,
                    shared_with: allMemberIds,
                    notes: `Shared package for ${parentData?.name || 'Family'} siblings`,
                  })
                  .eq('id', firstPayment.id);

                // Remove duplicate pending payments from other siblings
                for (let i = 1; i < siblingPendingPayments.length; i++) {
                  await supabaseAdmin
                    .from('payments')
                    .delete()
                    .eq('id', siblingPendingPayments[i].id);
                }
              } else {
                // No existing pending payment — create a new one for the shared pool
                const { createPoolRenewalPayment } = await import("@/data/payments");
                const poolPayment = await createPoolRenewalPayment(pool.id);
                if (poolPayment) {
                  console.log(`Created pending pool payment ${poolPayment.id} for pool ${pool.id}`);
                }
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
            student_id: studentDbId,
            course_id: payload.courseId,
            amount: pricing.price,
            payment_type: 'registration',
            status: 'pending',
            notes: pricing.description || `Registration payment for enrollment`,
          };

          const paymentResult = await createPayment(paymentData);
          if (!paymentResult) {
            console.error('Failed to create pending payment for student:', studentDbId);
          }
        }
      }
    }

    // 8. Create adcoin transaction if initial balance is provided (only for new students)
    if (!isExistingStudent && payload.adcoinBalance > 0) {
      // Get pool account (advaspire) user ID for sender
      const { getSettings } = await import("@/data/settings");
      const { getUserByEmail } = await import("@/data/users");
      const settings = await getSettings();
      const poolEmail = settings.pool_account_email || 'advaspire@gmail.com';
      const poolUser = await getUserByEmail(poolEmail);

      const transactionData: AdcoinTransactionInsert = {
        sender_id: poolUser?.id || null,
        receiver_id: studentDbId,
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

    // 9. Check if parent or student phone matches any trial and mark as converted
    // Collect all phone numbers to check (parent phone + student phone)
    const phonesToCheck: string[] = [];
    if (payload.parentPhone?.trim()) phonesToCheck.push(payload.parentPhone.trim());
    if (payload.phone?.trim()) phonesToCheck.push(payload.phone.trim());

    if (phonesToCheck.length > 0) {
      // Normalize all phones by stripping non-digit characters
      const normalizedPhones = phonesToCheck.map((p) => p.replace(/\D/g, ''));

      // Fetch all non-converted trials
      const { data: allTrials } = await supabaseAdmin
        .from('trials')
        .select('id, parent_phone')
        .in('status', ['pending', 'confirmed', 'completed'])
        .is('deleted_at', null);

      if (allTrials && allTrials.length > 0) {
        const matchingIds = allTrials
          .filter((t) => normalizedPhones.includes(t.parent_phone.replace(/\D/g, '')))
          .map((t) => t.id);

        if (matchingIds.length > 0) {
          await supabaseAdmin
            .from('trials')
            .update({ status: 'converted', updated_at: new Date().toISOString() })
            .in('id', matchingIds);
          console.log(`[TrialConvert] Converted ${matchingIds.length} trial(s) matching phones: ${phonesToCheck.join(', ')}`);
        } else {
          console.log(`[TrialConvert] No matching trials for phones: ${phonesToCheck.join(', ')}`);
        }
      } else {
        console.log(`[TrialConvert] No unconverted trials found in database`);
      }
    } else {
      console.log(`[TrialConvert] No phone numbers to check. parentPhone: "${payload.parentPhone}", phone: "${payload.phone}"`);
    }

    revalidatePath("/student");
    revalidatePath("/trial");
    revalidateTag("dashboard", "max");
    return { success: true, studentId: studentDbId };
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
    await authorizeAction('students', 'can_edit');

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
      username: payload.username?.trim() || null,
      ...(payload.portalPassword?.trim()
        ? { password_hash: await hashPassword(payload.portalPassword.trim()) }
        : {}),
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
        // Ensure existing parent has an auth account
        await ensureParentAuth(existingParent.id);
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

        const parent = await createParentWithAuth(parentData);
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
        ...(payload.enrollmentStatus ? { status: payload.enrollmentStatus as import("@/db/schema").EnrollmentStatus } : {}),
        level: payload.level || 1,
        adcoin_balance: payload.adcoinBalance || 0,
      });

      // 4b. Handle pool dissolution when shareWithSibling toggled off
      if (!payload.shareWithSibling) {
        // Check if student is currently in a pool
        const { data: currentEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id, pool_id, sessions_remaining')
          .eq('student_id', studentId)
          .eq('course_id', payload.courseId)
          .is('deleted_at', null)
          .order('enrolled_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentEnrollment?.pool_id) {
          const poolId = currentEnrollment.pool_id;

          // Fetch pool data (don't filter deleted_at — may be a stale breadcrumb to soft-deleted pool)
          const { data: poolData } = await supabaseAdmin
            .from('shared_session_pools')
            .select('sessions_remaining, total_sessions, deleted_at')
            .eq('id', poolId)
            .single();

          // Get all active students in the pool
          const { data: poolStudents } = await supabaseAdmin
            .from('pool_students')
            .select('student_id, enrollment_id, joined_at')
            .eq('pool_id', poolId)
            .order('joined_at', { ascending: true });

          if (poolData && !poolData.deleted_at && (poolStudents ?? []).length > 0) {
            // Active pool — dissolve it and give each student their display value
            console.log(`[Pool Dissolution] Dissolving pool ${poolId} — shareWithSibling toggled off for student ${studentId}`);

            const allStudentIds = (poolStudents ?? []).map(ps => ps.student_id);
            const siblingCount = (poolStudents ?? []).length || 1;
            const poolRemaining = poolData.sessions_remaining ?? 0;

            // Each student gets their equal share of pool sessions
            // Unified formula: first-joined gets more (sessions or debt)
            for (let i = 0; i < (poolStudents ?? []).length; i++) {
              const ps = poolStudents![i];
              const perStudent = Math.floor(poolRemaining / siblingCount);
              // Use proper remainder (not JS %) to handle negatives correctly
              const remainder = poolRemaining - perStudent * siblingCount;
              let positionBonus: number;
              if (poolRemaining >= 0) {
                positionBonus = i < remainder ? 1 : 0;
              } else {
                positionBonus = i >= (siblingCount - remainder) ? 1 : 0;
              }
              const displayValue = perStudent + positionBonus;

              await supabaseAdmin
                .from('enrollments')
                .update({
                  sessions_remaining: displayValue,
                  pool_id: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', ps.enrollment_id);
            }

            // Remove all students from pool_students
            await supabaseAdmin
              .from('pool_students')
              .delete()
              .eq('pool_id', poolId);

            // Delete the shared pending payment (if any)
            await supabaseAdmin
              .from('payments')
              .delete()
              .eq('pool_id', poolId)
              .eq('status', 'pending');

            // Create individual pending payments for each student who has depleted sessions
            for (const sid of allStudentIds) {
              const { data: enroll } = await supabaseAdmin
                .from('enrollments')
                .select('id, sessions_remaining, package_id, course_id')
                .eq('student_id', sid)
                .eq('course_id', payload.courseId)
                .is('deleted_at', null)
                .eq('status', 'active')
                .maybeSingle();

              if (enroll && (enroll.sessions_remaining ?? 0) <= 0) {
                const { data: existingPayment } = await supabaseAdmin
                  .from('payments')
                  .select('id')
                  .eq('student_id', sid)
                  .eq('course_id', payload.courseId)
                  .eq('status', 'pending')
                  .is('pool_id', null)
                  .maybeSingle();

                if (!existingPayment) {
                  let price = 0;
                  if (enroll.package_id) {
                    const { data: pricing } = await supabaseAdmin
                      .from('course_pricing')
                      .select('price')
                      .eq('id', enroll.package_id)
                      .single();
                    if (pricing) price = pricing.price;
                  }

                  if (price > 0) {
                    await createPayment({
                      student_id: sid,
                      course_id: payload.courseId,
                      package_id: enroll.package_id,
                      amount: price,
                      payment_type: 'package',
                      status: 'pending',
                      notes: 'Individual renewal after pool dissolution',
                    });
                  }
                }
              }
            }

            // Delete the pool itself
            await supabaseAdmin
              .from('shared_session_pools')
              .delete()
              .eq('id', poolId);

            console.log(`[Pool Dissolution] Pool ${poolId} dissolved. ${allStudentIds.length} students converted to individual.`);
          } else {
            // Stale pool_id breadcrumb (pool deleted or no members) — just clear it
            console.log(`[Pool Dissolution] Clearing stale pool_id ${poolId} from enrollment ${currentEnrollment.id}`);
            await supabaseAdmin
              .from('enrollments')
              .update({ pool_id: null, updated_at: new Date().toISOString() })
              .eq('id', currentEnrollment.id);
          }
        }
      }

      // 4c. Handle pool creation when shareWithSibling toggled ON for a non-pooled student
      if (payload.shareWithSibling && payload.parentId && payload.parentId !== "new") {
        // Check if student is NOT currently in a pool
        const { data: enrollForPool } = await supabaseAdmin
          .from('enrollments')
          .select('id, pool_id')
          .eq('student_id', studentId)
          .eq('course_id', payload.courseId)
          .is('deleted_at', null)
          .order('enrolled_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check if pool_id is a stale breadcrumb (pool deleted or no members)
        let effectivePoolId = enrollForPool?.pool_id ?? null;
        if (effectivePoolId) {
          const { data: poolCheck } = await supabaseAdmin
            .from('shared_session_pools')
            .select('id, deleted_at')
            .eq('id', effectivePoolId)
            .single();
          const { data: memberCheck } = await supabaseAdmin
            .from('pool_students')
            .select('id')
            .eq('pool_id', effectivePoolId)
            .eq('student_id', studentId)
            .maybeSingle();
          // If pool doesn't exist, is soft-deleted, or student is not a member → treat as no pool
          if (!poolCheck || poolCheck.deleted_at || !memberCheck) {
            effectivePoolId = null;
            // Clear the stale breadcrumb
            await supabaseAdmin
              .from('enrollments')
              .update({ pool_id: null, updated_at: new Date().toISOString() })
              .eq('id', enrollForPool!.id);
          }
        }

        if (enrollForPool && !effectivePoolId) {
          const enrollmentId = enrollForPool.id;
          const { createPoolWithSiblings, addStudentToPool } = await import("@/data/pools");

          if (payload.existingPoolId) {
            // Join existing pool
            await addStudentToPool(payload.existingPoolId, studentId, enrollmentId);
            console.log(`[Pool Creation] Student ${studentId} joined existing pool ${payload.existingPoolId}`);

            // Update shared_with on pool payments
            const { data: allPoolMembers } = await supabaseAdmin
              .from('pool_students')
              .select('student_id')
              .eq('pool_id', payload.existingPoolId);
            const allMemberIds = (allPoolMembers ?? []).map(ps => ps.student_id);

            if (allMemberIds.length > 0) {
              await supabaseAdmin
                .from('payments')
                .update({ shared_with: allMemberIds })
                .eq('pool_id', payload.existingPoolId)
                .in('status', ['pending', 'paid']);
            }

            // Delete this student's individual pending payment (will be covered by pool payment)
            await supabaseAdmin
              .from('payments')
              .delete()
              .eq('student_id', studentId)
              .eq('course_id', payload.courseId)
              .eq('status', 'pending')
              .is('pool_id', null);

          } else {
            // Create a new pool — find ALL siblings in same course under same parent
            const { data: parentStudents } = await supabaseAdmin
              .from('parent_students')
              .select('student_id')
              .eq('parent_id', payload.parentId);

            const siblingStudentIds = (parentStudents ?? []).map(ps => ps.student_id);

            // Find ALL sibling enrollments in same course (not just one)
            const { data: siblingEnrollments } = await supabaseAdmin
              .from('enrollments')
              .select('id, student_id')
              .eq('course_id', payload.courseId)
              .in('student_id', siblingStudentIds)
              .neq('student_id', studentId)
              .eq('status', 'active')
              .is('deleted_at', null);

            if (siblingEnrollments && siblingEnrollments.length > 0) {
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

              // Create pool with first sibling + current student
              const firstSibling = siblingEnrollments[0];
              const pool = await createPoolWithSiblings(
                payload.parentId,
                payload.courseId,
                payload.packageId,
                parentData?.name || 'Family',
                courseData?.name || 'Course',
                { studentId: firstSibling.student_id, enrollmentId: firstSibling.id },
                { studentId: studentId, enrollmentId: enrollmentId }
              );

              if (pool) {
                // Add remaining siblings (2nd, 3rd, etc.) to the pool
                for (let i = 1; i < siblingEnrollments.length; i++) {
                  const sibling = siblingEnrollments[i];
                  await addStudentToPool(pool.id, sibling.student_id, sibling.id);
                  console.log(`[Pool Creation] Added sibling ${sibling.student_id} to pool ${pool.id}`);
                }

                const allMemberIds = [
                  ...siblingEnrollments.map(s => s.student_id),
                  studentId,
                ];
                console.log(`[Pool Creation] Created new pool ${pool.id} with ${allMemberIds.length} students`);

                // Convert any existing individual pending payment to a pool payment
                const { data: existingPendingPayments } = await supabaseAdmin
                  .from('payments')
                  .select('id')
                  .eq('course_id', payload.courseId)
                  .eq('status', 'pending')
                  .is('pool_id', null)
                  .in('student_id', allMemberIds);

                if (existingPendingPayments && existingPendingPayments.length > 0) {
                  // Convert first to pool payment
                  await supabaseAdmin
                    .from('payments')
                    .update({
                      pool_id: pool.id,
                      is_shared_package: true,
                      shared_with: allMemberIds,
                    })
                    .eq('id', existingPendingPayments[0].id);

                  // Delete the rest (duplicates)
                  for (let i = 1; i < existingPendingPayments.length; i++) {
                    await supabaseAdmin
                      .from('payments')
                      .delete()
                      .eq('id', existingPendingPayments[i].id);
                  }
                } else {
                  // Create pool renewal payment if needed
                  const { createPoolRenewalPayment } = await import("@/data/payments");
                  await createPoolRenewalPayment(pool.id);
                }
              }
            }
          }
        }
      }

      // 4d. Handle pool redistribution on enrollment status change
      if (payload.enrollmentStatus) {
        const { data: enrollmentForPool } = await supabaseAdmin
          .from('enrollments')
          .select('id, pool_id')
          .eq('student_id', studentId)
          .eq('course_id', payload.courseId)
          .is('deleted_at', null)
          .order('enrolled_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (enrollmentForPool?.pool_id) {
          const inactiveStatuses = ['cancelled', 'completed', 'expired'];
          if (inactiveStatuses.includes(payload.enrollmentStatus)) {
            // Going inactive → redistribute sessions to siblings
            const { redistributePoolOnInactive } = await import("@/data/pools");
            await redistributePoolOnInactive(enrollmentForPool.id, studentId);
          } else if (payload.enrollmentStatus === 'active') {
            // Coming back active → restore sessions from siblings
            const { restoreStudentToPool } = await import("@/data/pools");
            await restoreStudentToPool(enrollmentForPool.id, studentId);
          }
        }
      }

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
          // Universal guard: check if there's ALREADY a pending payment for this student+course
          // This prevents duplicates regardless of pool state changes
          const { data: anyExistingPending } = await supabaseAdmin
            .from('payments')
            .select('id, pool_id')
            .eq('student_id', studentId)
            .eq('course_id', payload.courseId)
            .eq('status', 'pending')
            .limit(1);

          const existingPendingPayment = anyExistingPending?.[0] ?? null;

          // Check if this student is part of a shared pool
          const { data: enrollmentWithPool } = await supabaseAdmin
            .from('enrollments')
            .select('id, pool_id')
            .eq('student_id', studentId)
            .eq('course_id', payload.courseId)
            .is('deleted_at', null)
            .order('enrolled_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let poolId = enrollmentWithPool?.pool_id;

          // Verify pool is active and has members (pool_id may be a stale breadcrumb)
          let poolStudentIds: string[] = [];
          let poolEnrollmentIds: string[] = [];
          if (poolId) {
            const { data: poolStudents } = await supabaseAdmin
              .from('pool_students')
              .select('student_id, enrollment_id')
              .eq('pool_id', poolId);

            poolStudentIds = (poolStudents ?? []).map(ps => ps.student_id);
            poolEnrollmentIds = (poolStudents ?? []).map(ps => ps.enrollment_id);

            // If pool has no active members, treat as non-pooled (stale breadcrumb)
            if (poolStudentIds.length === 0) {
              poolId = null;
            }
          }

          if (poolId && poolStudentIds.length > 0) {
            // SHARED POOL: Update pool's package and sync all sibling enrollments
            await supabaseAdmin
              .from('shared_session_pools')
              .update({
                package_id: payload.packageId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', poolId);

            // Update all sibling enrollments with the same package
            if (poolEnrollmentIds.length > 0) {
              await supabaseAdmin
                .from('enrollments')
                .update({ package_id: payload.packageId })
                .in('id', poolEnrollmentIds);
            }

            if (existingPendingPayment) {
              // Update existing pending payment (convert to pool payment if needed)
              await supabaseAdmin
                .from('payments')
                .update({
                  amount: newPricing.price,
                  pool_id: poolId,
                  is_shared_package: true,
                  shared_with: poolStudentIds,
                  notes: newPricing.description || 'Updated shared package payment',
                })
                .eq('id', existingPendingPayment.id);
            } else {
              // Check if there's a pool-level pending payment (student_id might be a sibling's)
              const { data: existingPoolPayments } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('pool_id', poolId)
                .eq('status', 'pending')
                .limit(1);

              const existingPoolPayment = existingPoolPayments?.[0] ?? null;

              if (existingPoolPayment) {
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
                const { data: siblingPayments } = await supabaseAdmin
                  .from('payments')
                  .select('id')
                  .eq('course_id', payload.courseId)
                  .eq('status', 'pending')
                  .in('student_id', poolStudentIds)
                  .limit(1);

                const siblingPayment = siblingPayments?.[0] ?? null;

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
                  // Create new pool payment only if truly no pending payment exists
                  const paymentData: PaymentInsert = {
                    student_id: poolStudentIds[0],
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
            }
          } else {
            // NON-SHARED: Update just this student's payment
            if (existingPendingPayment) {
              // Update existing pending payment with new amount
              await supabaseAdmin
                .from('payments')
                .update({
                  amount: newPricing.price,
                  notes: newPricing.description || 'Updated package payment',
                  // Clear pool fields if previously pooled
                  pool_id: null,
                  is_shared_package: false,
                  shared_with: null,
                })
                .eq('id', existingPendingPayment.id);
            } else {
              // Create new pending payment only if none exists
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
    await authorizeAction('students', 'can_delete');

    // 0. Block deletion if the student has any attendance (present/late)
    const { data: enrollmentsForAttCheck } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (enrollmentsForAttCheck && enrollmentsForAttCheck.length > 0) {
      const enrollmentIds = enrollmentsForAttCheck.map(e => e.id);
      const { count: attendanceCount } = await supabaseAdmin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .in('enrollment_id', enrollmentIds)
        .in('status', ['present', 'late']);

      if (attendanceCount && attendanceCount > 0) {
        return {
          success: false,
          error: "Cannot delete a student who has attended classes. Please cancel or complete the enrollment instead.",
        };
      }
    }

    // 1. Handle pool redistribution before deleting the student
    const { data: pooledEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('id, pool_id')
      .eq('student_id', studentId)
      .not('pool_id', 'is', null)
      .is('deleted_at', null);

    if (pooledEnrollments && pooledEnrollments.length > 0) {
      const { redistributePoolOnInactive } = await import("@/data/pools");

      for (const enrollment of pooledEnrollments) {
        await redistributePoolOnInactive(enrollment.id, studentId);
      }
    }

    // 2. Fully clean up all references so the deleted student doesn't appear in pools or sibling checks
    // Soft-delete all enrollments
    await supabaseAdmin
      .from('enrollments')
      .update({ deleted_at: new Date().toISOString(), pool_id: null, status: 'cancelled' })
      .eq('student_id', studentId)
      .is('deleted_at', null);

    // Remove from pool_students (safety net — redistributePoolOnInactive should have done this)
    await supabaseAdmin
      .from('pool_students')
      .delete()
      .eq('student_id', studentId);

    // Remove parent_students links so the deleted student doesn't count as a sibling
    await supabaseAdmin
      .from('parent_students')
      .delete()
      .eq('student_id', studentId);

    // 3. Soft-delete the student
    const success = await softDeleteStudent(studentId);

    if (!success) {
      return { success: false, error: "Failed to delete student record" };
    }

    revalidatePath("/student");
    revalidatePath("/pending-payments");
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
