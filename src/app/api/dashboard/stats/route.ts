import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/data/dashboard";
import { supabaseAdmin } from "@/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getDashboardStats(user.email);

    // Get total adcoin balance across all students
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('adcoin_balance')
      .is('deleted_at', null);

    const totalAdcoinBalance = (students ?? []).reduce(
      (sum, s) => sum + (s.adcoin_balance ?? 0),
      0
    );

    return NextResponse.json({
      totalAdcoinBalance,
      adcoinChange: stats.adcoinTransactionChange,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
