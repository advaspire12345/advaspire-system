import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CirclePlus, CircleMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Banner } from "@/components/ui/banner";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import {
  getDashboardStats,
  getRecentActivity,
  getAdcoinRanking,
  getAdcoinTransactions,
  getAttendanceChartData,
  getOverviewChartData,
  getBranchOverviewData,
  getPaymentDueListData,
  getAdcoinPoolData,
  getAdcoinProgressData,
  getBranches,
} from "@/data/dashboard";
import { PaymentDueList } from "@/components/dashboard/payment-due-list";
import { AdcoinPool } from "@/components/dashboard/adcoin-pool";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AdcoinTransactions } from "@/components/dashboard/adcoin-transactions";
import { AdcoinRanking } from "@/components/dashboard/adcoin-ranking";
import { AdcoinProgress } from "@/components/dashboard/adcoin-progress";
import { formatDistanceToNow } from "date-fns";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const userEmail = user.email;

  const [
    stats,
    recentActivity,
    adcoinRanking,
    adcoinTransactions,
    chartData,
    overviewData,
    branchOverview,
    paymentDueData,
    adcoinPoolData,
    adcoinProgressData,
    branches,
  ] = await Promise.all([
    getDashboardStats(userEmail),
    getRecentActivity(userEmail),
    getAdcoinRanking(userEmail),
    getAdcoinTransactions(userEmail),
    getAttendanceChartData(userEmail),
    getOverviewChartData(userEmail),
    getBranchOverviewData(userEmail),
    getPaymentDueListData(userEmail),
    getAdcoinPoolData(userEmail),
    getAdcoinProgressData(userEmail),
    getBranches(userEmail),
  ]);

  const statsCards = [
    {
      title: "Total Attendance",
      imageUrl: "/stat/01.jpg",
      value: stats.totalAttendance.toLocaleString(),
      change: formatPercentage(stats.attendanceChange),
      trend: stats.attendanceChange >= 0 ? "up" : "down",
      description: "vs last month",
    },
    {
      title: "Total Payments",
      imageUrl: "/stat/02.jpg",
      value: formatCurrency(stats.totalPayments),
      change: formatPercentage(stats.paymentsChange),
      trend: stats.paymentsChange >= 0 ? "up" : "down",
      description: "vs last month",
    },
    {
      title: "Payment Due",
      imageUrl: "/stat/03.jpg",
      value: stats.activeBranches.toString(),
      change:
        stats.branchesChange >= 0
          ? `+${stats.branchesChange}`
          : stats.branchesChange.toString(),
      trend: stats.branchesChange >= 0 ? "up" : "down",
      description: "new this month",
    },
    {
      title: "Total Adcoin Transaction",
      imageUrl: "/stat/04.jpg",
      value: stats.totalAdcoinBalance.toLocaleString(),
      change: formatPercentage(stats.adcoinChange),
      trend: stats.adcoinChange >= 0 ? "up" : "down",
      description: "vs last month",
    },
  ];

  return (
    <main className="flex-1 overflow-auto px-6 py-12 bg-[#f6f6fb]">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Banner
          backgroundImage="/banners/dashboard-bg.png"
          title="Welcome Back!"
          description="Track your progress and manage your activities"
          mascotImage="/banners/mascot.png"
        />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance & Enrollment Chart */}
          <AttendanceChart
            branches={chartData.branches}
            attendanceData={chartData.attendanceData}
            enrollmentData={chartData.enrollmentData}
          />

          {/* Overview Chart */}
          <OverviewChart
            branches={overviewData.branches}
            attendanceData={overviewData.attendanceData}
            engagementData={overviewData.engagementData}
          />
        </div>

        {/* Branch Overview Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Overview of Branches</CardTitle>
          </CardHeader>
          <CardContent>
            {branchOverview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No branch data available
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Branch</TableHead>
                    <TableHead className="font-semibold text-center">
                      Total Students
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Avg Monthly Enroll
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Active
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Inactive
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Active Rate
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Trial Conversion Rate
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Payment Due
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Payment Received
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchOverview.map((row) => (
                    <TableRow key={row.branch}>
                      <TableCell className="font-semibold">
                        {row.branch}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.totalStudents}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.avgEnroll}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.active}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.inactive}
                      </TableCell>
                      <TableCell className="text-center">
                        {(row.activeRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {(row.conversionRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        RM {row.paymentDue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        RM {row.paymentReceived.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Due List */}
        <PaymentDueList
          items={paymentDueData.items}
          branches={paymentDueData.branches}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card
              key={stat.title}
              style={{
                backgroundImage: `url(${stat.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-1">
                    {stat.trend === "up" ? (
                      <CirclePlus
                        className="h-4 w-4 text-[#41efff] "
                        strokeWidth={3}
                      />
                    ) : (
                      <CircleMinus className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-white font-semibold">
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-0">
                <CardTitle className="text-sm font-bold text-muted-foreground text-white">
                  {stat.title}
                </CardTitle>
                <span className="text-xs text-muted-foreground text-white">
                  {stat.description}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity - 2/3 */}
          <div className="lg:col-span-2">
            <RecentActivity
              activities={recentActivity.map((activity) => ({
                id: activity.id,
                userName: activity.userName,
                action: activity.action,
                branchName: activity.branchName,
                branchId: activity.branchId,
                avatarUrl: activity.avatarUrl ?? undefined,
                rank: activity.rank,
                timeAgo: formatDistanceToNow(activity.createdAt, {
                  addSuffix: true,
                }),
              }))}
              branches={branches}
            />
          </div>

          {/* Adcoin Ranking - 1/3 */}
          <AdcoinRanking
            rankings={adcoinRanking.map((member) => ({
              id: member.studentId,
              name: member.studentName,
              adcoins: member.coins,
              avatarUrl: member.photo ?? undefined,
              rank: member.rank,
              branchId: member.branchId,
              branchName: member.branchName,
            }))}
            branches={branches}
          />
        </div>

        {/* Adcoin Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Adcoin Pool - 1/3 */}
          <AdcoinPool branches={adcoinPoolData} />

          {/* Right Column - 2/3 */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Adcoin Progress */}
            <AdcoinProgress
              currentTotal={adcoinProgressData.currentTotal}
              poolLimit={adcoinProgressData.poolLimit}
              imageUrl="/badges/tycoon-s.png"
            />

            {/* Adcoin Transactions */}
            <AdcoinTransactions
              transactions={adcoinTransactions.map((tx) => ({
                id: tx.id,
                studentName: tx.studentName,
                type: tx.type,
                amount: tx.amount,
                description: tx.description,
                branchId: tx.branchId,
                avatarUrl: tx.avatarUrl ?? undefined,
                rank: tx.rank,
                timeAgo: formatDistanceToNow(tx.createdAt, { addSuffix: true }),
              }))}
              branches={branches}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
