import { supabaseAdmin } from "@/db";
import type { Voucher, VoucherInsert } from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get available vouchers for a student, optionally filtered by course
 */
export async function getAvailableVouchersForStudent(
  studentId: string,
  courseId?: string
): Promise<Voucher[]> {
  let query = supabaseAdmin
    .from('vouchers')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'available')
    .order('amount', { ascending: false });

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching available vouchers:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Check if a student has any available voucher for a course
 */
export async function hasAvailableVoucher(
  studentId: string,
  courseId: string
): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .eq('status', 'available');

  if (error) {
    console.error('Error checking voucher availability:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new voucher
 */
export async function createVoucher(data: VoucherInsert): Promise<Voucher | null> {
  const { data: voucher, error } = await supabaseAdmin
    .from('vouchers')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating voucher:', error);
    return null;
  }

  console.log('[Voucher] Created voucher:', voucher.id, 'Amount:', voucher.amount);
  return voucher;
}

/**
 * Redeem a voucher by linking it to a payment
 */
export async function redeemVoucher(
  voucherId: string,
  paymentId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('vouchers')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
      redeemed_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', voucherId)
    .eq('status', 'available');

  if (error) {
    console.error('Error redeeming voucher:', error);
    return false;
  }

  console.log('[Voucher] Redeemed voucher:', voucherId, 'for payment:', paymentId);
  return true;
}

// ============================================
// VOUCHER ELIGIBILITY CHECK
// ============================================

/**
 * Check if a student used all sessions within the completion month deadline
 * and create a voucher if eligible. Called when sessions_remaining hits 0.
 *
 * Logic: if the student's attendance count equals the session count (duration)
 * and all sessions were completed within completion_months from first attendance,
 * they earn a voucher worth voucher_amount (RM).
 */
export async function checkAndCreateVoucher(enrollmentId: string): Promise<Voucher | null> {
  // Get enrollment with pricing info
  const { data: enrollment, error: enrollError } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      package_id,
      expires_at,
      package:course_pricing(
        id,
        duration,
        voucher_amount,
        completion_months
      )
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrollError || !enrollment) {
    console.error('[Voucher Check] Error fetching enrollment:', enrollError);
    return null;
  }

  const pricing = enrollment.package as unknown as {
    id: string;
    duration: number;
    voucher_amount: number | null;
    completion_months: number | null;
  } | null;

  if (!pricing?.voucher_amount || !pricing?.completion_months) {
    console.log('[Voucher Check] No voucher config on pricing (need voucher_amount and completion_months), skipping');
    return null;
  }

  // Check if voucher already exists for this enrollment
  const { count: existingCount } = await supabaseAdmin
    .from('vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId);

  if ((existingCount ?? 0) > 0) {
    console.log('[Voucher Check] Voucher already exists for enrollment:', enrollmentId);
    return null;
  }

  // Count how many sessions the student actually attended
  const { count: attendanceCount } = await supabaseAdmin
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .in('status', ['present', 'late']);

  const totalAttended = attendanceCount ?? 0;
  const requiredSessions = pricing.duration;

  console.log('[Voucher Check] Attendance:', totalAttended, '/ Required:', requiredSessions);

  if (totalAttended < requiredSessions) {
    console.log('[Voucher Check] Not enough attendance to earn voucher');
    return null;
  }

  // Get the first attendance date to determine the completion deadline
  const { data: firstAttendance } = await supabaseAdmin
    .from('attendance')
    .select('date')
    .eq('enrollment_id', enrollmentId)
    .in('status', ['present', 'late'])
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstAttendance) {
    console.log('[Voucher Check] No attendance found for enrollment:', enrollmentId);
    return null;
  }

  // Calculate deadline: first attendance + completion_months
  const firstDate = new Date(firstAttendance.date);
  const deadline = new Date(firstDate);
  deadline.setMonth(deadline.getMonth() + pricing.completion_months);

  // Get the last attendance date to check if all sessions were completed within deadline
  const { data: lastAttendance } = await supabaseAdmin
    .from('attendance')
    .select('date')
    .eq('enrollment_id', enrollmentId)
    .in('status', ['present', 'late'])
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastDate = lastAttendance ? new Date(lastAttendance.date) : new Date();

  if (lastDate > deadline) {
    console.log('[Voucher Check] Sessions not completed within completion period (' + pricing.completion_months + ' months). Last attendance:', lastDate.toISOString(), 'Deadline:', deadline.toISOString());
    return null;
  }

  // Student completed all sessions within the completion period — create voucher
  console.log('[Voucher Check] Eligible! Completed', totalAttended, 'sessions within', pricing.completion_months, 'months. Creating voucher for RM', pricing.voucher_amount);

  return createVoucher({
    student_id: enrollment.student_id,
    enrollment_id: enrollmentId,
    pricing_id: pricing.id,
    course_id: enrollment.course_id,
    amount: pricing.voucher_amount,
  });
}
