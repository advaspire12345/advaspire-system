import { supabaseAdmin } from "@/db";
import type {
  Payment,
  PaymentInsert,
  PaymentUpdate,
  PaymentStatus,
  PaymentMethod,
  PaymentWithStudent,
} from "@/db/schema";

// ============================================
// READ OPERATIONS
// ============================================

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error) {
    console.error('Error fetching payment:', error);
    return null;
  }

  return data;
}

export async function getPaymentWithStudent(paymentId: string): Promise<PaymentWithStudent | null> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(`
      *,
      student:students(
        *,
        branch:branches(*)
      )
    `)
    .eq('id', paymentId)
    .single();

  if (error) {
    console.error('Error fetching payment with student:', error);
    return null;
  }

  return data as PaymentWithStudent;
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments by student:', error);
    return [];
  }

  return data ?? [];
}

export async function getPaymentsByStatus(
  status: PaymentStatus,
  branchId?: string
): Promise<PaymentWithStudent[]> {
  let query = supabaseAdmin
    .from('payments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payments by status:', error);
    return [];
  }

  return data as PaymentWithStudent[];
}

export async function getPaymentsByBranchId(branchId: string): Promise<PaymentWithStudent[]> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      )
    `)
    .eq('students.branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments by branch:', error);
    return [];
  }

  return data as PaymentWithStudent[];
}

export async function getPaymentsByDateRange(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<PaymentWithStudent[]> {
  let query = supabaseAdmin
    .from('payments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payments by date range:', error);
    return [];
  }

  return data as PaymentWithStudent[];
}

export async function getRecentPayments(
  branchId?: string,
  limit = 50
): Promise<PaymentWithStudent[]> {
  let query = supabaseAdmin
    .from('payments')
    .select(`
      *,
      student:students!inner(
        *,
        branch:branches(*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent payments:', error);
    return [];
  }

  return data as PaymentWithStudent[];
}

export async function getPendingPayments(branchId?: string): Promise<PaymentWithStudent[]> {
  return getPaymentsByStatus('pending', branchId);
}

// ============================================
// STATISTICS
// ============================================

export interface PaymentStats {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
}

export async function getPaymentStats(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<PaymentStats> {
  let query = supabaseAdmin
    .from('payments')
    .select('amount, status, students!inner(branch_id)')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment stats:', error);
    return {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      totalCount: 0,
      paidCount: 0,
      pendingCount: 0,
    };
  }

  const payments = data ?? [];
  const paidPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return {
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paidAmount: paidPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    pendingAmount: pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    totalCount: payments.length,
    paidCount: paidPayments.length,
    pendingCount: pendingPayments.length,
  };
}

export async function getTotalRevenue(startDate: string, endDate: string, branchId?: string): Promise<number> {
  let query = supabaseAdmin
    .from('payments')
    .select('amount, students!inner(branch_id)')
    .eq('status', 'paid')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (branchId) {
    query = query.eq('students.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching total revenue:', error);
    return 0;
  }

  return (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createPayment(paymentData: PaymentInsert): Promise<Payment | null> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    return null;
  }

  return data;
}

export async function updatePayment(paymentId: string, paymentData: PaymentUpdate): Promise<Payment | null> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(paymentData)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    return null;
  }

  return data;
}

export async function markPaymentAsPaid(
  paymentId: string,
  paymentMethod?: PaymentMethod
): Promise<Payment | null> {
  return updatePayment(paymentId, {
    status: 'paid',
    payment_method: paymentMethod,
    paid_at: new Date().toISOString(),
  });
}

export async function markPaymentAsFailed(paymentId: string): Promise<Payment | null> {
  return updatePayment(paymentId, { status: 'failed' });
}

export async function refundPayment(paymentId: string): Promise<Payment | null> {
  return updatePayment(paymentId, { status: 'refunded' });
}

export async function deletePayment(paymentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('payments')
    .delete()
    .eq('id', paymentId);

  if (error) {
    console.error('Error deleting payment:', error);
    return false;
  }

  return true;
}

// ============================================
// STUDENT PAYMENT SUMMARY
// ============================================

export interface StudentPaymentSummary {
  studentId: string;
  totalPaid: number;
  totalPending: number;
  lastPaymentDate: string | null;
  paymentCount: number;
}

export async function getStudentPaymentSummary(studentId: string): Promise<StudentPaymentSummary> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('amount, status, paid_at')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching student payment summary:', error);
    return {
      studentId,
      totalPaid: 0,
      totalPending: 0,
      lastPaymentDate: null,
      paymentCount: 0,
    };
  }

  const payments = data ?? [];
  const paidPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  // Find the most recent paid_at date
  const lastPaymentDate = paidPayments
    .filter(p => p.paid_at)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
    [0]?.paid_at ?? null;

  return {
    studentId,
    totalPaid: paidPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    totalPending: pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    lastPaymentDate,
    paymentCount: payments.length,
  };
}

// ============================================
// PENDING PAYMENTS TABLE DATA
// ============================================

export interface PendingPaymentRow {
  id: string;
  parentName: string | null;
  parentPhone: string | null;
  studentId: string;
  studentName: string;
  studentPhone: string | null;
  branchId: string;
  branchName: string;
  courseId: string | null;
  courseName: string | null;
  packageId: string | null;
  packageName: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus;
  receiptPhoto: string | null;
  createdAt: string;
  paidAt: string | null;
}

export async function getPendingPaymentsForTable(
  userEmail: string
): Promise<PendingPaymentRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      status,
      receipt_photo,
      created_at,
      paid_at,
      course_id,
      package_id,
      student:students!inner(
        id,
        name,
        phone,
        branch_id,
        branch:branches!inner(id, name),
        parent_students(
          parent:parents(id, name, phone)
        )
      ),
      course:courses(name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (userBranchId) {
    query = query.eq('students.branch_id', userBranchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pending payments:', error);
    return [];
  }

  // Get all course_pricing to match packages by course_id and amount
  const { data: allPricing } = await supabaseAdmin
    .from('course_pricing')
    .select('id, course_id, package_type, duration, price')
    .is('deleted_at', null);

  const pricingMap = new Map<string, { packageType: string; duration: number }>();
  for (const p of allPricing ?? []) {
    // Key by course_id + price for matching
    const key = `${p.course_id}-${p.price}`;
    pricingMap.set(key, { packageType: p.package_type, duration: p.duration });
  }

  return (data ?? []).map((payment) => {
    // Handle nested relations
    const student = payment.student as unknown as {
      id: string;
      name: string;
      phone: string | null;
      branch_id: string;
      branch: { id: string; name: string };
      parent_students: Array<{
        parent: { id: string; name: string; phone: string | null } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;

    // Get parent info (first parent if multiple)
    const parentInfo = student.parent_students?.[0]?.parent;

    // Look up package from course_pricing by course_id and amount
    let packageName: string | null = null;
    if (courseId) {
      const key = `${courseId}-${payment.amount}`;
      const pricing = pricingMap.get(key);
      if (pricing) {
        const typeLabel = pricing.packageType === 'monthly' ? 'Month' : 'Session';
        const plural = pricing.duration > 1 ? 's' : '';
        packageName = `${pricing.duration} ${typeLabel}${plural}`;
      }
    }

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentPhone: parentInfo?.phone ?? null,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      branchId: student.branch_id,
      branchName: student.branch.name,
      courseId,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName,
      price: payment.amount,
      paymentMethod: payment.payment_method as PaymentMethod | null,
      status: payment.status as PaymentStatus,
      receiptPhoto: payment.receipt_photo,
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
    };
  });
}

export async function approvePayment(paymentId: string): Promise<Payment | null> {
  // Get the payment details to find the package and student
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    console.error('Payment not found:', paymentId);
    return null;
  }

  // If payment has a course, look up the package from course_pricing
  if (payment.course_id && payment.amount) {
    const { data: pricingData } = await supabaseAdmin
      .from('course_pricing')
      .select('id, package_type, duration')
      .eq('course_id', payment.course_id)
      .eq('price', payment.amount)
      .is('deleted_at', null)
      .maybeSingle();

    if (pricingData) {
      // Get the enrollment - first try matching course_id
      let { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id, sessions_remaining, package_id, course_id')
        .eq('student_id', payment.student_id)
        .eq('course_id', payment.course_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle();

      // If no enrollment found for payment's course, find any active enrollment for this student
      // This handles the case where package was changed in pending payment modal
      if (!enrollment) {
        const { data: anyEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id, sessions_remaining, package_id, course_id')
          .eq('student_id', payment.student_id)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyEnrollment) {
          enrollment = anyEnrollment;
          // Also update the enrollment's course_id to match the payment
          await supabaseAdmin
            .from('enrollments')
            .update({
              course_id: payment.course_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anyEnrollment.id);
        }
      }

      if (enrollment) {
        const currentSessions = enrollment.sessions_remaining || 0;

        if (pricingData.package_type === 'session') {
          // For session-based packages, add sessions to the enrollment
          const newSessions = currentSessions + pricingData.duration;

          await supabaseAdmin
            .from('enrollments')
            .update({
              sessions_remaining: newSessions,
              package_id: pricingData.id, // Also update package_id if not set
              updated_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id);
        } else if (pricingData.package_type === 'monthly') {
          // For monthly packages, set sessions to duration (e.g., 1 for 1 month)
          // This represents the number of months paid
          // period_start will be set on first attendance
          const newSessions = currentSessions + pricingData.duration;

          await supabaseAdmin
            .from('enrollments')
            .update({
              sessions_remaining: newSessions,
              package_id: pricingData.id, // Also update package_id if not set
              updated_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id);
        }
      }
    }
  }

  // Add admin contribution from payment (5% of adcoins from advaspire to branch admin)
  try {
    const { getSettings } = await import("./settings");
    const { getUserById, getUserByEmail, updateUserAdcoinBalance } = await import("./users");
    const { getBranchById } = await import("./branches");

    const settings = await getSettings();
    const adcoinPerRm = parseInt(settings.adcoin_per_rm) || 333;
    const poolPct = parseFloat(settings.pool_percentage) || 5;
    const poolEmail = settings.pool_account_email || 'advaspire@gmail.com';

    const totalAdcoins = payment.amount * adcoinPerRm;
    const poolAmount = Math.floor(totalAdcoins * (poolPct / 100));

    console.log(`[Payment Approval] Amount: RM${payment.amount}, Total Adcoins: ${totalAdcoins}, Pool (${poolPct}%): ${poolAmount}`);

    if (poolAmount > 0 && payment.student_id) {
      // Get pool account (advaspire@gmail.com)
      const poolUser = await getUserByEmail(poolEmail);
      if (!poolUser) {
        console.log(`[Payment Approval] Pool account ${poolEmail} not found`);
      }

      // Get student's branch
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('branch_id')
        .eq('id', payment.student_id)
        .single();

      console.log(`[Payment Approval] Student branch_id: ${student?.branch_id}`);

      if (student?.branch_id) {
        // Get branch admin
        const branch = await getBranchById(student.branch_id);
        console.log(`[Payment Approval] Branch: ${branch?.name}, Admin ID: ${branch?.admin_id}`);

        if (branch?.admin_id) {
          const admin = await getUserById(branch.admin_id);
          if (admin) {
            const currentBalance = admin.adcoin_balance || 0;
            const newBalance = currentBalance + poolAmount;
            await updateUserAdcoinBalance(admin.id, newBalance);

            console.log(`[Payment Approval] Admin ${admin.name} receives ${poolAmount} adcoins (${currentBalance} → ${newBalance})`);

            // Record transaction - from advaspire (pool) to branch admin
            await supabaseAdmin.from('adcoin_transactions').insert({
              sender_id: poolUser?.id || null,
              receiver_id: admin.id,
              amount: poolAmount,
              type: 'transfer',
              description: `Admin contribution from payment RM${payment.amount}`,
            });
          }
        } else {
          console.log(`[Payment Approval] No admin set for branch ${branch?.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error adding admin contribution:', error);
    // Continue with payment approval even if contribution fails
  }

  return updatePayment(paymentId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  });
}

// ============================================
// PAYMENT RECORDS TABLE DATA (paid payments)
// ============================================

export interface PaymentRecordRow {
  id: string;
  parentName: string | null;
  studentId: string;
  studentName: string;
  branchId: string;
  branchName: string;
  branchCompanyName: string | null;
  branchAddress: string | null;
  branchPhone: string | null;
  branchEmail: string | null;
  branchBankName: string | null;
  branchBankAccount: string | null;
  courseId: string | null;
  courseName: string | null;
  packageId: string | null;
  packageName: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
  invoiceNumber: string | null;
}

export async function getPaymentRecordsForTable(
  userEmail: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentRecordRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIdByEmail } = await import("./users");
  const userBranchId = await getUserBranchIdByEmail(userEmail);

  let query = supabaseAdmin
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      paid_at,
      receipt_photo,
      invoice_number,
      course_id,
      package_id,
      student:students!inner(
        id,
        name,
        branch_id,
        branch:branches!inner(id, name, company_name, address, phone, email, bank_name, bank_account),
        parent_students(
          parent:parents(id, name)
        )
      ),
      course:courses(name)
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false });

  if (userBranchId) {
    query = query.eq('students.branch_id', userBranchId);
  }

  if (startDate) {
    query = query.gte('paid_at', startDate);
  }

  if (endDate) {
    // Add one day to include the end date fully
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    query = query.lt('paid_at', endDateObj.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment records:', error);
    return [];
  }

  // Get all course_pricing to match packages by course_id and amount
  const { data: allPricing } = await supabaseAdmin
    .from('course_pricing')
    .select('id, course_id, package_type, duration, price')
    .is('deleted_at', null);

  const pricingMap = new Map<string, { packageType: string; duration: number }>();
  for (const p of allPricing ?? []) {
    // Key by course_id + price for matching
    const key = `${p.course_id}-${p.price}`;
    pricingMap.set(key, { packageType: p.package_type, duration: p.duration });
  }

  return (data ?? []).map((payment) => {
    // Handle nested relations
    const student = payment.student as unknown as {
      id: string;
      name: string;
      branch_id: string;
      branch: {
        id: string;
        name: string;
        company_name: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        bank_name: string | null;
        bank_account: string | null;
      };
      parent_students: Array<{
        parent: { id: string; name: string } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;

    // Get parent info (first parent if multiple)
    const parentInfo = student.parent_students?.[0]?.parent;

    // Look up package from course_pricing by course_id and amount
    let packageName: string | null = null;
    if (courseId) {
      const key = `${courseId}-${payment.amount}`;
      const pricing = pricingMap.get(key);
      if (pricing) {
        const typeLabel = pricing.packageType === 'monthly' ? 'Month' : 'Session';
        const plural = pricing.duration > 1 ? 's' : '';
        packageName = `${pricing.duration} ${typeLabel}${plural}`;
      }
    }

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      studentId: student.id,
      studentName: student.name,
      branchId: student.branch_id,
      branchName: student.branch.name,
      branchCompanyName: student.branch.company_name,
      branchAddress: student.branch.address,
      branchPhone: student.branch.phone,
      branchEmail: student.branch.email,
      branchBankName: student.branch.bank_name,
      branchBankAccount: student.branch.bank_account,
      courseId,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName,
      price: payment.amount,
      paymentMethod: payment.payment_method as PaymentMethod | null,
      paidAt: payment.paid_at,
      receiptPhoto: payment.receipt_photo,
      invoiceNumber: payment.invoice_number,
    };
  });
}
