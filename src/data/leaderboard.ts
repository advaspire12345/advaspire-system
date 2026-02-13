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

export async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      `
      id,
      name,
      photo,
      branch_id,
      adcoin_balance,
      branch:branches(id, name),
      enrollments(
        course:courses(name)
      ),
      student_achievements(
        achievement:achievements(id, name, icon_url)
      )
    `
    )
    .is("deleted_at", null)
    .order("adcoin_balance", { ascending: false });

  if (error) {
    console.error("Error fetching leaderboard data:", error);
    return [];
  }

  return (data ?? []).map((student, index) => {
    // Get the first active course as program
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstEnrollment = student.enrollments?.[0] as any;
    const program = (firstEnrollment?.course?.name as string | undefined) ?? null;

    // Calculate level based on adcoin (every 500 adcoin = 1 level, starting at 1)
    const adcoinBalance = student.adcoin_balance ?? 0;
    const level = Math.floor(adcoinBalance / 500) + 1;

    // Calculate adstar (example: 1 star per 1000 adcoin earned)
    const adstar = Math.floor(adcoinBalance / 1000);

    // Map achievements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const achievements: LeaderboardAchievement[] = ((student.student_achievements as any[]) ?? [])
      .map((sa) => sa.achievement)
      .filter((a): a is LeaderboardAchievement => a !== null);

    return {
      id: student.id,
      rank: index + 1,
      studentId: student.id,
      studentName: student.name,
      photo: student.photo,
      branchId: student.branch_id,
      branchName:
        ((student.branch as unknown) as { id: string; name: string } | null)
          ?.name ?? "Unknown",
      program,
      level,
      adstar,
      adcoin: adcoinBalance,
      achievements,
    };
  });
}
