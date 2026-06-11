"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, X as XIcon, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TopupApproveModal } from "@/components/marketplace/topup-approve-modal";
import { ReceiptPreviewModal } from "@/components/payments/receipt-preview-modal";
import { ImagePreviewModal } from "@/components/payments/image-preview-modal";
import { rejectTopupRequestAction } from "@/app/(dashboard)/marketplace/actions";
import { notify } from "@/lib/notify";
import type { TopupRequestRow } from "@/data/marketplace";

interface MarketplaceTableProps {
  initialData: TopupRequestRow[];
  showActions: boolean; // true for super_admin only
  approverName?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function MarketplaceTable({ initialData, showActions, approverName }: MarketplaceTableProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  // Resync after router.refresh() so saved/edited/deleted rows appear without a manual reload.
  useEffect(() => { setData(initialData); }, [initialData]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState<TopupRequestRow | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceRow, setInvoiceRow] = useState<TopupRequestRow | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  const openInvoice = (row: TopupRequestRow) => {
    setInvoiceRow(row);
    setInvoiceOpen(true);
  };

  const openImagePreview = (imageSrc: string) => {
    setPreviewImageSrc(imageSrc);
    setImagePreviewOpen(true);
  };

  const openApprove = (row: TopupRequestRow) => {
    setSelected(row);
    setApproveOpen(true);
  };

  const handleReject = async (row: TopupRequestRow) => {
    const ok = confirm(`Reject top-up request from ${row.pic} (${row.topUpAmount} adcoins)?`);
    if (!ok) return;
    const result = await rejectTopupRequestAction({ requestId: row.id });
    if (!result.success) {
      notify.error("Reject failed", result.error);
      return;
    }
    notify.success("Request rejected");
    setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "rejected" } : r)));
    router.refresh();
  };

  const onApproved = () => {
    if (selected) {
      setData((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: "approved" } : r)));
    }
    router.refresh();
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="space-y-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {[
                    { key: "branch", label: "Branch Request", width: "180px" },
                    { key: "amount", label: "Top Up Amount", width: "140px", align: "right" },
                    { key: "receipt", label: "Receipt", width: "100px", align: "center" },
                    { key: "date", label: "Date", width: "140px" },
                    { key: "pic", label: "PIC", width: "160px" },
                    { key: "status", label: "Status", width: "110px", align: "center" },
                    { key: "invoice", label: "Invoice", width: "120px", align: "center" as const },
                    ...(showActions ? [{ key: "action", label: "Action", width: "120px", align: "center" as const }] : []),
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "bg-transparent px-4 py-3 text-left text-base font-bold text-foreground",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                      )}
                      style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
            <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showActions ? 8 : 7}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No top-up requests yet.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        idx === 0 && "[&>td:first-child]:rounded-tl-lg [&>td:last-child]:rounded-tr-lg",
                        idx === data.length - 1 && "[&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-br-lg",
                      )}
                    >
                      <td className="px-4 py-3" style={{ width: "180px" }}>{row.branchRequest}</td>
                      <td className="px-4 py-3 text-right" style={{ width: "140px" }}>
                        {row.topUpAmount.toLocaleString()} <span className="text-xs text-muted-foreground">(RM {row.rmAmount.toFixed(2)})</span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ width: "100px" }}>
                        {row.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => openImagePreview(row.receiptUrl!)}
                            className="mx-auto block"
                          >
                            <Image
                              src={row.receiptUrl}
                              alt="Receipt"
                              width={32}
                              height={32}
                              className="h-8 w-8 object-cover rounded cursor-pointer hover:ring-2 hover:ring-[#23D2E2] transition"
                            />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ width: "140px" }}>
                        {format(new Date(row.date), "do MMM yyyy")}
                      </td>
                      <td className="px-4 py-3" style={{ width: "160px" }}>{row.pic}</td>
                      <td className="px-4 py-3 text-center" style={{ width: "110px" }}>
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[row.status])}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ width: "120px" }}>
                        {row.invoiceSnapshot ? (
                          <button
                            type="button"
                            onClick={() => openInvoice(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-transparent hover:bg-[#23D2E2] hover:text-white"
                            title="Download Invoice"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Invoice</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {showActions && (
                        <td className="px-4 py-3 text-center" style={{ width: "120px" }}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openApprove(row)}
                              disabled={row.status !== "pending"}
                              className={cn(
                                "rounded-lg border p-2 transition",
                                row.status === "pending"
                                  ? "border-muted-foreground/30 text-muted-foreground hover:border-transparent hover:bg-green-500 hover:text-white"
                                  : "border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed",
                              )}
                              aria-label="Approve top-up"
                              title={row.status === "pending" ? "Approve" : `Already ${row.status}`}
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(row)}
                              disabled={row.status !== "pending"}
                              className={cn(
                                "rounded-lg border p-2 transition",
                                row.status === "pending"
                                  ? "border-muted-foreground/30 text-muted-foreground hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                                  : "border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed",
                              )}
                              aria-label="Reject top-up"
                              title={row.status === "pending" ? "Reject" : `Already ${row.status}`}
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showActions && (
        <TopupApproveModal
          open={approveOpen}
          onOpenChange={setApproveOpen}
          request={selected}
          approverName={approverName ?? "Super Admin"}
          onApproved={onApproved}
        />
      )}

      <ImagePreviewModal
        open={imagePreviewOpen}
        onOpenChange={setImagePreviewOpen}
        imageSrc={previewImageSrc ?? ""}
        title="Receipt Photo"
      />

      {invoiceRow?.invoiceSnapshot && (
        <ReceiptPreviewModal
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          billToName={invoiceRow.invoiceSnapshot.billToName}
          billToAddress={invoiceRow.invoiceSnapshot.billToAddress ?? ""}
          billToContact={invoiceRow.invoiceSnapshot.billToContact ?? undefined}
          date={new Date(invoiceRow.invoiceSnapshot.date)}
          receiptNo={invoiceRow.invoiceSnapshot.invoiceNumber}
          invoiceNo={invoiceRow.invoiceSnapshot.invoiceNumber}
          items={invoiceRow.invoiceSnapshot.items}
          total={invoiceRow.invoiceSnapshot.total}
          branch={
            invoiceRow.invoiceSnapshot.branch
              ? {
                  name: invoiceRow.invoiceSnapshot.branch.name,
                  companyName: invoiceRow.invoiceSnapshot.branch.companyName,
                  address: invoiceRow.invoiceSnapshot.branch.address,
                  phone: invoiceRow.invoiceSnapshot.branch.phone,
                  email: invoiceRow.invoiceSnapshot.branch.email,
                  bankName: invoiceRow.invoiceSnapshot.branch.bankName,
                  bankAccount: invoiceRow.invoiceSnapshot.branch.bankAccount,
                }
              : undefined
          }
        />
      )}
    </>
  );
}
