import { supabaseAdmin, withRetry } from "@/db";
import { isSuperAdmin, getUserBranchIdByEmail, getUserByEmail, getUserBranchIds } from "./users";
import { unstable_cache } from "next/cache";

interface DashboardBranchAccess {
  branchIds: string[] | null;
  useCityName: boolean; // true for admin/branch_admin/instructor, false for super_admin
}

/**
 * Get branch IDs relevant for dashboard data (excludes company-type entries).
 * Returns null branchIds for super_admin (sees everything).
 * Returns array of hq/branch IDs for admin users.
 * Also returns whether to use city/area name instead of branch name.
 */
async function getDashboardBranchAccess(userEmail: string): Promise<DashboardBranchAccess> {
  const user = await getUserByEmail(userEmail);
  if (!user) return { branchIds: [], useCityName: false };
  if (isSuperAdmin(userEmail) || user.role === "super_admin") {
    return { branchIds: null, useCityName: false };
  }

  let branchIds = await getUserBranchIds(userEmail);
  if (!branchIds) return { branchIds: null, useCityName: true };
  if (branchIds.length === 0) return { branchIds: [], useCityName: true };

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (user.role === "group_admin") {
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

  return { branchIds, useCityName: true };
}

// Helper function to group array items by a key
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export interface DashboardStats {
  totalTrials: number;
  trialChange: number;
  totalAttendance: number;
  attendanceChange: number;
  totalPayments: number;
  paymentsChange: number;
  paymentDueAmount: number;
  paymentDueStudentCount: number;
  paymentDuePercentage: number; // paymentDue / (pending + paid) * 100
  totalAdcoinTransactions: number;
  adcoinTransactionChange: number;
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      let query = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        query = query.in('id', dashBranchIds);
      }

      const { data } = await query;
      return (data ?? []).map((b: any) => ({ id: b.id, name: useCityName ? (b.city || b.name) : b.name }));
    });
  },
  ["branches"],
  { revalidate: 60, tags: ["dashboard", "branches"] }
);

// Get the first day of current month
function getThisMonthStart(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

// Get the first day of last month
function getLastMonthStart(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString();
}

// Get the first day of two months ago
function getTwoMonthsAgoStart(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 2, 1).toISOString();
}

export const getDashboardStats = unstable_cache(
  async (userEmail: string): Promise<DashboardStats> => {
    return withRetry(async () => {
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);
      const thisMonthStart = getThisMonthStart();
      const lastMonthStart = getLastMonthStart();
      const twoMonthsAgoStart = getTwoMonthsAgoStart();

      // Build enrollment attendance queries (this month vs last month) - only count present/late
      let enrollmentAttendanceThisMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, enrollments!inner(student_id, students!inner(branch_id))', { count: 'exact', head: true })
        .gte('created_at', thisMonthStart)
        .in('status', ['present', 'late'])
        .is('trial_id', null);

      if (dashBranchIds) {
        enrollmentAttendanceThisMonthQuery = enrollmentAttendanceThisMonthQuery.in('enrollments.students.branch_id', dashBranchIds);
      }

      let enrollmentAttendanceLastMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, enrollments!inner(student_id, students!inner(branch_id))', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart)
        .in('status', ['present', 'late'])
        .is('trial_id', null);

      if (dashBranchIds) {
        enrollmentAttendanceLastMonthQuery = enrollmentAttendanceLastMonthQuery.in('enrollments.students.branch_id', dashBranchIds);
      }

      // Build trial attendance queries (this month vs last month) - only count present/late
      let trialAttendanceThisMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, trial:trials!inner(branch_id)', { count: 'exact', head: true })
        .gte('created_at', thisMonthStart)
        .in('status', ['present', 'late'])
        .not('trial_id', 'is', null);

      if (dashBranchIds) {
        trialAttendanceThisMonthQuery = trialAttendanceThisMonthQuery.in('trial.branch_id', dashBranchIds);
      }

      let trialAttendanceLastMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, trial:trials!inner(branch_id)', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart)
        .in('status', ['present', 'late'])
        .not('trial_id', 'is', null);

      if (dashBranchIds) {
        trialAttendanceLastMonthQuery = trialAttendanceLastMonthQuery.in('trial.branch_id', dashBranchIds);
      }

      // Build trial count queries (count trials ATTENDED this month vs last month)
      // Count attendance records where trial_id is not null and status is present/late
      const thisMonthStartDate = thisMonthStart.split('T')[0]; // YYYY-MM-DD
      const lastMonthStartDate = lastMonthStart.split('T')[0];

      let trialsThisMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, trial:trials!inner(branch_id)', { count: 'exact', head: true })
        .not('trial_id', 'is', null)
        .gte('date', thisMonthStartDate)
        .in('status', ['present', 'late']);

      if (dashBranchIds) {
        trialsThisMonthQuery = trialsThisMonthQuery.in('trial.branch_id', dashBranchIds);
      }

      let trialsLastMonthQuery = supabaseAdmin
        .from('attendance')
        .select('id, trial:trials!inner(branch_id)', { count: 'exact', head: true })
        .not('trial_id', 'is', null)
        .gte('date', lastMonthStartDate)
        .lt('date', thisMonthStartDate)
        .in('status', ['present', 'late']);

      if (dashBranchIds) {
        trialsLastMonthQuery = trialsLastMonthQuery.in('trial.branch_id', dashBranchIds);
      }

      // Build payment queries
      let paymentsThisMonthQuery = supabaseAdmin
        .from('payments')
        .select('amount, students!inner(branch_id)')
        .gte('created_at', thisMonthStart)
        .eq('status', 'paid');

      if (dashBranchIds) {
        paymentsThisMonthQuery = paymentsThisMonthQuery.in('students.branch_id', dashBranchIds);
      }

      let paymentsLastMonthQuery = supabaseAdmin
        .from('payments')
        .select('amount, students!inner(branch_id)')
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart)
        .eq('status', 'paid');

      if (dashBranchIds) {
        paymentsLastMonthQuery = paymentsLastMonthQuery.in('students.branch_id', dashBranchIds);
      }

      // Build adcoin transaction queries (sum total adcoins this month vs last month)
      // Exclude pool contributions (description starts with "Pool contribution")
      let adcoinThisMonthQuery = supabaseAdmin
        .from('adcoin_transactions')
        .select('amount')
        .gte('created_at', thisMonthStart)
        .not('description', 'ilike', 'Pool contribution%')
        .not('receiver_id', 'is', null);

      let adcoinLastMonthQuery = supabaseAdmin
        .from('adcoin_transactions')
        .select('amount')
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart)
        .not('description', 'ilike', 'Pool contribution%')
        .not('receiver_id', 'is', null);

      // Build payment due query (total RM of pending payments + student count)
      let pendingPaymentsQuery = supabaseAdmin
        .from('payments')
        .select('amount, student_id, students!inner(branch_id)')
        .eq('status', 'pending');

      if (dashBranchIds) {
        pendingPaymentsQuery = pendingPaymentsQuery.in('students.branch_id', dashBranchIds);
      }

      // Execute all queries in parallel
      const [
        { count: trialsThisMonth },
        { count: trialsLastMonth },
        { count: enrollmentAttendanceThisMonth },
        { count: enrollmentAttendanceLastMonth },
        { count: trialAttendanceThisMonth },
        { count: trialAttendanceLastMonth },
        { data: paymentsThisMonthData },
        { data: paymentsLastMonthData },
        { data: adcoinThisMonthData },
        { data: adcoinLastMonthData },
        { data: pendingPaymentsData },
      ] = await Promise.all([
        trialsThisMonthQuery,
        trialsLastMonthQuery,
        enrollmentAttendanceThisMonthQuery,
        enrollmentAttendanceLastMonthQuery,
        trialAttendanceThisMonthQuery,
        trialAttendanceLastMonthQuery,
        paymentsThisMonthQuery,
        paymentsLastMonthQuery,
        adcoinThisMonthQuery,
        adcoinLastMonthQuery,
        pendingPaymentsQuery,
      ]);

      // Calculate total pending payment amount (RM) and unique student count
      const paymentDueAmount = (pendingPaymentsData ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentDueStudentIds = new Set((pendingPaymentsData ?? []).map((p) => p.student_id));
      const paymentDueStudentCount = paymentDueStudentIds.size;

      // Process payment results (paid this month)
      const paymentsThisMonth = paymentsThisMonthData?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
      const paymentsLastMonth = paymentsLastMonthData?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

      // Calculate payment due percentage: pending / (pending + paid) * 100
      const totalPaymentAmount = paymentDueAmount + paymentsThisMonth;
      const paymentDuePercentage = totalPaymentAmount > 0
        ? (paymentDueAmount / totalPaymentAmount) * 100
        : 0;

      // Sum total adcoin amounts
      const currentAdcoinTransactions = (adcoinThisMonthData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      const prevAdcoinTransactions = (adcoinLastMonthData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Calculate trial stats
      const currentTrials = trialsThisMonth ?? 0;
      const prevTrials = trialsLastMonth ?? 0;

      // Combine enrollment and trial attendance counts
      const currentAttendance = (enrollmentAttendanceThisMonth ?? 0) + (trialAttendanceThisMonth ?? 0);
      const prevAttendance = (enrollmentAttendanceLastMonth ?? 0) + (trialAttendanceLastMonth ?? 0);

      // Helper to calculate percentage change (returns 100% if prev is 0 but current > 0)
      const calcChange = (current: number, prev: number): number => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
      };

      return {
        totalTrials: currentTrials,
        trialChange: calcChange(currentTrials, prevTrials),
        totalAttendance: currentAttendance,
        attendanceChange: calcChange(currentAttendance, prevAttendance),
        totalPayments: paymentsThisMonth,
        paymentsChange: calcChange(paymentsThisMonth, paymentsLastMonth),
        paymentDueAmount,
        paymentDueStudentCount,
        paymentDuePercentage,
        totalAdcoinTransactions: currentAdcoinTransactions,
        adcoinTransactionChange: calcChange(currentAdcoinTransactions, prevAdcoinTransactions),
      };
    });
  },
  ["dashboard-stats"],
  { revalidate: 60, tags: ["dashboard", "dashboard-stats"] }
);

export const getRecentActivity = unstable_cache(
  async (userEmail: string, limit = 10): Promise<RecentActivity[]> => {
    return withRetry(async () => {
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

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
              branches!inner(id, name, city)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dashBranchIds) {
        attendanceQuery = attendanceQuery.in('enrollments.students.branch_id', dashBranchIds);
      }

      const { data: attendanceData } = await attendanceQuery;

      const activities: RecentActivity[] = (attendanceData ?? []).map((a: any, index: number) => ({
        id: a.id,
        userName: a.enrollments?.students?.name ?? 'Unknown',
        action: 'checked in at',
        branchName: (useCityName ? (a.enrollments?.students?.branches?.city || a.enrollments?.students?.branches?.name) : a.enrollments?.students?.branches?.name) ?? 'Unknown',
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      let query = supabaseAdmin
        .from('students')
        .select('id, name, adcoin_balance, photo, branch_id, branches!inner(id, name, city)')
        .order('adcoin_balance', { ascending: false })
        .limit(limit);

      if (dashBranchIds) {
        query = query.in('branch_id', dashBranchIds);
      }

      const { data } = await query;

      return (data ?? []).map((s: any, index) => ({
        rank: index + 1,
        studentId: s.id,
        studentName: s.name,
        coins: s.adcoin_balance ?? 0,
        photo: s.photo,
        branchId: s.branches?.id ?? '',
        branchName: (useCityName ? (s.branches?.city || s.branches?.name) : s.branches?.name) ?? 'Unknown',
      }));
    });
  },
  ["adcoin-ranking"],
  { revalidate: 60, tags: ["dashboard", "adcoin-ranking"] }
);

export const getAdcoinTransactions = unstable_cache(
  async (userEmail: string, limit = 10): Promise<AdcoinTransaction[]> => {
    return withRetry(async () => {
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Fetch transactions
      const { data: transactions } = await supabaseAdmin
        .from('adcoin_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Fetch more to filter later

      if (!transactions || transactions.length === 0) {
        return [];
      }

      // Collect all participant IDs
      const participantIds = new Set<string>();
      for (const t of transactions) {
        if (t.sender_id) participantIds.add(t.sender_id);
        if (t.receiver_id) participantIds.add(t.receiver_id);
      }

      const idsArray = Array.from(participantIds);

      // Fetch students and users in parallel
      const [{ data: students }, { data: users }] = await Promise.all([
        supabaseAdmin
          .from('students')
          .select('id, name, photo, branch_id')
          .in('id', idsArray),
        supabaseAdmin
          .from('users')
          .select('id, name, photo, branch_id')
          .in('id', idsArray),
      ]);

      // Build participant map
      const participantMap = new Map<string, { name: string; photo: string | null; branchId: string }>();
      for (const s of students ?? []) {
        participantMap.set(s.id, { name: s.name, photo: s.photo, branchId: s.branch_id });
      }
      for (const u of users ?? []) {
        if (!participantMap.has(u.id)) {
          participantMap.set(u.id, { name: u.name, photo: u.photo, branchId: u.branch_id ?? '' });
        }
      }

      // Build results - prefer receiver info for display
      const results: AdcoinTransaction[] = [];
      for (const t of transactions) {
        const receiver = t.receiver_id ? participantMap.get(t.receiver_id) : null;
        const sender = t.sender_id ? participantMap.get(t.sender_id) : null;
        const participant = receiver ?? sender;

        if (!participant) continue;

        // Filter by branch if user has branch restriction
        if (dashBranchIds && !dashBranchIds.includes(participant.branchId)) continue;

        results.push({
          id: t.id,
          studentName: participant.name,
          type: t.type as "earned" | "spent",
          amount: t.amount,
          description: t.description,
          branchId: participant.branchId,
          avatarUrl: participant.photo,
          rank: results.length + 1,
          createdAt: new Date(t.created_at),
        });

        if (results.length >= limit) break;
      }

      return results;
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Get branches (exclude company-type entries — only hq/branch)
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        branchQuery = branchQuery.in('id', dashBranchIds);
      }

      const { data: branchesData } = await branchQuery;
      const branches: ChartBranch[] = (branchesData ?? []).map((b: any, idx) => ({
        id: b.id,
        name: useCityName ? (b.city || b.name) : b.name,
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

      // Fetch enrollment attendance records with branch info from students table
      const { data: enrollmentAttendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          enrollments!inner(
            id,
            status,
            students!inner(branch_id)
          )
        `)
        .is('trial_id', null)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Fetch trial attendance records with branch info from trials table
      const { data: trialAttendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          trial:trials!inner(
            id,
            branch_id
          )
        `)
        .not('trial_id', 'is', null)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Process enrollment attendance data
      (enrollmentAttendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.enrollments?.students?.branch_id;
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

      // Process trial attendance data - show in trial color (separate from weekly attendance)
      (trialAttendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.trial?.branch_id;
        if (!branchId || !attendanceData[branchId]) return;

        const recordDate = new Date(record.date);
        const monthIndex = recordDate.getMonth();
        const weekIndex = Math.min(getWeekOfMonth(recordDate), 3);

        const isPresent = record.status === 'present' || record.status === 'late';

        if (isPresent) {
          // Trial attendance shows in trial color (separate count)
          attendanceData[branchId][monthIndex][weekIndex].trial += 1;
        }
      });

      // Fetch enrollment records with branch info from students table
      const { data: enrollmentRecords } = await supabaseAdmin
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          status,
          students!inner(branch_id)
        `)
        .gte('enrolled_at', startDate.toISOString());

      // Process enrollment data
      (enrollmentRecords ?? []).forEach((record: any) => {
        const branchId = record.students?.branch_id;
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Get branches (exclude company-type entries — only hq/branch)
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        branchQuery = branchQuery.in('id', dashBranchIds);
      }

      const { data: branchesData } = await branchQuery;
      const branches: OverviewBranch[] = (branchesData ?? []).map((b: any, idx) => ({
        id: b.id,
        name: useCityName ? (b.city || b.name) : b.name,
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

      // Fetch enrollment attendance records with branch info from students table
      const { data: enrollmentAttendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          enrollments!inner(
            id,
            students!inner(branch_id)
          )
        `)
        .is('trial_id', null)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Fetch trial attendance records with branch info from trials table
      const { data: trialAttendanceRecords } = await supabaseAdmin
        .from('attendance')
        .select(`
          id,
          date,
          status,
          trial:trials!inner(
            id,
            branch_id
          )
        `)
        .not('trial_id', 'is', null)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Process enrollment attendance data - aggregate by month
      (enrollmentAttendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.enrollments?.students?.branch_id;
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

      // Process trial attendance data - add to attendance count
      (trialAttendanceRecords ?? []).forEach((record: any) => {
        const branchId = record.trial?.branch_id;
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Get branches (exclude company-type entries — only hq/branch)
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        branchQuery = branchQuery.in('id', dashBranchIds);
      }

      const { data: branchesData } = await branchQuery;
      const branches = (branchesData ?? []).map((b: any) => ({
        id: b.id,
        name: useCityName ? (b.city || b.name) : b.name,
      }));

      // Get students with payment due (pending payments or low sessions)
      let studentsQuery = supabaseAdmin
        .from('students')
        .select(`
          id,
          name,
          photo,
          branch_id,
          branches!inner(id, name, city)
        `)
        .is('deleted_at', null);

      if (dashBranchIds) {
        studentsQuery = studentsQuery.in('branch_id', dashBranchIds);
      }

      const { data: studentsData } = await studentsQuery;

      // Get enrollments with session counts for each student
      const studentIds = (studentsData ?? []).map((s) => s.id);

      if (studentIds.length === 0) {
        return { items: [], branches };
      }

      // Get enrollments and pending payments in parallel
      const [{ data: enrollmentsData }, { data: pendingPaymentsData }] = await Promise.all([
        supabaseAdmin
          .from('enrollments')
          .select(`
            id,
            student_id,
            sessions_remaining
          `)
          .in('student_id', studentIds)
          .in('status', ['active', 'completed']) // Include completed to capture negative sessions
          .is('deleted_at', null),
        // Get students who have pending (unpaid) payments
        supabaseAdmin
          .from('payments')
          .select('student_id')
          .in('student_id', studentIds)
          .eq('status', 'pending')
      ]);

      // Build set of students with pending payments
      const studentsWithPendingPayments = new Set(
        (pendingPaymentsData ?? []).map((p) => p.student_id)
      );

      // Calculate sessions left per student (use sessions_remaining directly)
      const sessionsMap: Record<string, number> = {};
      (enrollmentsData ?? []).forEach((e) => {
        const sessionsLeft = e.sessions_remaining ?? 0;
        if (sessionsMap[e.student_id] === undefined) {
          sessionsMap[e.student_id] = sessionsLeft;
        } else {
          sessionsMap[e.student_id] += sessionsLeft;
        }
      });

      // Filter to students with pending payments
      const items: PaymentDueItem[] = (studentsData ?? [])
        .filter((s) => {
          const hasPendingPayment = studentsWithPendingPayments.has(s.id);
          return hasPendingPayment; // Show all students with pending payments
        })
        .map((s, idx) => ({
          id: s.id,
          studentId: s.id,
          studentName: s.name,
          avatarUrl: s.photo,
          rank: idx + 1,
          sessionsLeft: sessionsMap[s.id] ?? 0,
          branchId: s.branch_id,
          branchName: (useCityName ? ((s.branches as any)?.city || (s.branches as any)?.name) : (s.branches as any)?.name) ?? 'Unknown',
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
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);
      const lastMonth = getThisMonthStart();
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Get branches (exclude company-type entries — only hq/branch)
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        branchQuery = branchQuery.in('id', dashBranchIds);
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
          branch: useCityName ? ((branch as any).city || branch.name) : branch.name,
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

export const getAdcoinPoolData = unstable_cache(
  async (userEmail: string): Promise<BranchPool[]> => {
    return withRetry(async () => {
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Get adcoin_per_rm from settings
      const { getSettings } = await import("./settings");
      const settings = await getSettings();
      const adcoinPerRm = parseInt(settings.adcoin_per_rm) || 333;

      // Get branches (exclude company-type entries — only hq/branch)
      let branchQuery = supabaseAdmin
        .from('branches')
        .select('id, name, city')
        .in('type', ['hq', 'branch'])
        .is('deleted_at', null)
        .order('name');

      if (dashBranchIds) {
        branchQuery = branchQuery.in('id', dashBranchIds);
      }

      const { data: branchesData } = await branchQuery;
      const branchIds = (branchesData ?? []).map(b => b.id);

      if (branchIds.length === 0) {
        return [];
      }

      // Query team members (instructor, admin, branch_admin) - exclude super_admin and students
      // Team members have branch_id and their adcoin_balance contributes to the pool
      const { data: teamMembers } = await supabaseAdmin
        .from('users')
        .select('branch_id, adcoin_balance')
        .in('branch_id', branchIds)
        .in('role', ['instructor', 'assistant_admin', 'company_admin', 'group_admin'])
        .is('deleted_at', null);

      // Aggregate adcoin balances by branch in JavaScript (fast, in-memory)
      const branchTotals = new Map<string, number>();
      for (const member of teamMembers ?? []) {
        if (member.branch_id) {
          const current = branchTotals.get(member.branch_id) ?? 0;
          branchTotals.set(member.branch_id, current + (member.adcoin_balance ?? 0));
        }
      }

      // Build result - RM = adcoins / adcoin_per_rm
      const pools: BranchPool[] = (branchesData ?? []).map((branch: any, idx) => ({
        id: branch.id,
        name: useCityName ? (branch.city || branch.name) : branch.name,
        color: POOL_COLORS[idx % POOL_COLORS.length],
        adcoins: branchTotals.get(branch.id) ?? 0,
        rmValue: (branchTotals.get(branch.id) ?? 0) / adcoinPerRm,
      }));

      return pools;
    });
  },
  ["adcoin-pool"],
  { revalidate: 60, tags: ["dashboard", "adcoin-pool"] }
);

export const getAdcoinProgressData = unstable_cache(
  async (userEmail: string): Promise<AdcoinProgressData> => {
    return withRetry(async () => {
      const { branchIds: dashBranchIds, useCityName } = await getDashboardBranchAccess(userEmail);

      // Get pool limit = total adcoin balance of team members (instructor, admin, branch_admin)
      let teamQuery = supabaseAdmin
        .from('users')
        .select('adcoin_balance')
        .in('role', ['instructor', 'assistant_admin', 'company_admin', 'group_admin'])
        .is('deleted_at', null);

      if (dashBranchIds) {
        teamQuery = teamQuery.in('branch_id', dashBranchIds);
      }

      const { data: teamMembers } = await teamQuery;
      const poolLimit = (teamMembers ?? []).reduce(
        (sum, u) => sum + (u.adcoin_balance ?? 0),
        0
      );

      // Get all student IDs (optionally filtered by branch)
      let studentQuery = supabaseAdmin
        .from('students')
        .select('id')
        .is('deleted_at', null);

      if (dashBranchIds) {
        studentQuery = studentQuery.in('branch_id', dashBranchIds);
      }

      const { data: students } = await studentQuery;
      const studentIds = (students ?? []).map(s => s.id);

      if (studentIds.length === 0) {
        return {
          currentTotal: 0,
          poolLimit,
        };
      }

      // Query adcoin transactions where receiver is a student
      // Exclude 5% admin contributions (type 'transfer' with "Admin contribution" description)
      const { data: transactions } = await supabaseAdmin
        .from('adcoin_transactions')
        .select('amount, type, description')
        .in('receiver_id', studentIds);

      // Sum transactions to students, excluding admin contributions
      const currentTotal = (transactions ?? []).reduce((sum, t) => {
        // Skip admin contribution transactions (5% from payments)
        if (t.type === 'transfer' && t.description?.includes('Admin contribution')) {
          return sum;
        }
        return sum + (t.amount ?? 0);
      }, 0);

      return {
        currentTotal,
        poolLimit,
      };
    });
  },
  ["adcoin-progress"],
  { revalidate: 60, tags: ["dashboard", "adcoin-progress"] }
);
