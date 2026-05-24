"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Receipt, Download, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaymentPayModal } from "@/components/parent/payment-pay-modal";
import { ReceiptPreviewModal } from "@/components/payments/receipt-preview-modal";
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
  const [payTarget, setPayTarget] = useState<ParentPaymentRecord | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<ParentPaymentRecord | null>(null);

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
            const isPending = payment.status === "pending";
            const canDownloadReceipt =
              payment.status === "paid" && !!payment.invoiceSnapshot;

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
                    {isPending && payment.parentMarkedPaidAt && (
                      <span className="ml-1 text-amber-600">
                        · Slip uploaded — awaiting staff
                      </span>
                    )}
                  </p>
                </div>

                {/* Amount */}
                <span className="text-sm font-bold text-[#3e3f5e]">
                  RM {payment.amount.toFixed(2)}
                </span>

                {/* Status badge or action */}
                {isPending ? (
                  <button
                    type="button"
                    onClick={() => setPayTarget(payment)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#23D2E2] px-3 py-1 text-[10px] font-bold text-white hover:bg-[#18a9b8]"
                  >
                    <CreditCard className="h-3 w-3" />
                    Pay Now
                  </button>
                ) : canDownloadReceipt ? (
                  <button
                    type="button"
                    onClick={() => setReceiptTarget(payment)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#3e3f5e] px-3 py-1 text-[10px] font-bold text-white hover:bg-[#2f3048]"
                  >
                    <Download className="h-3 w-3" />
                    Receipt
                  </button>
                ) : (
                  <Badge className={`text-[10px] ${config.className}`}>
                    {config.label}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payTarget && (
        <PaymentPayModal
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          payment={{
            id: payTarget.id,
            amount: payTarget.amount,
            studentName: payTarget.childName,
            description: payTarget.courseName,
          }}
        />
      )}

      {receiptTarget && receiptTarget.invoiceSnapshot && (
        <ReceiptPreviewModal
          open={!!receiptTarget}
          onOpenChange={(open) => !open && setReceiptTarget(null)}
          billToName={receiptTarget.invoiceSnapshot.billToName}
          billToAddress={receiptTarget.invoiceSnapshot.billToAddress ?? undefined}
          billToContact={receiptTarget.invoiceSnapshot.billToContact ?? undefined}
          date={receiptTarget.paidAt ? new Date(receiptTarget.paidAt) : new Date()}
          receiptNo={
            receiptTarget.invoiceNumber ??
            `RCP-${receiptTarget.id.slice(0, 8).toUpperCase()}`
          }
          invoiceNo={
            receiptTarget.invoiceNumber ??
            `INV-${receiptTarget.id.slice(0, 8).toUpperCase()}`
          }
          items={receiptTarget.invoiceSnapshot.items}
          total={receiptTarget.invoiceSnapshot.total}
          branch={{
            name: receiptTarget.invoiceSnapshot.branchName,
            companyName: receiptTarget.invoiceSnapshot.branchCompanyName,
            address: receiptTarget.invoiceSnapshot.branchAddress,
            phone: receiptTarget.invoiceSnapshot.branchPhone,
            email: receiptTarget.invoiceSnapshot.branchEmail,
            bankName: receiptTarget.invoiceSnapshot.branchBankName,
            bankAccount: receiptTarget.invoiceSnapshot.branchBankAccount,
          }}
        />
      )}
    </div>
  );
}
