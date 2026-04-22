import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPaymentRecordsForTablePaginated } from "@/data/payments";

/**
 * GET /api/payment-record/table?offset=0&limit=50&startDate=2024-01-01&endDate=2024-12-31
 * Returns paginated payment record table rows for progressive loading.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const result = await getPaymentRecordsForTablePaginated(
    user.email ?? "",
    startDate,
    endDate,
    { offset, limit }
  );
  return NextResponse.json(result);
}
