import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getLeaderboardDataPaginated } from "@/data/leaderboard";

/**
 * GET /api/leaderboard/table?offset=0&limit=50
 * Returns paginated leaderboard rows for progressive loading.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

  const result = await getLeaderboardDataPaginated(user.email, { offset, limit });

  return NextResponse.json(result);
}
