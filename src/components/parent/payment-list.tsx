import { format } from "date-fns";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ParentPaymentRecord } from "@/data/parent-portal";

interface PaymentListProps {
  payments: ParentPaymentRecord[];
}

const statusConfig: Record<
  string,
  { className: string; label: string }
> = {
  paid: { className: "bg-green-100 text-green-700", label: "Paid" },
  pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  failed: { className: "bg-red-100 text-red-700", label: "Failed" },
  refunded: { className: "bg-blue-100 text-blue-700", label: "Refunded" },
  cancelled: { className: "bg-red-100 text-red-700", label: "Cancelled" },
};

export function PaymentList({ payments }: PaymentListProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4 text-[#F17521]" />
        <h2 className="text-base font-bold text-[#3e3f5e]">
          Payment History
        </h2>
      </div>

      {!payments.length ? (
        <p className="text-sm text-[#8f91ac] text-center py-4">
          No payment records yet
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-hide">
          {payments.map((payment) => {
            const config =
              statusConfig[payment.status] ?? statusConfig.pending;

            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition-colors"
              >
                {/* Date */}
                <span className="text-xs font-semibold text-[#8f91ac] min-w-[60px]">
                  {format(new Date(payment.date), "d MMM")}
                </span>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3e3f5e] truncate">
                    {payment.courseName ?? "Course fee"}
                  </p>
                  <p className="text-xs text-[#8f91ac] truncate">
                    {payment.childName}
                  </p>
                </div>

                {/* Amount */}
                <span className="text-sm font-bold text-[#3e3f5e]">
                  RM {payment.amount.toFixed(2)}
                </span>

                {/* Status badge */}
                <Badge className={`text-[10px] ${config.className}`}>
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
