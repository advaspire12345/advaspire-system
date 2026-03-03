import { Suspense } from "react";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";

// Skeleton components for loading states
import {
  StatsSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ActivitySkeleton,
} from "@/components/skeletons";

// Async section components
import { DashboardStats } from "./sections/stats";
import { DashboardCharts } from "./sections/charts";
import { BranchOverviewSection } from "./sections/branch-overview";
import { ActivitySection } from "./sections/activity";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-6">
        {/* Banner renders immediately */}
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Welcome Back!"
          description="Track your progress and manage your activities"
          mascotImage="/banners/mascot.png"
        />

        {/* Charts load independently */}
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardCharts userEmail={user.email} />
        </Suspense>

        {/* Branch overview and payment due load independently */}
        <Suspense fallback={<TableSkeleton />}>
          <BranchOverviewSection userEmail={user.email} />
        </Suspense>

        {/* Stats load independently */}
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats userEmail={user.email} />
        </Suspense>

        {/* Activity section loads independently */}
        <Suspense fallback={<ActivitySkeleton />}>
          <ActivitySection userEmail={user.email} />
        </Suspense>
      </div>
    </main>
  );
}
