"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReceiptItem {
  code: string;
  product: string;
  qty: number;
  rate: number;
}

interface BranchInfo {
  name: string;
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
}

interface ReceiptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billToName: string;
  billToAddress?: string;
  billToContact?: string;
  date: Date;
  receiptNo: string;
  invoiceNo: string;
  items: ReceiptItem[];
  total: number;
  branch?: BranchInfo;
}

function formatDisplayDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

export function ReceiptPreviewModal({
  open,
  onOpenChange,
  billToName,
  billToAddress = "",
  billToContact,
  date,
  receiptNo,
  invoiceNo,
  items,
  total,
  branch,
}: ReceiptPreviewModalProps) {
  // Use branch info or defaults
  const companyName = branch?.companyName || "ADVASPIRE SDN BHD";
  const companyAddress = branch?.address || "32A-3, Jalan Ecohill 1/3C, Setia Ecohill\n43500 Semenyih, Selangor";
  const companyPhone = branch?.phone || "012-5804645";
  const companyEmail = branch?.email || "advaspire@gmail.com";
  const bankName = branch?.bankName || "HONG LEONG BANK";
  const bankAccount = branch?.bankAccount || "201 000 48797";
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    setIsDownloading(true);
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import("html2canvas-pro")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );
      pdf.save(`receipt-${invoiceNo || "download"}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[95vh]" floatingCloseButton>
        <div className="p-6 pb-0 flex flex-row items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Receipt Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-100px)] p-6">
          {/* Receipt Content */}
          <div
            ref={receiptRef}
            className="w-[700px] max-w-full mx-auto bg-white text-black p-8 text-xs leading-relaxed"
          >
            {/* Header */}
            <div className="flex justify-between mb-4">
              {/* Left: logo + company */}
              <div>
                {/* Logo + name in same line */}
                <div className="flex items-end gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/advaspire-logo.png"
                    alt="Advaspire logo"
                    className="w-20 h-20 object-contain"
                  />
                  <div className="text-lg font-bold uppercase pb-1">
                    {companyName}
                  </div>
                </div>

                {/* Address on its own lines */}
                <div className="mt-1 text-[11px]">
                  {companyAddress.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>

                {/* Contact + Email in same line */}
                <div className="mt-1 flex flex-wrap gap-4 text-[11px]">
                  <span>Contact: {companyPhone}</span>
                  <span>Email: {companyEmail}</span>
                </div>
              </div>

              {/* Right: bigger RECEIPT text */}
              <div className="text-right flex flex-col items-end justify-center">
                <div className="text-5xl font-extrabold uppercase tracking-wide">
                  RECEIPT
                </div>
              </div>
            </div>

            <div className="border-b border-black mb-3 border-2" />

            {/* Bill To */}
            <div className="p-2 text-[11px] flex justify-between">
              <div>
                {/* Row 1: BILL TO: + name on same line */}
                <div className="flex gap-1">
                  <span className="uppercase whitespace-nowrap">BILL TO:</span>
                  <span className="ml-[20px] font-bold">{billToName}</span>
                </div>

                {/* Row 2: address, same value column under the name */}
                {billToAddress && (
                  <div className="mt-1 ml-[58px] whitespace-pre-line">
                    {billToAddress}
                  </div>
                )}

                {/* Row 3: Contact: + number on same line, same label column as BILL TO */}
                {billToContact && (
                  <div className="mt-1 flex gap-1">
                    <span className="whitespace-nowrap">Contact:</span>
                    <span className="font-bold ml-[17px]">{billToContact}</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="flex justify-between mb-4 text-[11px]">
                  {/* Left: keys, one per row */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold">DATE:</span>
                    <span className="font-bold whitespace-nowrap">
                      RECEIPT NO:
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      INVOICE NO:
                    </span>
                    <span className="font-bold">PAGE:</span>
                  </div>

                  {/* Right: values, one per row */}
                  <div className="flex flex-col items-start gap-1 ml-2">
                    <span className="font-bold">{formatDisplayDate(date)}</span>
                    <span className="font-bold text-[#ff0000]">{receiptNo}</span>
                    <span className="font-bold text-[#ff0000]">{invoiceNo}</span>
                    <span className="font-bold">1 of 1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full border-collapse text-[11px] mb-4">
              <thead>
                <tr>
                  <th className="border-y border-black px-1 py-1 w-14 text-left">
                    ITEM NO
                  </th>
                  <th className="border-y border-black px-1 py-1 w-32 text-left">
                    CODE
                  </th>
                  <th className="border-y border-black px-1 py-1 text-left">
                    PRODUCT
                  </th>
                  <th className="border-y border-black px-1 py-1 w-10 text-right">
                    QTY
                  </th>
                  <th className="border-y border-black px-1 py-1 w-20 text-right">
                    RATE
                  </th>
                  <th className="border-y border-black px-1 py-1 w-20 text-right" />
                  <th className="border-y border-black px-1 py-1 w-24 text-right">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  // Check if this is a detail/sub-item row (no qty/rate)
                  const isDetailRow = item.qty === 0 && item.rate === 0;

                  return (
                    <tr key={idx}>
                      <td className="px-1 py-1 align-top text-center">
                        {isDetailRow ? "" : idx + 1}
                      </td>
                      <td className="px-1 py-1 align-top">{item.code}</td>
                      <td className="px-1 py-1 align-top whitespace-pre-line">{item.product}</td>
                      <td className="px-1 py-1 text-right align-top text-center">
                        {isDetailRow ? "" : item.qty}
                      </td>
                      <td className="px-1 py-1 text-right align-top text-center">
                        {isDetailRow ? "" : item.rate.toFixed(2)}
                      </td>
                      <td className="px-1 py-1 text-right align-top text-center">
                        {isDetailRow ? "" : "RM"}
                      </td>
                      <td className="px-1 py-1 text-right align-top text-center">
                        {isDetailRow ? "" : (item.qty * item.rate).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-b border-black" />

            {/* Totals */}
            <div className="flex justify-end mb-4 text-[11px]">
              <div className="w-68 border-b border-black">
                <div className="flex justify-between px-2 py-1 border-b border-black">
                  <span className="font-bold">AMOUNT RECEIVED</span>
                  <span className="font-bold">RM</span>
                  <span className="font-bold">{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bank details + notes */}
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <div className="font-bold uppercase underline">
                  BANK DETAILS:
                </div>
                <p className="font-bold uppercase">{bankName}</p>
                <p className="font-bold uppercase">ACC NO: {bankAccount}</p>
                <div className="font-semibold mt-4 mb-1">Notes:</div>
                <ol className="list-decimal list-inside">
                  <li>
                    All cheques should be crossed and made payable to
                    <p className="font-bold px-10">{companyName}</p>
                  </li>
                  <li className="mt-2">
                    Goods sold are neither returnable nor refundable. Otherwise
                    a{" "}
                    <span className="font-bold">
                      cancellation fee of at least 20%
                    </span>{" "}
                    on purchase price may be imposed.
                  </li>
                </ol>
              </div>
              <div>
                <div className="text-center text-[13px] font-bold">
                  THANK YOU!
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
