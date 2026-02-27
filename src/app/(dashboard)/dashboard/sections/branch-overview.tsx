import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBranchOverviewData, getPaymentDueListData } from "@/data/dashboard";
import { PaymentDueList } from "@/components/dashboard/payment-due-list";

interface BranchOverviewSectionProps {
  userEmail: string;
}

export async function BranchOverviewSection({ userEmail }: BranchOverviewSectionProps) {
  const [branchOverview, paymentDueData] = await Promise.all([
    getBranchOverviewData(userEmail),
    getPaymentDueListData(userEmail),
  ]);

  return (
    <>
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

      <PaymentDueList
        items={paymentDueData.items}
        branches={paymentDueData.branches}
      />
    </>
  );
}
