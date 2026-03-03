import { supabaseAdmin, withRetry } from "@/db";
import { isSuperAdmin, getUserBranchIdByEmail, getUserByEmail } from "./users";
import { unstable_cache } from "next/cache";

// Helper function to group array items by a key
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export interface DashboardStats {
  totalAttendance: number;
  attendanceChange: number;
  totalPayments: number;
  paymentsChange: number;
  activeBranches: number;
  branchesChange: number;
  totalAdcoinBalance: number;
  adcoinChange: number;
}

export interface RecentActivity {
  id: string;
  userName: string;
  action: string;
  branchName: string;
  branchId: string;
  avatarUrl: string | null;
  rank: number;
  createdAt: Date;
}

export interface AdcoinRanking {
  rank: number;
  studentId: string;
  studentName: string;
  coins: number;
  photo: string | null;
  branchId: string;
  branchName: string;
}

export interface AdcoinTransaction {
  id: string;
  studentName: string;
  type: "earned" | "spent";
  amount: number;
  description: string | null;
  branchId: string;
  avatarUrl: string | null;
  rank: number;
  createdAt: Date;
}

export interface BranchOverview {
  branch: string;
  totalStudents: number;
  avgEnroll: number;
  active: number;
  inactive: number;
  activeRate: number;
  conversionRate: number;
  paymentDue: number;
  paymentReceived: number;
}

// Adcoin Pool types
export interface BranchPool {
  id: string;
  name: string;
  color: string;
  adcoins: number;
  rmValue: number;
}

export interface AdcoinProgressData {
  currentTotal: number;
  poolLimit: number;
}

export interface BranchOption {
  id: string;
  name: string;
}

export const getBranches = unstable_cache(
  async (userEmail: string): Promise<BranchOption[]> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      let query = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        query = query.eq('id', userBranchId);
      }

      const { data } = await query;
      return (data ?? []).map((b) => ({ id: b.id, name: b.name }));
    });
  },
  ["branches"],
  { revalidate: 60, tags: ["dashboard", "branches"] }
);

// Get the date 30 days ago for comparison
function getLastMonthDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

// Get the date 60 days ago for previous month comparison
function getPreviousMonthDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 60);
  return date.toISOString();
}

export const getDashboardStats = unstable_cache(
  async (userEmail: string): Promise<DashboardStats> => {
    return withRetry(async () => {
      const user = await getUserByEmail(userEmail);
      const branchId = user ? await getUserBranchIdByEmail(userEmail) : null;
      const lastMonth = getLastMonthDate();
      const previousMonth = getPreviousMonthDate();

      // Build all queries (without awaiting)
      let attendanceQuery = supabaseAdmin
        .from('attendance')
        .select('id, enrollments!inner(student_id, students!inner(branch_id))', { count: 'exact', head: true })
        .gte('created_at', lastMonth);

      if (branchId) {
        attendanceQuery = attendanceQuery.eq('enrollments.students.branch_id', branchId);
      }

      let attendanceLastQuery = supabaseAdmin
        .from('attendance')
        .select('id, enrollments!inner(student_id, students!inner(branch_id))', { count: 'exact', head: true })
        .gte('created_at', previousMonth)
        .lt('created_at', lastMonth);

      if (branchId) {
        attendanceLastQuery = attendanceLastQuery.eq('enrollments.students.branch_id', branchId);
      }

      let paymentsQuery = supabaseAdmin
        .from('payments')
        .select('amount, students!inner(branch_id)')
        .gte('created_at', lastMonth)
        .eq('status', 'paid');

      if (branchId) {
        paymentsQuery = paymentsQuery.eq('students.branch_id', branchId);
      }

      let paymentsLastQuery = supabaseAdmin
        .from('payments')
        .select('amount, students!inner(branch_id)')
        .gte('created_at', previousMonth)
        .lt('created_at', lastMonth)
        .eq('status', 'paid');

      if (branchId) {
        paymentsLastQuery = paymentsLastQuery.eq('students.branch_id', branchId);
      }

      let adcoinQuery = supabaseAdmin
        .from('students')
        .select('adcoin_balance');

      if (branchId) {
        adcoinQuery = adcoinQuery.eq('branch_id', branchId);
      }

      let adcoinThisQuery = supabaseAdmin
        .from('adcoin_transactions')
        .select('amount, type, students!inner(branch_id)')
        .gte('created_at', lastMonth);

      if (branchId) {
        adcoinThisQuery = adcoinThisQuery.eq('students.branch_id', branchId);
      }

      let adcoinLastQuery = supabaseAdmin
        .from('adcoin_transactions')
        .select('amount, type, students!inner(branch_id)')
        .gte('created_at', previousMonth)
        .lt('created_at', lastMonth);

      if (branchId) {
        adcoinLastQuery = adcoinLastQuery.eq('students.branch_id', branchId);
      }

      // Execute all 8 queries in parallel
      const [
        { count: attendanceThisMonth },
        { count: attendanceLastMonth },
        { data: paymentsThisMonthData },
        { data: paymentsLastMonthData },
        branchesResult,
        { data: adcoinData },
        { data: adcoinThisData },
        { data: adcoinLastData },
      ] = await Promise.all([
        attendanceQuery,
        attendanceLastQuery,
        paymentsQuery,
        paymentsLastQuery,
        user && isSuperAdmin(user.email)
          ? supabaseAdmin.from('branches').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: branchId ? 1 : 0 }),
        adcoinQuery,
        adcoinThisQuery,
        adcoinLastQuery,
      ]);

      // Process results
      const paymentsThisMonth = paymentsThisMonthData?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
      const paymentsLastMonth = paymentsLastMonthData?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
      const branchesCount = branchesResult.count ?? 0;
      const totalAdcoinBalance = adcoinData?.reduce((sum, s) => sum + (s.adcoin_balance ?? 0), 0) ?? 0;
      const adcoinThisMonth = adcoinThisData?.reduce((sum, t) => {
        return sum + (t.type === 'earned' ? t.amount : -t.amount);
      }, 0) ?? 0;
      const adcoinLastMonth = adcoinLastData?.reduce((sum, t) => {
        return sum + (t.type === 'earned' ? t.amount : -t.amount);
      }, 0) ?? 0;

      const currentAttendance = attendanceThisMonth ?? 0;
      const prevAttendance = attendanceLastMonth ?? 0;

      return {
        totalAttendance: currentAttendance,
        attendanceChange: prevAttendance
          ? ((currentAttendance - prevAttendance) / prevAttendance) * 100
          : 0,
        totalPayments: paymentsThisMonth,
        paymentsChange: paymentsLastMonth
          ? ((paymentsThisMonth - paymentsLastMonth) / paymentsLastMonth) * 100
          : 0,
        activeBranches: branchesCount,
        branchesChange: 0,
        totalAdcoinBalance,
        adcoinChange: adcoinLastMonth
          ? ((adcoinThisMonth - adcoinLastMonth) / adcoinLastMonth) * 100
          : 0,
      };
    });
  },
  ["dashboard-stats"],
  { revalidate: 60, tags: ["dashboard", "dashboard-stats"] }
);

export const getRecentActivity = unstable_cache(
  async (userEmail: string, limit = 10): Promise<RecentActivity[]> => {
    return withRetry(async () => {
      const branchId = await getUserBranchIdByEmail(userEmail);

      // Get recent attendance
      let attendanceQuery = supabaseAdmin
        .from('attendance')
        .select(`
          id,
          created_at,
          enrollments!inner(
            students!inner(
              name,
              photo,
              adcoin_balance,
              branch_id,
              branches!inner(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (branchId) {
        attendanceQuery = attendanceQuery.eq('enrollments.students.branch_id', branchId);
      }

      const { data: attendanceData } = await attendanceQuery;

      const activities: RecentActivity[] = (attendanceData ?? []).map((a: any, index: number) => ({
        id: a.id,
        userName: a.enrollments?.students?.name ?? 'Unknown',
        action: 'checked in at',
        branchName: a.enrollments?.students?.branches?.name ?? 'Unknown',
        branchId: a.enrollments?.students?.branches?.id ?? '',
        avatarUrl: a.enrollments?.students?.photo ?? null,
        rank: index + 1,
        createdAt: new Date(a.created_at),
      }));

      return activities.slice(0, limit);
    });
  },
  ["recent-activity"],
  { revalidate: 60, tags: ["dashboard", "recent-activity"] }
);

export const getAdcoinRanking = unstable_cache(
  async (userEmail: string, limit = 10): Promise<AdcoinRanking[]> => {
    return withRetry(async () => {
      const branchId = await getUserBranchIdByEmail(userEmail);

      let query = supabaseAdmin
        .from('students')
        .select('id, name, adcoin_balance, photo, branch_id, branches!inner(id, name)')
        .order('adcoin_balance', { ascending: false })
        .limit(limit);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data } = await query;

      return (data ?? []).map((s: any, index) => ({
        rank: index + 1,
        studentId: s.id,
        studentName: s.name,
        coins: s.adcoin_balance ?? 0,
        photo: s.photo,
        branchId: s.branches?.id ?? '',
        branchName: s.branches?.name ?? 'Unknown',
      }));
    });
  },
  ["adcoin-ranking"],
  { revalidate: 60, tags: ["dashboard", "adcoin-ranking"] }
);

export const getAdcoinTransactions = unstable_cache(
  async (userEmail: string, limit = 10): Promise<AdcoinTransaction[]> => {
    return withRetry(async () => {
      const branchId = await getUserBranchIdByEmail(userEmail);

      let query = supabaseAdmin
        .from('adcoin_transactions')
        .select(`
          id,
          type,
          amount,
          description,
          created_at,
          students!inner(name, photo, branch_id, branches!inner(id))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (branchId) {
        query = query.eq('students.branch_id', branchId);
      }

      const { data } = await query;

      return (data ?? []).map((t: any, index: number) => ({
        id: t.id,
        studentName: t.students?.name ?? 'Unknown',
        type: t.type as "earned" | "spent",
        amount: t.amount,
        description: t.description,
        branchId: t.students?.branches?.id ?? '',
        avatarUrl: t.students?.photo ?? null,
        rank: index + 1,
        createdAt: new Date(t.created_at),
      }));
    });
  },
  ["adcoin-transactions"],
  { revalidate: 60, tags: ["dashboard", "adcoin-transactions"] }
);

// Chart data types
export interface ChartBranch {
  id: string;
  name: string;
  color: string;
}

export interface WeekData {
  attendance: number;
  trial: number;
}

export interface ChartData {
  [branchId: string]: {
    [monthIndex: number]: WeekData[];
  };
}

export interface AttendanceChartData {
  branches: ChartBranch[];
  attendanceData: ChartData;
  enrollmentData: ChartData;
}

// Branch colors for chart
const BRANCH_COLORS = ["#615DFA", "#23D2E2", "#22C55E", "#F59E0B", "#EC4899"];

// Helper to get week number in month (0-indexed)
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const offsetToMonday = (firstDayOfWeek + 6) % 7;
  const dayOfMonth = date.getDate();
  return Math.floor((dayOfMonth + offsetToMonday - 1) / 7);
}

export const getAttendanceChartData = unstable_cache(
  async (userEmail: string): Promise<AttendanceChartData> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      // Get branches
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        branchQuery = branchQuery.eq('id', userBranchId);
      }

      const { data: branchesData } = await branchQuery;
      const branches: ChartBranch[] = (branchesData ?? []).map((b, idx) => ({
        id: b.id,
        name: b.name,
        color: BRANCH_COLORS[idx % BRANCH_COLORS.length],
      }));

      // Get date range (last 12 months)
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      // Initialize chart data structure
      const attendanceData: ChartData = {};
      const enrollmentData: ChartData = {};

      branches.forEach((branch) => {
        attendanceData[branch.id] = {};
        enrollmentData[branch.id] = {};
        for (let m = 0; m < 12; m++) {
          attendanceData[branch.id][m] = [
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
          ];
          enrollmentData[branch.id][m] = [
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
            { attendance: 0, trial: 0 },
          ];
        }
      });

      // Fetch attendance records with branch info
      const { data: attendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          enrollments!inner(
            id,
            status,
            courses!inner(branch_id)
          )
        `)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Process attendance data
      (attendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.enrollments?.courses?.branch_id;
        if (!branchId || !attendanceData[branchId]) return;

        const recordDate = new Date(record.date);
        const monthIndex = recordDate.getMonth();
        const weekIndex = Math.min(getWeekOfMonth(recordDate), 3);

        const enrollmentStatus = record.enrollments?.status;
        const isTrial = enrollmentStatus === 'pending';
        const isPresent = record.status === 'present' || record.status === 'late';

        if (isPresent) {
          if (isTrial) {
            attendanceData[branchId][monthIndex][weekIndex].trial += 1;
          } else {
            attendanceData[branchId][monthIndex][weekIndex].attendance += 1;
          }
        }
      });

      // Fetch enrollment records with branch info
      const { data: enrollmentRecords } = await supabaseAdmin
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          status,
          courses!inner(branch_id)
        `)
        .gte('enrolled_at', startDate.toISOString());

      // Process enrollment data
      (enrollmentRecords ?? []).forEach((record: any) => {
        const branchId = record.courses?.branch_id;
        if (!branchId || !enrollmentData[branchId]) return;

        const enrolledDate = new Date(record.enrolled_at);
        const monthIndex = enrolledDate.getMonth();
        const weekIndex = Math.min(getWeekOfMonth(enrolledDate), 3);

        const status = record.status;
        const isTrial = status === 'pending';
        const isCancelled = status === 'cancelled';

        if (isCancelled) {
          enrollmentData[branchId][monthIndex][weekIndex].trial += 1; // trial = dropped
        } else if (isTrial) {
          enrollmentData[branchId][monthIndex][weekIndex].trial += 1;
        } else {
          enrollmentData[branchId][monthIndex][weekIndex].attendance += 1; // attendance = active enrollment
        }
      });

      return {
        branches,
        attendanceData,
        enrollmentData,
      };
    });
  },
  ["attendance-chart"],
  { revalidate: 60, tags: ["dashboard", "attendance-chart"] }
);

// Overview chart types
export interface OverviewBranch {
  id: string;
  name: string;
  color: string;
}

export interface MonthlyOverviewData {
  [branchId: string]: number[]; // 60 months of data (5 years)
}

export interface OverviewChartData {
  branches: OverviewBranch[];
  attendanceData: MonthlyOverviewData;
  engagementData: MonthlyOverviewData;
}

export const getOverviewChartData = unstable_cache(
  async (userEmail: string): Promise<OverviewChartData> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      // Get branches
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        branchQuery = branchQuery.eq('id', userBranchId);
      }

      const { data: branchesData } = await branchQuery;
      const branches: OverviewBranch[] = (branchesData ?? []).map((b, idx) => ({
        id: b.id,
        name: b.name,
        color: BRANCH_COLORS[idx % BRANCH_COLORS.length],
      }));

      // Get date range (last 60 months / 5 years)
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 59, 1);

      // Initialize monthly data arrays (60 months, oldest first)
      const attendanceData: MonthlyOverviewData = {};
      const engagementData: MonthlyOverviewData = {};

      branches.forEach((branch) => {
        attendanceData[branch.id] = new Array(60).fill(0);
        engagementData[branch.id] = new Array(60).fill(0);
      });

      // Fetch attendance records
      const { data: attendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          enrollments!inner(
            id,
            courses!inner(branch_id)
          )
        `)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Process attendance data - aggregate by month
      (attendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.enrollments?.courses?.branch_id;
        if (!branchId || !attendanceData[branchId]) return;

        const recordDate = new Date(record.date);
        const isPresent = record.status === 'present' || record.status === 'late';

        if (isPresent) {
          // Calculate month index (0 = oldest, 59 = current)
          const monthsDiff =
            (now.getFullYear() - recordDate.getFullYear()) * 12 +
            (now.getMonth() - recordDate.getMonth());
          const monthIndex = 59 - monthsDiff;

          if (monthIndex >= 0 && monthIndex < 60) {
            attendanceData[branchId][monthIndex] += 1;
          }
        }
      });

      // Fetch engagement data (using adcoin transactions as engagement metric)
      const { data: engagementRecords } = await supabaseAdmin
        .from('adcoin_transactions')
        .select(`
          id,
          created_at,
          students!inner(branch_id)
        `)
        .gte('created_at', startDate.toISOString());

      // Process engagement data
      (engagementRecords ?? []).forEach((record: any) => {
        const branchId = record.students?.branch_id;
        if (!branchId || !engagementData[branchId]) return;

        const recordDate = new Date(record.created_at);

        // Calculate month index (0 = oldest, 59 = current)
        const monthsDiff =
          (now.getFullYear() - recordDate.getFullYear()) * 12 +
          (now.getMonth() - recordDate.getMonth());
        const monthIndex = 59 - monthsDiff;

        if (monthIndex >= 0 && monthIndex < 60) {
          engagementData[branchId][monthIndex] += 1;
        }
      });

      return {
        branches,
        attendanceData,
        engagementData,
      };
    });
  },
  ["overview-chart"],
  { revalidate: 60, tags: ["dashboard", "overview-chart"] }
);

// Payment Due List types
export interface PaymentDueItem {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl: string | null;
  rank: number;
  sessionsLeft: number;
  branchId: string;
  branchName: string;
}

export interface PaymentDueListData {
  items: PaymentDueItem[];
  branches: { id: string; name: string }[];
}

export const getPaymentDueListData = unstable_cache(
  async (userEmail: string): Promise<PaymentDueListData> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      // Get branches
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        branchQuery = branchQuery.eq('id', userBranchId);
      }

      const { data: branchesData } = await branchQuery;
      const branches = (branchesData ?? []).map((b) => ({
        id: b.id,
        name: b.name,
      }));

      // Get students with payment due (pending payments or low sessions)
      let studentsQuery = supabaseAdmin
        .from('students')
        .select(`
          id,
          name,
          photo,
          branch_id,
          branches!inner(id, name)
        `)
        .is('deleted_at', null);

      if (userBranchId) {
        studentsQuery = studentsQuery.eq('branch_id', userBranchId);
      }

      const { data: studentsData } = await studentsQuery;

      // Get enrollments with session counts for each student
      const studentIds = (studentsData ?? []).map((s) => s.id);

      if (studentIds.length === 0) {
        return { items: [], branches };
      }

      const { data: enrollmentsData } = await supabaseAdmin
        .from('enrollments')
        .select(`
          id,
          student_id,
          total_sessions,
          sessions_used
        `)
        .in('student_id', studentIds)
        .eq('status', 'active')
        .is('deleted_at', null);

      // Calculate sessions left per student
      const sessionsMap: Record<string, number> = {};
      (enrollmentsData ?? []).forEach((e) => {
        const sessionsLeft = (e.total_sessions ?? 0) - (e.sessions_used ?? 0);
        if (sessionsMap[e.student_id] === undefined) {
          sessionsMap[e.student_id] = sessionsLeft;
        } else {
          sessionsMap[e.student_id] += sessionsLeft;
        }
      });

      // Filter to students with low or negative sessions and build items
      const items: PaymentDueItem[] = (studentsData ?? [])
        .filter((s) => {
          const sessionsLeft = sessionsMap[s.id] ?? 0;
          return sessionsLeft <= 3; // Show students with 3 or fewer sessions
        })
        .map((s, idx) => ({
          id: s.id,
          studentId: s.id,
          studentName: s.name,
          avatarUrl: s.photo,
          rank: idx + 1,
          sessionsLeft: sessionsMap[s.id] ?? 0,
          branchId: s.branch_id,
          branchName: (s.branches as any)?.name ?? 'Unknown',
        }))
        .sort((a, b) => a.sessionsLeft - b.sessionsLeft); // Sort by sessions left (lowest first)

      // Update ranks after sorting
      items.forEach((item, idx) => {
        item.rank = idx + 1;
      });

      return { items, branches };
    });
  },
  ["payment-due"],
  { revalidate: 60, tags: ["dashboard", "payment-due"] }
);

export const getBranchOverviewData = unstable_cache(
  async (userEmail: string): Promise<BranchOverview[]> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);
      const lastMonth = getLastMonthDate();
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Get branches
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        branchQuery = branchQuery.eq('id', userBranchId);
      }

      const { data: branchesData } = await branchQuery;
      const branchIds = (branchesData ?? []).map(b => b.id);

      if (branchIds.length === 0) {
        return [];
      }

      // Run all bulk queries in parallel
      const [
        { data: allStudents },
        { data: allEnrollments },
        { data: pendingPaymentsData },
        { data: receivedPaymentsData },
      ] = await Promise.all([
        // All students for these branches
        supabaseAdmin
          .from('students')
          .select('id, branch_id')
          .in('branch_id', branchIds)
          .is('deleted_at', null),
        // All enrollments (we'll filter by student in JS)
        supabaseAdmin
          .from('enrollments')
          .select('id, student_id, status, enrolled_at')
          .is('deleted_at', null),
        // All pending payments for these branches
        supabaseAdmin
          .from('payments')
          .select('amount, students!inner(branch_id)')
          .in('students.branch_id', branchIds)
          .eq('status', 'pending'),
        // All received payments this month for these branches
        supabaseAdmin
          .from('payments')
          .select('amount, students!inner(branch_id)')
          .in('students.branch_id', branchIds)
          .eq('status', 'paid')
          .gte('created_at', lastMonth),
      ]);

      // Build lookup maps for fast aggregation
      const studentsByBranch = groupBy(allStudents ?? [], 'branch_id');
      const allStudentIds = new Set((allStudents ?? []).map(s => s.id));

      // Filter enrollments to only those belonging to students in our branches
      const relevantEnrollments = (allEnrollments ?? []).filter(e => allStudentIds.has(e.student_id));

      // Group enrollments by student
      const enrollmentsByStudent = groupBy(relevantEnrollments, 'student_id');

      // Group payments by branch_id
      const pendingPaymentsByBranch: Record<string, number> = {};
      const receivedPaymentsByBranch: Record<string, number> = {};

      for (const p of pendingPaymentsData ?? []) {
        const branchId = (p.students as any)?.branch_id;
        if (branchId) {
          pendingPaymentsByBranch[branchId] = (pendingPaymentsByBranch[branchId] ?? 0) + Number(p.amount);
        }
      }

      for (const p of receivedPaymentsData ?? []) {
        const branchId = (p.students as any)?.branch_id;
        if (branchId) {
          receivedPaymentsByBranch[branchId] = (receivedPaymentsByBranch[branchId] ?? 0) + Number(p.amount);
        }
      }

      // Aggregate per branch (fast, in-memory)
      const overviewData: BranchOverview[] = (branchesData ?? []).map(branch => {
        const students = studentsByBranch[branch.id] ?? [];
        const totalStudents = students.length;
        const studentIds = students.map(s => s.id);

        // Count active students (students with at least one active enrollment)
        const uniqueActiveStudents = new Set<string>();
        let activeEnrollmentsCount = 0;
        let pendingEnrollmentsCount = 0;
        let enrollmentsLastYearCount = 0;

        for (const studentId of studentIds) {
          const studentEnrollments = enrollmentsByStudent[studentId] ?? [];
          for (const enrollment of studentEnrollments) {
            if (enrollment.status === 'active') {
              uniqueActiveStudents.add(studentId);
              activeEnrollmentsCount++;
            }
            if (enrollment.status === 'pending') {
              pendingEnrollmentsCount++;
            }
            // Count enrollments from last 12 months
            if (new Date(enrollment.enrolled_at) >= twelveMonthsAgo) {
              enrollmentsLastYearCount++;
            }
          }
        }

        const activeStudentCount = uniqueActiveStudents.size;
        const inactiveStudents = totalStudents - activeStudentCount;
        const activeRate = totalStudents > 0 ? activeStudentCount / totalStudents : 0;

        // Trial conversion rate
        const trialBase = activeEnrollmentsCount + pendingEnrollmentsCount;
        const conversionRate = trialBase > 0 ? activeEnrollmentsCount / trialBase : 0;

        const avgEnroll = Math.round(enrollmentsLastYearCount / 12);

        return {
          branch: branch.name,
          totalStudents,
          avgEnroll,
          active: activeStudentCount,
          inactive: inactiveStudents,
          activeRate,
          conversionRate,
          paymentDue: pendingPaymentsByBranch[branch.id] ?? 0,
          paymentReceived: receivedPaymentsByBranch[branch.id] ?? 0,
        };
      });

      return overviewData;
    });
  },
  ["branch-overview"],
  { revalidate: 60, tags: ["dashboard", "branch-overview"] }
);

// Branch colors for adcoin pool
const POOL_COLORS = ["#615DFA", "#23D2E2", "#22C55E", "#F59E0B", "#EC4899"];

// Adcoin to RM conversion rate
const ADCOIN_TO_RM_RATE = 0.01;

export const getAdcoinPoolData = unstable_cache(
  async (userEmail: string): Promise<BranchPool[]> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      // Get branches
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (userBranchId) {
        branchQuery = branchQuery.eq('id', userBranchId);
      }

      const { data: branchesData } = await branchQuery;
      const branchIds = (branchesData ?? []).map(b => b.id);

      if (branchIds.length === 0) {
        return [];
      }

      // Single query for ALL students across all relevant branches
      const { data: allStudents } = await supabaseAdmin
        .from('students')
        .select('branch_id, adcoin_balance')
        .in('branch_id', branchIds)
        .is('deleted_at', null);

      // Aggregate adcoin balances by branch in JavaScript (fast, in-memory)
      const branchTotals = new Map<string, number>();
      for (const student of allStudents ?? []) {
        const current = branchTotals.get(student.branch_id) ?? 0;
        branchTotals.set(student.branch_id, current + (student.adcoin_balance ?? 0));
      }

      // Build result
      const pools: BranchPool[] = (branchesData ?? []).map((branch, idx) => ({
        id: branch.id,
        name: branch.name,
        color: POOL_COLORS[idx % POOL_COLORS.length],
        adcoins: branchTotals.get(branch.id) ?? 0,
        rmValue: (branchTotals.get(branch.id) ?? 0) * ADCOIN_TO_RM_RATE,
      }));

      return pools;
    });
  },
  ["adcoin-pool"],
  { revalidate: 60, tags: ["dashboard", "adcoin-pool"] }
);

// Default pool limit (can be made configurable via settings table)
const DEFAULT_POOL_LIMIT = 100000;

export const getAdcoinProgressData = unstable_cache(
  async (userEmail: string): Promise<AdcoinProgressData> => {
    return withRetry(async () => {
      const userBranchId = await getUserBranchIdByEmail(userEmail);

      let query = supabaseAdmin
        .from('students')
        .select('adcoin_balance')
        .is('deleted_at', null);

      if (userBranchId) {
        query = query.eq('branch_id', userBranchId);
      }

      const { data } = await query;

      const currentTotal = (data ?? []).reduce(
        (sum, s) => sum + (s.adcoin_balance ?? 0),
        0
      );

      return {
        currentTotal,
        poolLimit: DEFAULT_POOL_LIMIT,
      };
    });
  },
  ["adcoin-progress"],
  { revalidate: 60, tags: ["dashboard", "adcoin-progress"] }
);
