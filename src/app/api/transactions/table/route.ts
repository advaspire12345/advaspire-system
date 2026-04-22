import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getTransactionsForDisplayPaginated } from "@/data/adcoins";

/**
 * GET /api/transactions/table?offset=0&limit=50
 * Returns paginated transaction display rows for progressive loading.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

  const result = await getTransactionsForDisplayPaginated(user.email, { offset, limit });

  return NextResponse.json(result);
}
