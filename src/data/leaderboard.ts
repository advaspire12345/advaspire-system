import { supabaseAdmin } from "@/db";

export interface LeaderboardAchievement {
  id: string;
  name: string;
  icon_url: string | null;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  studentId: string;
  studentName: string;
  photo: string | null;
  branchId: string;
  branchName: string;
  program: string | null;
  level: number;
  adstar: number;
  adcoin: number;
  achievements: LeaderboardAchievement[];
}

export async function getLeaderboardData(userEmail?: string): Promise<LeaderboardEntry[]> {
  // Get user's branch access — resolve company IDs to child HQ/branch IDs
  let branchIds: string[] | null = null;
  let useCityName = false;

  if (userEmail) {
    const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
    branchIds = await getUserBranchIds(userEmail);
    const currentUser = await getUserByEmail(userEmail);
    useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

    // Only expand company IDs for admin role, NOT branch_admin/instructor
    if (branchIds && branchIds.length > 0 && currentUser?.role === "admin") {
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
  }

  // Fetch students with enrollments including level
  let query = supabaseAdmin
    .from("students")
    .select(
      `
      id,
      name,
      photo,
      branch_id,
      adcoin_balance,
      branch:branches(id, name, city),
      enrollments(
        level,
        course:courses(name)
      ),
      student_achievements(
        achievement:achievements(id, name, icon_url)
      )
    `
    )
    .is("deleted_at", null)
    .order("adcoin_balance", { ascending: false });

  if (branchIds) {
    query = query.in("branch_id", branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leaderboard data:", error);
    return [];
  }

  const students = data ?? [];
  const studentIds = students.map((s) => s.id);

  // Fetch adstar: total adcoins received from staff (admin, branch_admin, instructor, super_admin)
  // Any transaction where the sender is a user (staff) counts as adstar
  let adstarMap: Record<string, number> = {};
  if (studentIds.length > 0) {
    // Get all staff user IDs
    const { data: staffUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .is("deleted_at", null);
    const staffIds = new Set((staffUsers ?? []).map((u) => u.id));

    // Get all transactions where students are receivers
    const { data: adstarData } = await supabaseAdmin
      .from("adcoin_transactions")
      .select("sender_id, receiver_id, amount")
      .in("receiver_id", studentIds)
      .not("sender_id", "is", null);

    for (const tx of adstarData ?? []) {
      // Only count if sender is a staff member (exists in users table)
      if (tx.receiver_id && tx.sender_id && staffIds.has(tx.sender_id)) {
        adstarMap[tx.receiver_id] = (adstarMap[tx.receiver_id] ?? 0) + tx.amount;
      }
    }
  }

  return students.map((student, index) => {
    // Get the first active course as program
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (student.enrollments ?? []) as any[];
    const firstEnrollment = enrollments[0];
    const program = (firstEnrollment?.course?.name as string | undefined) ?? null;

    // Level = highest level among all enrollments (minimum 1)
    const level = enrollments.length > 0
      ? Math.max(...enrollments.map((e: any) => e.level ?? 1))
      : 1;

    // Adstar = total adcoins earned from staff (not student-to-student transfers)
    const adstar = adstarMap[student.id] ?? 0;

    const adcoinBalance = student.adcoin_balance ?? 0;

    // Map achievements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const achievements: LeaderboardAchievement[] = ((student.student_achievements as any[]) ?? [])
      .map((sa) => sa.achievement)
      .filter((a): a is LeaderboardAchievement => a !== null);

    const branchData = student.branch as unknown as { id: string; name: string; city: string | null } | null;

    return {
      id: student.id,
      rank: index + 1,
      studentId: student.id,
      studentName: student.name,
      photo: student.photo,
      branchId: student.branch_id,
      branchName: useCityName
        ? (branchData?.city || branchData?.name || "Unknown")
        : (branchData?.name ?? "Unknown"),
      program,
      level,
      adstar,
      adcoin: adcoinBalance,
      achievements,
    };
  });
}

/**
 * Paginated version of getLeaderboardData.
 * Returns rows for a slice of students + total count, for progressive loading.
 */
export async function getLeaderboardDataPaginated(
  userEmail: string | undefined,
  options: { offset: number; limit: number }
): Promise<{ rows: LeaderboardEntry[]; totalCount: number }> {
  // Get user's branch access — resolve company IDs to child HQ/branch IDs
  let branchIds: string[] | null = null;
  let useCityName = false;

  if (userEmail) {
    const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
    branchIds = await getUserBranchIds(userEmail);
    const currentUser = await getUserByEmail(userEmail);
    useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

    // Only expand company IDs for admin role, NOT branch_admin/instructor
    if (branchIds && branchIds.length > 0 && currentUser?.role === "admin") {
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
  }

  // Count query
  let countQuery = supabaseAdmin
    .from("students")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (branchIds) {
    countQuery = countQuery.in("branch_id", branchIds);
  }

  const { count: totalCount } = await countQuery;

  // Main paginated query - fetch students with enrollments including level
  let query = supabaseAdmin
    .from("students")
    .select(
      `
      id,
      name,
      photo,
      branch_id,
      adcoin_balance,
      branch:branches(id, name, city),
      enrollments(
        level,
        course:courses(name)
      ),
      student_achievements(
        achievement:achievements(id, name, icon_url)
      )
    `
    )
    .is("deleted_at", null)
    .order("adcoin_balance", { ascending: false });

  if (branchIds) {
    query = query.in("branch_id", branchIds);
  }

  // Apply pagination
  query = query.range(options.offset, options.offset + options.limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching paginated leaderboard data:", error);
    return { rows: [], totalCount: 0 };
  }

  const students = data ?? [];
  const studentIds = students.map((s) => s.id);

  // Fetch adstar: total adcoins received from staff (admin, branch_admin, instructor, super_admin)
  // Any transaction where the sender is a user (staff) counts as adstar
  let adstarMap: Record<string, number> = {};
  if (studentIds.length > 0) {
    // Get all staff user IDs
    const { data: staffUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .is("deleted_at", null);
    const staffIds = new Set((staffUsers ?? []).map((u) => u.id));

    // Get all transactions where students are receivers
    const { data: adstarData } = await supabaseAdmin
      .from("adcoin_transactions")
      .select("sender_id, receiver_id, amount")
      .in("receiver_id", studentIds)
      .not("sender_id", "is", null);

    for (const tx of adstarData ?? []) {
      // Only count if sender is a staff member (exists in users table)
      if (tx.receiver_id && tx.sender_id && staffIds.has(tx.sender_id)) {
        adstarMap[tx.receiver_id] = (adstarMap[tx.receiver_id] ?? 0) + tx.amount;
      }
    }
  }

  const rows: LeaderboardEntry[] = students.map((student, index) => {
    // Get the first active course as program
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (student.enrollments ?? []) as any[];
    const firstEnrollment = enrollments[0];
    const program = (firstEnrollment?.course?.name as string | undefined) ?? null;

    // Level = highest level among all enrollments (minimum 1)
    const level = enrollments.length > 0
      ? Math.max(...enrollments.map((e: any) => e.level ?? 1))
      : 1;

    // Adstar = total adcoins earned from staff (not student-to-student transfers)
    const adstar = adstarMap[student.id] ?? 0;

    const adcoinBalance = student.adcoin_balance ?? 0;

    // Map achievements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const achievements: LeaderboardAchievement[] = ((student.student_achievements as any[]) ?? [])
      .map((sa) => sa.achievement)
      .filter((a): a is LeaderboardAchievement => a !== null);

    const branchData = student.branch as unknown as { id: string; name: string; city: string | null } | null;

    return {
      id: student.id,
      rank: options.offset + index + 1,
      studentId: student.id,
      studentName: student.name,
      photo: student.photo,
      branchId: student.branch_id,
      branchName: useCityName
        ? (branchData?.city || branchData?.name || "Unknown")
        : (branchData?.name ?? "Unknown"),
      program,
      level,
      adstar,
      adcoin: adcoinBalance,
      achievements,
    };
  });

  return { rows, totalCount: totalCount ?? 0 };
}
