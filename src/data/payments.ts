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
      course:courses(name),
      package:packages(name)
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
    const pkg = payment.package as unknown as { name: string } | null;

    // Get parent info (first parent if multiple)
    const parentInfo = student.parent_students?.[0]?.parent;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentPhone: parentInfo?.phone ?? null,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      branchId: student.branch_id,
      branchName: student.branch.name,
      courseId: (payment as unknown as { course_id: string | null }).course_id,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName: pkg?.name ?? null,
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
  return updatePayment(paymentId, {
    status: 'paid',
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
        branch:branches!inner(id, name),
        parent_students(
          parent:parents(id, name)
        )
      ),
      course:courses(name),
      package:packages(name)
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

  return (data ?? []).map((payment) => {
    // Handle nested relations
    const student = payment.student as unknown as {
      id: string;
      name: string;
      branch_id: string;
      branch: { id: string; name: string };
      parent_students: Array<{
        parent: { id: string; name: string } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string } | null;
    const pkg = payment.package as unknown as { name: string } | null;

    // Get parent info (first parent if multiple)
    const parentInfo = student.parent_students?.[0]?.parent;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      studentId: student.id,
      studentName: student.name,
      branchId: student.branch_id,
      branchName: student.branch.name,
      courseId: (payment as unknown as { course_id: string | null }).course_id,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName: pkg?.name ?? null,
      price: payment.amount,
      paymentMethod: payment.payment_method as PaymentMethod | null,
      paidAt: payment.paid_at,
      receiptPhoto: payment.receipt_photo,
      invoiceNumber: payment.invoice_number,
    };
  });
}
