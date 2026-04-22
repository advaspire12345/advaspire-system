import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getStudentsForTablePaginated } from "@/data/students";

/**
 * GET /api/student/table?offset=10&limit=50
 * Returns paginated student table rows for progressive loading.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Cap limit to prevent abuse
  const safeLim = Math.min(Math.max(limit, 1), 200);

  const result = await getStudentsForTablePaginated(user.email, {
    offset,
    limit: safeLim,
  });

  return NextResponse.json(result);
}
