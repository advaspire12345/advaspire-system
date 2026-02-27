import { formatDistanceToNow } from "date-fns";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AdcoinRanking } from "@/components/dashboard/adcoin-ranking";
import { AdcoinPool } from "@/components/dashboard/adcoin-pool";
import { AdcoinProgress } from "@/components/dashboard/adcoin-progress";
import { AdcoinTransactions } from "@/components/dashboard/adcoin-transactions";
import {
  getRecentActivity,
  getAdcoinRanking,
  getAdcoinTransactions,
  getAdcoinPoolData,
  getAdcoinProgressData,
  getBranches,
} from "@/data/dashboard";

interface ActivitySectionProps {
  userEmail: string;
}

export async function ActivitySection({ userEmail }: ActivitySectionProps) {
  const [
    recentActivity,
    adcoinRanking,
    adcoinTransactions,
    adcoinPoolData,
    adcoinProgressData,
    branches,
  ] = await Promise.all([
    getRecentActivity(userEmail),
    getAdcoinRanking(userEmail),
    getAdcoinTransactions(userEmail),
    getAdcoinPoolData(userEmail),
    getAdcoinProgressData(userEmail),
    getBranches(userEmail),
  ]);

  return (
    <>
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
    </>
  );
}
