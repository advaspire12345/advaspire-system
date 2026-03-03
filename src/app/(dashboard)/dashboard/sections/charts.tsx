import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { getAttendanceChartData, getOverviewChartData } from "@/data/dashboard";

interface DashboardChartsProps {
  userEmail: string;
}

export async function DashboardCharts({ userEmail }: DashboardChartsProps) {
  const [chartData, overviewData] = await Promise.all([
    getAttendanceChartData(userEmail),
    getOverviewChartData(userEmail),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AttendanceChart
        branches={chartData.branches}
        attendanceData={chartData.attendanceData}
        enrollmentData={chartData.enrollmentData}
      />
      <OverviewChart
        branches={overviewData.branches}
        attendanceData={overviewData.attendanceData}
        engagementData={overviewData.engagementData}
      />
    </div>
  );
}
