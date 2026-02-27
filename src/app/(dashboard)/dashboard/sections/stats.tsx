import { CirclePlus, CircleMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/data/dashboard";

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

interface DashboardStatsProps {
  userEmail: string;
}

export async function DashboardStats({ userEmail }: DashboardStatsProps) {
  const stats = await getDashboardStats(userEmail);

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
  );
}
