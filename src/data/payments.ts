import { supabaseAdmin } from "@/db";
import type {
  Payment,
  PaymentInsert,
  PaymentUpdate,
  PaymentStatus,
  PaymentMethod,
  PaymentWithStudent,
  InvoiceSnapshot,
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
  console.log('[Create Payment] Inserting payment:', paymentData);

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('[Create Payment] Error creating payment:', error);
    console.error('[Create Payment] Error details:', JSON.stringify(error, null, 2));
    return null;
  }

  console.log('[Create Payment] Payment created successfully:', data.id);
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
  // Shared package info
  isSharedPackage: boolean;
  poolId: string | null;
  sharedStudentNames: string[] | null; // All sibling names for shared packages
  // Voucher info
  hasVoucher: boolean;
  voucherAmount: number | null;
}

export async function getPendingPaymentsForTable(
  userEmail: string
): Promise<PendingPaymentRow[]> {
  console.log('[getPendingPaymentsForTable] Starting query for user:', userEmail);

  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }

    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", [...companyIds])
        .in("type", ["hq", "branch"])
        .is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

  console.log('[getPendingPaymentsForTable] User branch IDs:', branchIds);

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
      pool_id,
      is_shared_package,
      student:students!inner(
        id,
        name,
        phone,
        branch_id,
        branch:branches!inner(id, name, city),
        parent_students(
          parent:parents(id, name, phone)
        )
      ),
      course:courses(name, code)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (branchIds) {
    query = query.in('students.branch_id', branchIds);
  }

  const { data, error } = await query;

  console.log('[getPendingPaymentsForTable] Query result - count:', data?.length || 0);

  if (error) {
    console.error('[getPendingPaymentsForTable] Error fetching pending payments:', error);
    return [];
  }

  if (data && data.length > 0) {
    console.log('[getPendingPaymentsForTable] Found payments:', data.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      studentName: (p.student as any)?.name,
    })));
  } else {
    console.log('[getPendingPaymentsForTable] No pending payments found');

    // Debug: Check if there are ANY pending payments in the database
    const { count: totalPending } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log('[getPendingPaymentsForTable] Total pending payments in DB:', totalPending);
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

  // Get all pool IDs from payments that have pool_id
  const poolIds = (data ?? [])
    .map((p) => (p as unknown as { pool_id: string | null }).pool_id)
    .filter((id): id is string => id !== null);

  // Fetch siblings for all pools in one query
  const poolSiblingsMap = new Map<string, string[]>();
  if (poolIds.length > 0) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select(`
        pool_id,
        student:students(name)
      `)
      .in('pool_id', poolIds);

    // Group by pool_id
    for (const ps of poolStudents ?? []) {
      const studentData = ps.student as unknown as { name: string };
      const existing = poolSiblingsMap.get(ps.pool_id) ?? [];
      existing.push(studentData.name);
      poolSiblingsMap.set(ps.pool_id, existing);
    }
  }

  // Check voucher availability for each student+course combo
  const voucherMap = new Map<string, number>(); // key: studentId-courseId -> amount
  const studentCourseKeys = new Set<string>();
  for (const payment of data ?? []) {
    const student = payment.student as unknown as { id: string };
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    if (courseId) {
      studentCourseKeys.add(`${student.id}|${courseId}`);
    }
  }
  if (studentCourseKeys.size > 0) {
    // Batch fetch available vouchers
    const { data: availableVouchers } = await supabaseAdmin
      .from('vouchers')
      .select('student_id, course_id, amount')
      .eq('status', 'available');

    for (const v of availableVouchers ?? []) {
      const key = `${v.student_id}|${v.course_id}`;
      if (studentCourseKeys.has(key)) {
        // Keep the highest voucher amount
        const existing = voucherMap.get(key) ?? 0;
        if (v.amount > existing) {
          voucherMap.set(key, v.amount);
        }
      }
    }
  }

  return (data ?? []).map((payment) => {
    // Handle nested relations
    const student = payment.student as unknown as {
      id: string;
      name: string;
      phone: string | null;
      branch_id: string;
      branch: { id: string; name: string; city: string | null };
      parent_students: Array<{
        parent: { id: string; name: string; phone: string | null } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    const poolId = (payment as unknown as { pool_id: string | null }).pool_id;
    const isSharedPackage = (payment as unknown as { is_shared_package: boolean }).is_shared_package ?? false;

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

    // Get shared student names from pool
    const sharedStudentNames = poolId ? (poolSiblingsMap.get(poolId) ?? null) : null;

    // Check voucher availability
    const voucherKey = courseId ? `${student.id}|${courseId}` : '';
    const voucherAmount = voucherKey ? (voucherMap.get(voucherKey) ?? null) : null;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentPhone: parentInfo?.phone ?? null,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      branchId: student.branch_id,
      branchName: useCityName ? (student.branch.city || student.branch.name) : student.branch.name,
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
      // Shared package info
      isSharedPackage: isSharedPackage || !!poolId,
      poolId,
      sharedStudentNames,
      // Voucher info
      hasVoucher: voucherAmount !== null && voucherAmount > 0,
      voucherAmount,
    };
  });
}

export async function getPendingPaymentsForTablePaginated(
  userEmail: string,
  options: { offset: number; limit: number }
): Promise<{ rows: PendingPaymentRow[]; totalCount: number }> {
  console.log('[getPendingPaymentsForTablePaginated] Starting query for user:', userEmail);

  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }

    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", [...companyIds])
        .in("type", ["hq", "branch"])
        .is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

  // --- Count query (same table, same filters) ---
  let resolvedCount = 0;
  if (branchIds) {
    const countJoinQuery = supabaseAdmin
      .from('payments')
      .select('id, student:students!inner(branch_id)', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('students.branch_id', branchIds);

    const { count: totalCount } = await countJoinQuery;
    resolvedCount = totalCount ?? 0;
  } else {
    const { count: totalCount } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    resolvedCount = totalCount ?? 0;
  }

  // --- Main paginated query ---
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
      pool_id,
      is_shared_package,
      student:students!inner(
        id,
        name,
        phone,
        branch_id,
        branch:branches!inner(id, name, city),
        parent_students(
          parent:parents(id, name, phone)
        )
      ),
      course:courses(name, code)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (branchIds) {
    query = query.in('students.branch_id', branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getPendingPaymentsForTablePaginated] Error fetching pending payments:', error);
    return { rows: [], totalCount: 0 };
  }

  // Get all course_pricing to match packages by course_id and amount
  const { data: allPricing } = await supabaseAdmin
    .from('course_pricing')
    .select('id, course_id, package_type, duration, price')
    .is('deleted_at', null);

  const pricingMap = new Map<string, { packageType: string; duration: number }>();
  for (const p of allPricing ?? []) {
    const key = `${p.course_id}-${p.price}`;
    pricingMap.set(key, { packageType: p.package_type, duration: p.duration });
  }

  // Get all pool IDs from payments that have pool_id
  const poolIds = (data ?? [])
    .map((p) => (p as unknown as { pool_id: string | null }).pool_id)
    .filter((id): id is string => id !== null);

  // Fetch siblings for all pools in one query
  const poolSiblingsMap = new Map<string, string[]>();
  if (poolIds.length > 0) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select(`
        pool_id,
        student:students(name)
      `)
      .in('pool_id', poolIds);

    for (const ps of poolStudents ?? []) {
      const studentData = ps.student as unknown as { name: string };
      const existing = poolSiblingsMap.get(ps.pool_id) ?? [];
      existing.push(studentData.name);
      poolSiblingsMap.set(ps.pool_id, existing);
    }
  }

  // Check voucher availability for each student+course combo
  const voucherMap = new Map<string, number>();
  const studentCourseKeys = new Set<string>();
  for (const payment of data ?? []) {
    const student = payment.student as unknown as { id: string };
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    if (courseId) {
      studentCourseKeys.add(`${student.id}|${courseId}`);
    }
  }
  if (studentCourseKeys.size > 0) {
    const { data: availableVouchers } = await supabaseAdmin
      .from('vouchers')
      .select('student_id, course_id, amount')
      .eq('status', 'available');

    for (const v of availableVouchers ?? []) {
      const key = `${v.student_id}|${v.course_id}`;
      if (studentCourseKeys.has(key)) {
        const existing = voucherMap.get(key) ?? 0;
        if (v.amount > existing) {
          voucherMap.set(key, v.amount);
        }
      }
    }
  }

  const rows: PendingPaymentRow[] = (data ?? []).map((payment) => {
    const student = payment.student as unknown as {
      id: string;
      name: string;
      phone: string | null;
      branch_id: string;
      branch: { id: string; name: string; city: string | null };
      parent_students: Array<{
        parent: { id: string; name: string; phone: string | null } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    const poolId = (payment as unknown as { pool_id: string | null }).pool_id;
    const isSharedPackage = (payment as unknown as { is_shared_package: boolean }).is_shared_package ?? false;

    const parentInfo = student.parent_students?.[0]?.parent;

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

    const sharedStudentNames = poolId ? (poolSiblingsMap.get(poolId) ?? null) : null;

    const voucherKey = courseId ? `${student.id}|${courseId}` : '';
    const voucherAmount = voucherKey ? (voucherMap.get(voucherKey) ?? null) : null;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentPhone: parentInfo?.phone ?? null,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      branchId: student.branch_id,
      branchName: useCityName ? (student.branch.city || student.branch.name) : student.branch.name,
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
      isSharedPackage: isSharedPackage || !!poolId,
      poolId,
      sharedStudentNames,
      hasVoucher: voucherAmount !== null && voucherAmount > 0,
      voucherAmount,
    };
  });

  return { rows, totalCount: resolvedCount };
}

/**
 * Creates a frozen invoice snapshot for a payment.
 * Captures all display data (company info, student names, items) at the moment of payment.
 * This snapshot is immutable after 1 week — even if company name, student names, etc. change later.
 */
export async function createInvoiceSnapshot(paymentId: string): Promise<InvoiceSnapshot | null> {
  // Fetch all data needed for the invoice in one go
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select(`
      id, amount, course_id, package_id, pool_id, is_shared_package,
      student:students!inner(
        id, name, branch_id,
        branch:branches!inner(id, name, city, parent_id, address, phone, email, bank_name, bank_account),
        parent_students(parent:parents(id, name, address, postcode, city))
      ),
      course:courses(name, code)
    `)
    .eq('id', paymentId)
    .single();

  if (!payment) return null;

  const student = payment.student as unknown as {
    id: string; name: string; branch_id: string;
    branch: { id: string; name: string; city: string | null; parent_id: string | null; address: string | null; phone: string | null; email: string | null; bank_name: string | null; bank_account: string | null };
    parent_students: Array<{ parent: { id: string; name: string; address: string | null; postcode: string | null; city: string | null } | null }>;
  };
  const course = payment.course as unknown as { name: string; code: string | null } | null;
  const parentInfo = student.parent_students?.[0]?.parent;
  const poolId = (payment as unknown as { pool_id: string | null }).pool_id;
  const isSharedPackage = (payment as unknown as { is_shared_package: boolean }).is_shared_package ?? false;

  // Get branch company name
  let branchCompanyName: string | null = null;
  if (student.branch.parent_id) {
    const { data: company } = await supabaseAdmin
      .from('branches').select('name').eq('id', student.branch.parent_id).eq('type', 'company').maybeSingle();
    branchCompanyName = company?.name ?? null;
  }

  // Get package info
  let packageName: string | null = null;
  let packageDuration: number | null = null;
  let packageType: "monthly" | "session" | null = null;
  const courseId = (payment as unknown as { course_id: string | null }).course_id;
  if (courseId) {
    const { data: pricing } = await supabaseAdmin
      .from('course_pricing')
      .select('package_type, duration, price')
      .eq('course_id', courseId)
      .eq('price', payment.amount)
      .is('deleted_at', null)
      .maybeSingle();
    if (pricing) {
      const typeLabel = pricing.package_type === 'monthly' ? 'Month' : 'Session';
      const plural = pricing.duration > 1 ? 's' : '';
      packageName = `${pricing.duration} ${typeLabel}${plural}`;
      packageDuration = pricing.duration;
      packageType = pricing.package_type as "monthly" | "session";
    }
  }

  // Get shared student names from pool
  let sharedStudentNames: string[] | null = null;
  if (poolId) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select('student:students(name)')
      .eq('pool_id', poolId);
    sharedStudentNames = (poolStudents ?? []).map((ps) => (ps.student as unknown as { name: string }).name);
  }

  // Build bill-to address
  const parentAddress = parentInfo?.address ?? null;
  const parentPostcode = parentInfo?.postcode ?? null;
  const parentCity = parentInfo?.city ?? null;
  const addressParts: string[] = [];
  if (parentAddress) addressParts.push(parentAddress);
  const postcodeCity = [parentPostcode, parentCity].filter(Boolean).join(' ');
  if (postcodeCity) addressParts.push(postcodeCity);
  const billToAddress = addressParts.length > 0 ? addressParts.join('\n') : null;

  // Build invoice items
  const items: Array<{ code: string; product: string; qty: number; rate: number }> = [];
  const packageCode = course?.code ?? 'PKG';
  const duration = packageDuration ?? 1;
  const isSession = packageType === 'session' || packageName?.toLowerCase().includes('session');
  const unitLabel = isSession ? 'Session' : 'Month';

  if ((isSharedPackage || !!poolId) && sharedStudentNames && sharedStudentNames.length > 1) {
    // Shared package: equal split per sibling
    const siblingCount = sharedStudentNames.length;
    const splitSessions = Math.floor(duration / siblingCount);
    const splitPrice = payment.amount / siblingCount;

    for (const name of sharedStudentNames) {
      items.push({
        code: packageCode,
        product: `${course?.name ?? 'Course'} - ${splitSessions} ${unitLabel}${splitSessions > 1 ? 's' : ''}\n(${name})`,
        qty: 1,
        rate: splitPrice,
      });
    }
  } else {
    // Solo: single item
    items.push({
      code: packageCode,
      product: `${course?.name ?? 'Course'} - ${duration} ${unitLabel}${duration > 1 ? 's' : ''}\n(${student.name})`,
      qty: 1,
      rate: payment.amount,
    });
  }

  const snapshot: InvoiceSnapshot = {
    billToName: parentInfo?.name ?? student.name,
    billToAddress,
    billToContact: null,
    studentName: student.name,
    sharedStudentNames,
    isSharedPackage: isSharedPackage || !!poolId,
    courseName: course?.name ?? null,
    courseCode: course?.code ?? null,
    packageName,
    packageDuration,
    packageType,
    price: payment.amount,
    branchName: student.branch.name,
    branchCompanyName,
    branchAddress: student.branch.address,
    branchPhone: student.branch.phone,
    branchEmail: student.branch.email,
    branchBankName: student.branch.bank_name,
    branchBankAccount: student.branch.bank_account,
    items,
    total: payment.amount,
  };

  // Save snapshot to the payment record
  await supabaseAdmin
    .from('payments')
    .update({ invoice_snapshot: snapshot as unknown as Record<string, unknown> })
    .eq('id', paymentId);

  return snapshot;
}

export async function approvePayment(paymentId: string): Promise<Payment | null> {
  // Get the payment details to find the package and student
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    console.error('Payment not found:', paymentId);
    return null;
  }

  // Auto-detect and apply voucher
  let appliedVoucherId: string | null = null;
  let discountAmount: number | null = null;

  if (payment.course_id) {
    const { getAvailableVouchersForStudent, redeemVoucher } = await import("./vouchers");
    const vouchers = await getAvailableVouchersForStudent(payment.student_id, payment.course_id);
    if (vouchers.length > 0) {
      const bestVoucher = vouchers[0]; // Already sorted by amount desc
      appliedVoucherId = bestVoucher.id;
      discountAmount = bestVoucher.amount;
      console.log(`[Payment Approval] Auto-applying voucher ${bestVoucher.id} for RM${bestVoucher.amount} discount`);
    }
  }

  // IMPORTANT: Update payment status to 'paid' FIRST before any session tracking
  // This prevents createEnrollmentRenewalPayment from finding this payment as "existing pending"
  const updatedPayment = await updatePayment(paymentId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    ...(appliedVoucherId ? { voucher_id: appliedVoucherId, discount_amount: discountAmount } : {}),
  });

  if (!updatedPayment) {
    console.error('Failed to update payment status');
    return null;
  }

  // Redeem the voucher if one was applied
  if (appliedVoucherId) {
    const { redeemVoucher } = await import("./vouchers");
    await redeemVoucher(appliedVoucherId, paymentId);
  }

  // Create frozen invoice snapshot (immutable after 1 week)
  await createInvoiceSnapshot(paymentId);

  // Check if this is a pool payment (shared sibling package)
  if (payment.pool_id) {
    // Add sessions to the shared pool instead of individual enrollment
    const { addPoolSessions, getPoolById } = await import("./pools");

    // Get the pricing info to know how many sessions to add
    if (payment.course_id && payment.amount) {
      const { data: pricingData } = await supabaseAdmin
        .from('course_pricing')
        .select('id, package_type, duration')
        .eq('course_id', payment.course_id)
        .eq('price', payment.amount)
        .is('deleted_at', null)
        .maybeSingle();

      if (pricingData) {
        const sessionsToAdd = pricingData.duration;
        const newRemaining = await addPoolSessions(payment.pool_id, sessionsToAdd);
        console.log(`[Pool Payment] Added ${sessionsToAdd} sessions to pool ${payment.pool_id}. New remaining: ${newRemaining}`);

        // Set package_id on the payment if not already set
        if (!payment.package_id) {
          await supabaseAdmin
            .from('payments')
            .update({ package_id: pricingData.id })
            .eq('id', paymentId);
        }

        // Update pool's package_id if not set
        const pool = await getPoolById(payment.pool_id);
        if (pool && !pool.package_id) {
          await supabaseAdmin
            .from('shared_session_pools')
            .update({ package_id: pricingData.id })
            .eq('id', payment.pool_id);
        }

        // If pool sessions are still <= 0 after payment, create a new pending payment
        if (newRemaining !== null && newRemaining <= 0) {
          console.log(`[Pool Payment] Pool sessions still <= 0 after payment, creating renewal payment...`);
          const renewalPayment = await createPoolRenewalPayment(payment.pool_id);
          if (renewalPayment) {
            console.log(`[Pool Payment] Renewal payment created: ${renewalPayment.id}`);
          } else {
            console.log(`[Pool Payment] Renewal payment not created (may already exist)`);
          }
        }
      }
    }
  } else {
    // Standard individual enrollment payment
    console.log(`[Payment Approval] Processing individual payment for student: ${payment.student_id}`);

    // Try to find pricing data by course_id and amount
    let pricingData: { id: string; package_type: string; duration: number } | null = null;

    if (payment.course_id && payment.amount) {
      const { data: pricing } = await supabaseAdmin
        .from('course_pricing')
        .select('id, package_type, duration')
        .eq('course_id', payment.course_id)
        .eq('price', payment.amount)
        .is('deleted_at', null)
        .maybeSingle();

      pricingData = pricing;
      console.log(`[Payment Approval] Pricing data found:`, pricingData);
    }

    // If no exact price match, try to find any pricing for this course
    if (!pricingData && payment.course_id) {
      const { data: fallbackPricing } = await supabaseAdmin
        .from('course_pricing')
        .select('id, package_type, duration')
        .eq('course_id', payment.course_id)
        .is('deleted_at', null)
        .order('price', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackPricing) {
        pricingData = fallbackPricing;
        console.log(`[Payment Approval] Using fallback pricing:`, pricingData);
      }
    }

    // Get the enrollment - first try matching course_id
    let enrollment: { id: string; sessions_remaining: number; package_id: string | null; course_id: string | null } | null = null;

    if (payment.course_id) {
      const { data: enrollmentData } = await supabaseAdmin
        .from('enrollments')
        .select('id, sessions_remaining, package_id, course_id')
        .eq('student_id', payment.student_id)
        .eq('course_id', payment.course_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle();

      enrollment = enrollmentData;
    }

    // If no enrollment found for payment's course, find any active enrollment for this student
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
        console.log(`[Payment Approval] Using fallback enrollment:`, enrollment.id);

        // Also update the enrollment's course_id to match the payment if payment has one
        if (payment.course_id) {
          await supabaseAdmin
            .from('enrollments')
            .update({
              course_id: payment.course_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', anyEnrollment.id);
        }
      }
    }

    if (enrollment) {
      const currentSessions = enrollment.sessions_remaining || 0;
      let newSessions = currentSessions;
      let sessionsToAdd = 0;

      if (pricingData) {
        sessionsToAdd = pricingData.duration;
        newSessions = currentSessions + sessionsToAdd;

        await supabaseAdmin
          .from('enrollments')
          .update({
            sessions_remaining: newSessions,
            package_id: pricingData.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id);

        // Set package_id on the payment if not already set
        if (!payment.package_id) {
          await supabaseAdmin
            .from('payments')
            .update({ package_id: pricingData.id })
            .eq('id', paymentId);
        }

        console.log(`[Payment Approval] Sessions updated: ${currentSessions} + ${sessionsToAdd} = ${newSessions}`);
      } else {
        // No pricing found - just log and check if renewal needed based on current sessions
        console.log(`[Payment Approval] No pricing data found, current sessions: ${currentSessions}`);
        newSessions = currentSessions; // Don't change sessions if we don't know how many to add
      }

      // ALWAYS check if sessions are still <= 0 and create renewal payment if needed
      console.log(`[Payment Approval] Checking renewal: newSessions = ${newSessions}, condition (<=0): ${newSessions <= 0}`);

      if (newSessions <= 0) {
        console.log(`[Payment Approval] *** Sessions still <= 0 after payment, creating renewal payment ***`);
        const renewalPayment = await createEnrollmentRenewalPayment(enrollment.id);
        if (renewalPayment) {
          console.log(`[Payment Approval] *** RENEWAL PAYMENT CREATED: ${renewalPayment.id} ***`);
        } else {
          console.log(`[Payment Approval] Renewal payment not created (may already exist or error)`);
        }
      } else {
        console.log(`[Payment Approval] Sessions > 0, no renewal payment needed`);
      }
    } else {
      console.log(`[Payment Approval] No enrollment found for student: ${payment.student_id}`);
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
    console.log(`[Payment Approval] Payment ID: ${paymentId}, Student ID: ${payment.student_id}, Pool ID: ${payment.pool_id}`);

    if (poolAmount > 0) {
      // Get pool account (advaspire@gmail.com)
      const poolUser = await getUserByEmail(poolEmail);
      if (!poolUser) {
        console.log(`[Payment Approval] Pool account ${poolEmail} not found`);
      }

      // For shared packages, get student from pool if student_id not directly available
      let studentId = payment.student_id;

      if (!studentId && payment.pool_id) {
        // Get first student from the pool
        const { data: poolStudent } = await supabaseAdmin
          .from('pool_students')
          .select('student_id')
          .eq('pool_id', payment.pool_id)
          .limit(1)
          .maybeSingle();

        if (poolStudent) {
          studentId = poolStudent.student_id;
          console.log(`[Payment Approval] Got student ID from pool: ${studentId}`);
        }
      }

      if (!studentId) {
        console.log(`[Payment Approval] No student ID found for payment`);
      } else {
        // Get student's branch
        const { data: student, error: studentError } = await supabaseAdmin
          .from('students')
          .select('branch_id')
          .eq('id', studentId)
          .single();

        if (studentError) {
          console.error(`[Payment Approval] Error fetching student:`, studentError);
        }

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
            } else {
              console.log(`[Payment Approval] Admin user not found for ID: ${branch.admin_id}`);
            }
          } else {
            console.log(`[Payment Approval] No admin set for branch ${branch?.name}`);
          }
        } else {
          console.log(`[Payment Approval] Student has no branch_id`);
        }
      }
    }
  } catch (error) {
    console.error('Error adding admin contribution:', error);
    // Continue with payment approval even if contribution fails
  }

  // ============================================
  // FINAL SAFETY CHECK: Ensure pending payment exists if sessions <= 0
  // ============================================
  console.log('[Payment Approval] === FINAL SAFETY CHECK ===');

  try {
    // Get the student's active enrollment
    const { data: finalEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id, student_id, course_id, package_id, sessions_remaining')
      .eq('student_id', payment.student_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (finalEnrollment) {
      console.log('[Payment Approval] Final enrollment check:', {
        id: finalEnrollment.id,
        sessions_remaining: finalEnrollment.sessions_remaining,
      });

      if (finalEnrollment.sessions_remaining <= 0) {
        // Check if pending payment exists
        const { data: existingPending } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('student_id', payment.student_id)
          .eq('status', 'pending')
          .is('pool_id', null)
          .limit(1);

        console.log('[Payment Approval] Existing pending payments:', existingPending?.length || 0);

        if (!existingPending || existingPending.length === 0) {
          console.log('[Payment Approval] *** NO PENDING PAYMENT EXISTS - FORCE CREATING ***');

          // Get price from enrollment's package first, fallback to course pricing
          let price = 0;
          if (finalEnrollment.package_id) {
            const { data: pkgPricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('id', finalEnrollment.package_id)
              .maybeSingle();
            price = pkgPricing?.price || 0;
          }
          if (price === 0 && finalEnrollment.course_id) {
            const { data: coursePricing } = await supabaseAdmin
              .from('course_pricing')
              .select('price')
              .eq('course_id', finalEnrollment.course_id)
              .is('deleted_at', null)
              .order('price', { ascending: false })
              .limit(1)
              .maybeSingle();
            price = coursePricing?.price || 0;
          }

          // Get student name
          const { data: student } = await supabaseAdmin
            .from('students')
            .select('name')
            .eq('id', payment.student_id)
            .single();

          // Force create the pending payment
          // Note: Don't set package_id - it references legacy 'packages' table, not 'course_pricing'
          // Package is looked up by course_id + amount in getPendingPaymentsForTable
          const forcePaymentData: PaymentInsert = {
            student_id: payment.student_id,
            course_id: finalEnrollment.course_id,
            amount: price,
            payment_type: 'package',
            status: 'pending',
            notes: `Package renewal for ${student?.name || 'Student'}`,
          };

          console.log('[Payment Approval] Force creating payment:', forcePaymentData);

          const { data: forceCreated, error: forceError } = await supabaseAdmin
            .from('payments')
            .insert(forcePaymentData)
            .select()
            .single();

          if (forceError) {
            console.error('[Payment Approval] FORCE CREATE ERROR:', forceError);
          } else {
            console.log('[Payment Approval] *** FORCE CREATED PAYMENT:', forceCreated.id, '***');
          }
        }
      }
    }
  } catch (finalError) {
    console.error('[Payment Approval] Final safety check error:', finalError);
  }

  // Return the already updated payment (status was set to 'paid' at the start)
  return updatedPayment;
}

// ============================================
// PAYMENT RECORDS TABLE DATA (paid payments)
// ============================================

export interface PaymentRecordRow {
  id: string;
  parentName: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;
  studentId: string;
  courseCode: string | null;
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
  packageDuration: number | null;
  packageType: "monthly" | "session" | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
  invoiceNumber: string | null;
  // Shared package info
  isSharedPackage: boolean;
  poolId: string | null;
  sharedStudentNames: string[] | null;
  // Frozen invoice snapshot (immutable after 1 week)
  invoiceSnapshot: InvoiceSnapshot | null;
}

export async function getPaymentRecordsForTable(
  userEmail: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentRecordRow[]> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }

    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", [...companyIds])
        .in("type", ["hq", "branch"])
        .is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

  let query = supabaseAdmin
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      paid_at,
      receipt_photo,
      invoice_number,
      invoice_snapshot,
      course_id,
      package_id,
      pool_id,
      is_shared_package,
      student:students!inner(
        id,
        name,
        branch_id,
        branch:branches!inner(id, name, city, parent_id, address, phone, email, bank_name, bank_account),
        parent_students(
          parent:parents(id, name, address, postcode, city)
        )
      ),
      course:courses(name, code)
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false });

  if (branchIds) {
    query = query.in('students.branch_id', branchIds);
  }

  if (startDate) {
    // Start of day
    query = query.gte('paid_at', `${startDate}T00:00:00`);
  }

  if (endDate) {
    // End of day - include the full end date by going to next day
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDay = endDateObj.toISOString().split('T')[0];
    query = query.lt('paid_at', `${nextDay}T00:00:00`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment records:', error);
    return [];
  }

  // Fetch parent company names for branches
  const parentIds = new Set<string>();
  for (const payment of data ?? []) {
    const student = payment.student as unknown as { branch: { parent_id: string | null } };
    if (student.branch.parent_id) parentIds.add(student.branch.parent_id);
  }
  const companyNameMap = new Map<string, string>();
  if (parentIds.size > 0) {
    const { data: companies } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .in('id', [...parentIds])
      .eq('type', 'company');
    for (const c of companies ?? []) {
      companyNameMap.set(c.id, c.name);
    }
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

  // Get all pool IDs from payments that have pool_id
  const poolIds = (data ?? [])
    .map((p) => (p as unknown as { pool_id: string | null }).pool_id)
    .filter((id): id is string => id !== null);

  // Fetch siblings for all pools in one query
  const poolSiblingsMap = new Map<string, string[]>();
  if (poolIds.length > 0) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select(`
        pool_id,
        student:students(name)
      `)
      .in('pool_id', poolIds);

    // Group by pool_id
    for (const ps of poolStudents ?? []) {
      const studentData = ps.student as unknown as { name: string };
      const existing = poolSiblingsMap.get(ps.pool_id) ?? [];
      existing.push(studentData.name);
      poolSiblingsMap.set(ps.pool_id, existing);
    }
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
        city: string | null;
        parent_id: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        bank_name: string | null;
        bank_account: string | null;
      };
      parent_students: Array<{
        parent: { id: string; name: string; address: string | null; postcode: string | null; city: string | null } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string; code: string | null } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    const poolId = (payment as unknown as { pool_id: string | null }).pool_id;
    const isSharedPackage = (payment as unknown as { is_shared_package: boolean }).is_shared_package ?? false;

    // Get parent info (first parent if multiple)
    const parentInfo = student.parent_students?.[0]?.parent;
    const parentAddress = parentInfo?.address ?? null;
    const parentPostcode = parentInfo?.postcode ?? null;
    const parentCity = parentInfo?.city ?? null;
    const courseCode = course?.code ?? null;

    // Look up package from course_pricing by course_id and amount
    let packageName: string | null = null;
    let packageDuration: number | null = null;
    let packageType: "monthly" | "session" | null = null;
    if (courseId) {
      const key = `${courseId}-${payment.amount}`;
      const pricing = pricingMap.get(key);
      if (pricing) {
        const typeLabel = pricing.packageType === 'monthly' ? 'Month' : 'Session';
        const plural = pricing.duration > 1 ? 's' : '';
        packageName = `${pricing.duration} ${typeLabel}${plural}`;
        packageDuration = pricing.duration;
        packageType = pricing.packageType as "monthly" | "session";
      }
    }

    // Get shared student names from pool
    const sharedStudentNames = poolId ? (poolSiblingsMap.get(poolId) ?? null) : null;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentAddress,
      parentPostcode,
      parentCity,
      studentId: student.id,
      courseCode,
      studentName: student.name,
      branchId: student.branch_id,
      branchName: useCityName ? (student.branch.city || student.branch.name) : student.branch.name,
      branchCompanyName: student.branch.parent_id ? (companyNameMap.get(student.branch.parent_id) ?? null) : null,
      branchAddress: student.branch.address,
      branchPhone: student.branch.phone,
      branchEmail: student.branch.email,
      branchBankName: student.branch.bank_name,
      branchBankAccount: student.branch.bank_account,
      courseId,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName,
      packageDuration,
      packageType,
      price: payment.amount,
      paymentMethod: payment.payment_method as PaymentMethod | null,
      paidAt: payment.paid_at,
      receiptPhoto: payment.receipt_photo,
      invoiceNumber: payment.invoice_number,
      // Shared package info
      isSharedPackage: isSharedPackage || !!poolId,
      poolId,
      sharedStudentNames,
      invoiceSnapshot: (payment as unknown as { invoice_snapshot: InvoiceSnapshot | null }).invoice_snapshot ?? null,
    };
  });
}

export async function getPaymentRecordsForTablePaginated(
  userEmail: string,
  startDate?: string,
  endDate?: string,
  options: { offset: number; limit: number } = { offset: 0, limit: 50 }
): Promise<{ rows: PaymentRecordRow[]; totalCount: number }> {
  // Import user helpers dynamically to avoid circular imports
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }

    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", [...companyIds])
        .in("type", ["hq", "branch"])
        .is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

  // --- Count query (same table, same filters) ---
  let countQuery = branchIds
    ? supabaseAdmin
        .from('payments')
        .select('id, student:students!inner(branch_id)', { count: 'exact', head: true })
        .eq('status', 'paid')
        .in('students.branch_id', branchIds)
    : supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paid');

  if (startDate) {
    countQuery = countQuery.gte('paid_at', `${startDate}T00:00:00`);
  }
  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDay = endDateObj.toISOString().split('T')[0];
    countQuery = countQuery.lt('paid_at', `${nextDay}T00:00:00`);
  }

  const { count: totalCount } = await countQuery;

  // --- Main paginated query ---
  let query = supabaseAdmin
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      paid_at,
      receipt_photo,
      invoice_number,
      invoice_snapshot,
      course_id,
      package_id,
      pool_id,
      is_shared_package,
      student:students!inner(
        id,
        name,
        branch_id,
        branch:branches!inner(id, name, city, parent_id, address, phone, email, bank_name, bank_account),
        parent_students(
          parent:parents(id, name, address, postcode, city)
        )
      ),
      course:courses(name, code)
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (branchIds) {
    query = query.in('students.branch_id', branchIds);
  }

  if (startDate) {
    query = query.gte('paid_at', `${startDate}T00:00:00`);
  }

  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDay = endDateObj.toISOString().split('T')[0];
    query = query.lt('paid_at', `${nextDay}T00:00:00`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching paginated payment records:', error);
    return { rows: [], totalCount: 0 };
  }

  // Fetch parent company names for branches
  const parentIds = new Set<string>();
  for (const payment of data ?? []) {
    const student = payment.student as unknown as { branch: { parent_id: string | null } };
    if (student.branch.parent_id) parentIds.add(student.branch.parent_id);
  }
  const companyNameMap = new Map<string, string>();
  if (parentIds.size > 0) {
    const { data: companies } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .in('id', [...parentIds])
      .eq('type', 'company');
    for (const c of companies ?? []) {
      companyNameMap.set(c.id, c.name);
    }
  }

  // Get all course_pricing to match packages by course_id and amount
  const { data: allPricing } = await supabaseAdmin
    .from('course_pricing')
    .select('id, course_id, package_type, duration, price')
    .is('deleted_at', null);

  const pricingMap = new Map<string, { packageType: string; duration: number }>();
  for (const p of allPricing ?? []) {
    const key = `${p.course_id}-${p.price}`;
    pricingMap.set(key, { packageType: p.package_type, duration: p.duration });
  }

  // Get all pool IDs from payments that have pool_id
  const poolIds = (data ?? [])
    .map((p) => (p as unknown as { pool_id: string | null }).pool_id)
    .filter((id): id is string => id !== null);

  // Fetch siblings for all pools in one query
  const poolSiblingsMap = new Map<string, string[]>();
  if (poolIds.length > 0) {
    const { data: poolStudents } = await supabaseAdmin
      .from('pool_students')
      .select(`
        pool_id,
        student:students(name)
      `)
      .in('pool_id', poolIds);

    for (const ps of poolStudents ?? []) {
      const studentData = ps.student as unknown as { name: string };
      const existing = poolSiblingsMap.get(ps.pool_id) ?? [];
      existing.push(studentData.name);
      poolSiblingsMap.set(ps.pool_id, existing);
    }
  }

  const rows: PaymentRecordRow[] = (data ?? []).map((payment) => {
    const student = payment.student as unknown as {
      id: string;
      name: string;
      branch_id: string;
      branch: {
        id: string;
        name: string;
        city: string | null;
        parent_id: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        bank_name: string | null;
        bank_account: string | null;
      };
      parent_students: Array<{
        parent: { id: string; name: string; address: string | null; postcode: string | null; city: string | null } | null;
      }>;
    };
    const course = payment.course as unknown as { name: string; code: string | null } | null;
    const courseId = (payment as unknown as { course_id: string | null }).course_id;
    const poolId = (payment as unknown as { pool_id: string | null }).pool_id;
    const isSharedPackage = (payment as unknown as { is_shared_package: boolean }).is_shared_package ?? false;

    const parentInfo = student.parent_students?.[0]?.parent;
    const parentAddress = parentInfo?.address ?? null;
    const parentPostcode = parentInfo?.postcode ?? null;
    const parentCity = parentInfo?.city ?? null;
    const courseCode = course?.code ?? null;

    let packageName: string | null = null;
    let packageDuration: number | null = null;
    let packageType: "monthly" | "session" | null = null;
    if (courseId) {
      const key = `${courseId}-${payment.amount}`;
      const pricing = pricingMap.get(key);
      if (pricing) {
        const typeLabel = pricing.packageType === 'monthly' ? 'Month' : 'Session';
        const plural = pricing.duration > 1 ? 's' : '';
        packageName = `${pricing.duration} ${typeLabel}${plural}`;
        packageDuration = pricing.duration;
        packageType = pricing.packageType as "monthly" | "session";
      }
    }

    const sharedStudentNames = poolId ? (poolSiblingsMap.get(poolId) ?? null) : null;

    return {
      id: payment.id,
      parentName: parentInfo?.name ?? null,
      parentAddress,
      parentPostcode,
      parentCity,
      studentId: student.id,
      courseCode,
      studentName: student.name,
      branchId: student.branch_id,
      branchName: useCityName ? (student.branch.city || student.branch.name) : student.branch.name,
      branchCompanyName: student.branch.parent_id ? (companyNameMap.get(student.branch.parent_id) ?? null) : null,
      branchAddress: student.branch.address,
      branchPhone: student.branch.phone,
      branchEmail: student.branch.email,
      branchBankName: student.branch.bank_name,
      branchBankAccount: student.branch.bank_account,
      courseId,
      courseName: course?.name ?? null,
      packageId: (payment as unknown as { package_id: string | null }).package_id,
      packageName,
      packageDuration,
      packageType,
      price: payment.amount,
      paymentMethod: payment.payment_method as PaymentMethod | null,
      paidAt: payment.paid_at,
      receiptPhoto: payment.receipt_photo,
      invoiceNumber: payment.invoice_number,
      isSharedPackage: isSharedPackage || !!poolId,
      poolId,
      sharedStudentNames,
      invoiceSnapshot: (payment as unknown as { invoice_snapshot: InvoiceSnapshot | null }).invoice_snapshot ?? null,
    };
  });

  return { rows, totalCount: totalCount ?? 0 };
}

// ============================================
// POOL RENEWAL PAYMENTS
// ============================================

/**
 * Create a pending payment for a shared session pool when sessions are depleted
 */
export async function createPoolRenewalPayment(poolId: string): Promise<Payment | null> {
  const { getPoolWithStudents } = await import("./pools");

  const pool = await getPoolWithStudents(poolId);
  if (!pool) {
    console.error('Pool not found for renewal payment:', poolId);
    return null;
  }

  // Check if there's already a pending payment for this pool
  const { data: existingPoolPayments } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('pool_id', poolId)
    .eq('status', 'pending')
    .limit(1);

  if (existingPoolPayments && existingPoolPayments.length > 0) {
    console.log('Pending pool payment already exists:', existingPoolPayments[0].id);
    return null;
  }

  // Also check if any pool member already has an individual pending payment for this course
  // (to prevent duplicates when switching between pool and individual states)
  const studentIds_check = pool.students.map(s => s.id);
  if (studentIds_check.length > 0 && pool.course_id) {
    const { data: existingIndividualPayments } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('course_id', pool.course_id)
      .eq('status', 'pending')
      .in('student_id', studentIds_check)
      .limit(1);

    if (existingIndividualPayments && existingIndividualPayments.length > 0) {
      // Convert existing individual payment to pool payment instead of creating new
      console.log('Converting existing individual payment to pool payment:', existingIndividualPayments[0].id);
      await supabaseAdmin
        .from('payments')
        .update({
          pool_id: poolId,
          is_shared_package: true,
          shared_with: studentIds_check,
        })
        .eq('id', existingIndividualPayments[0].id);
      return null;
    }
  }

  // Get the package price
  let price = 0;
  if (pool.package_id) {
    const { data: pricing } = await supabaseAdmin
      .from('course_pricing')
      .select('price')
      .eq('id', pool.package_id)
      .single();

    if (pricing) {
      price = pricing.price;
    }
  }

  // Use the first student in the pool as the payment student
  // (payment is for the pool, but needs a student_id for the table)
  const firstStudent = pool.students[0];
  if (!firstStudent) {
    console.error('No students in pool for renewal payment');
    return null;
  }

  // Get all student IDs for shared_with
  const studentIds = pool.students.map(s => s.id);

  const paymentData: PaymentInsert = {
    student_id: firstStudent.id,
    course_id: pool.course_id,
    package_id: pool.package_id,
    pool_id: poolId,
    amount: price,
    payment_type: 'package',
    status: 'pending',
    is_shared_package: true,
    shared_with: studentIds,
    notes: `Shared package renewal for ${pool.name || 'Sibling Pool'} (${studentIds.length} students)`,
  };

  return createPayment(paymentData);
}

/**
 * Create a pending payment for an enrollment when sessions are depleted
 */
export async function createEnrollmentRenewalPayment(enrollmentId: string): Promise<Payment | null> {
  console.log('[Renewal Payment] ====== STARTING ======');
  console.log('[Renewal Payment] Enrollment ID:', enrollmentId);

  // Get enrollment with student, course, and package info (don't use !inner to avoid query failures)
  const { data: enrollment, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      package_id,
      student:students(id, name),
      course:courses(id, name),
      package:course_pricing(id, price, description)
    `)
    .eq('id', enrollmentId)
    .single();

  if (error) {
    console.error('[Renewal Payment] Error fetching enrollment:', error);
    return null;
  }

  if (!enrollment) {
    console.error('[Renewal Payment] Enrollment not found:', enrollmentId);
    return null;
  }

  if (!enrollment.student_id) {
    console.error('[Renewal Payment] Enrollment has no student_id:', enrollmentId);
    return null;
  }

  console.log('[Renewal Payment] Found enrollment:', {
    id: enrollment.id,
    student_id: enrollment.student_id,
    course_id: enrollment.course_id,
    package_id: enrollment.package_id,
  });

  // Check if there's already a pending payment for this student+course (any pool state)
  // Use limit instead of maybeSingle() to avoid errors when multiple exist
  const { data: existingPayments, error: existingError } = await supabaseAdmin
    .from('payments')
    .select('id, amount, created_at, course_id, pool_id, status')
    .eq('student_id', enrollment.student_id)
    .eq('status', 'pending')
    .limit(10);

  console.log('[Renewal Payment] Existing pending payments query result:', {
    error: existingError,
    count: existingPayments?.length || 0,
    payments: existingPayments,
  });

  if (existingError) {
    console.error('[Renewal Payment] Error checking existing payment:', existingError);
    // Continue anyway - we'll try to create a payment
  }

  // Check if any existing payment matches this course (regardless of pool_id)
  const matchingPayment = existingPayments?.find(p =>
    !enrollment.course_id || p.course_id === enrollment.course_id
  );

  if (matchingPayment) {
    console.log('[Renewal Payment] Found matching pending payment:', matchingPayment);
    return null;
  }

  console.log('[Renewal Payment] No matching pending payment found, creating new one...');

  // Get the package price - if no package assigned, try to get from course_pricing
  const packageData = enrollment.package as unknown as { id: string; price: number; description: string } | null;
  let price = packageData?.price ?? 0;

  // If no package price, try to find a default package for this course
  if (price === 0 && enrollment.course_id) {
    console.log('[Renewal Payment] No package price found, looking up course pricing...');
    const { data: defaultPricing } = await supabaseAdmin
      .from('course_pricing')
      .select('id, price, description')
      .eq('course_id', enrollment.course_id)
      .is('deleted_at', null)
      .order('price', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (defaultPricing) {
      price = defaultPricing.price;
      console.log('[Renewal Payment] Using default pricing:', defaultPricing);
    }
  }

  // If still no price, set a default of 0 (admin can update later)
  if (price === 0) {
    console.log('[Renewal Payment] No pricing found, using 0 as placeholder');
  }

  const studentData = enrollment.student as unknown as { id: string; name: string } | null;
  const courseData = enrollment.course as unknown as { id: string; name: string } | null;

  const studentName = studentData?.name || 'Student';
  const courseName = courseData?.name || 'Course';

  const paymentData: PaymentInsert = {
    student_id: enrollment.student_id,
    course_id: enrollment.course_id,
    package_id: enrollment.package_id,
    amount: price,
    payment_type: 'package',
    status: 'pending',
    notes: `Package renewal for ${studentName} - ${courseName}`,
  };

  console.log('[Renewal Payment] Creating payment with data:', JSON.stringify(paymentData, null, 2));

  const payment = await createPayment(paymentData);

  if (payment) {
    console.log('[Renewal Payment] ====== SUCCESS ====== Payment ID:', payment.id);

    // Verify the payment was actually created by querying it back
    const { data: verifyPayment, error: verifyError } = await supabaseAdmin
      .from('payments')
      .select('id, student_id, course_id, status, amount')
      .eq('id', payment.id)
      .single();

    if (verifyError) {
      console.error('[Renewal Payment] VERIFY ERROR:', verifyError);
    } else {
      console.log('[Renewal Payment] VERIFIED payment exists:', verifyPayment);
    }

    // Also count total pending payments for this student
    const { count } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', enrollment.student_id)
      .eq('status', 'pending');

    console.log('[Renewal Payment] Total pending payments for student:', count);
  } else {
    console.error('[Renewal Payment] ====== FAILED ====== Could not create payment!');
  }

  return payment;
}
