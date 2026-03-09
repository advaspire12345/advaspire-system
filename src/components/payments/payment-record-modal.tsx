"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingSelect } from "@/components/ui/floating-select";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { PaymentRecordRow } from "@/data/payments";
import type { PaymentMethod } from "@/db/schema";

export type PaymentRecordModalMode = "edit" | "delete";

export interface CourseOption {
  id: string;
  name: string;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
}

interface PaymentRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PaymentRecordModalMode;
  record: PaymentRecordRow | null;
  courses?: CourseOption[];
  packages?: PackageOption[];
  onSubmit: (data: PaymentRecordFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface PaymentRecordFormData {
  courseId: string | null;
  packageId: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "promptpay", label: "PromptPay" },
  { value: "other", label: "Other" },
];

export function PaymentRecordModal({
  open,
  onOpenChange,
  mode,
  record,
  courses = [],
  packages = [],
  onSubmit,
  onDelete,
}: PaymentRecordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paidAt, setPaidAt] = useState("");
  const [receiptPhoto, setReceiptPhoto] = useState<string[]>([]);

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open && record) {
      setPaymentMethod(record.paymentMethod ?? "");
      setPaidAt(
        record.paidAt ? format(new Date(record.paidAt), "yyyy-MM-dd") : ""
      );
      setReceiptPhoto(record.receiptPhoto ? [record.receiptPhoto] : []);
    }
  }, [open, record]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "delete") {
        await onDelete();
      } else {
        if (!record) return;
        // Course, package, and price are read-only, use values from record
        await onSubmit({
          courseId: record.courseId,
          packageId: record.packageId,
          price: record.price,
          paymentMethod: paymentMethod || null,
          paidAt: paidAt ? new Date(paidAt).toISOString() : null,
          receiptPhoto: receiptPhoto[0] || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadonly = mode === "delete";
  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  const getModalTitle = () => {
    if (mode === "delete") return "Delete Payment Record";
    return "Edit Payment Record";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "delete") return "This action cannot be undone";
    return "Update payment record details";
  };

  // We need a record for this modal
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {getModalTitle()}
            </DialogTitle>
          </DialogHeader>

          {mode === "delete" && (
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this payment record? This action
              cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Parent Name (readonly) */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value={record.parentName ?? "-"}
                className={cn(
                  "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                  readonlyFieldClass
                )}
              />
              <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                Parent Name
              </label>
            </div>

            {/* Student Name (readonly) */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value={record.studentName ?? "-"}
                className={cn(
                  "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                  readonlyFieldClass
                )}
              />
              <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                Student Name
              </label>
            </div>

            {/* Branch and Program */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record.branchName ?? "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Branch
                </label>
              </div>

              {/* Program - always read-only */}
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record.courseName ?? "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Program
                </label>
              </div>
            </div>

            {/* Package and Price */}
            <div className="grid grid-cols-2 gap-4">
              {/* Package - always read-only */}
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record.packageName ?? "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Package
                </label>
              </div>

              <div className="relative">
                <div
                  className={cn(
                    "flex h-[58px] items-center justify-center rounded-[10px] border border-[#ADAFCA] text-2xl font-bold text-[#23d2e2]",
                    readonlyFieldClass
                  )}
                >
                  RM{record.price.toLocaleString()}
                </div>
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Price
                </label>
              </div>
            </div>

            {/* Payment Method */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    paymentMethod
                      ? (PAYMENT_METHODS.find((m) => m.value === paymentMethod)
                          ?.label ?? paymentMethod)
                      : "-"
                  }
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Payment Method
                </label>
              </div>
            ) : (
              <FloatingSelect
                id="select-payment-method"
                label="Payment Method"
                placeholder="Select payment method..."
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={PAYMENT_METHODS}
              />
            )}

            {/* Paid On */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={paidAt ? format(new Date(paidAt), "do MMM yyyy") : "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Paid On
                </label>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="date"
                  id="paid-at"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 pr-12 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ADAFCA]" />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Paid On
                </label>
              </div>
            )}

            {/* Receipt Photo */}
            {isReadonly ? (
              receiptPhoto.length > 0 && (
                <div>
                  <label className="block text-[#ADAFCA] font-bold text-xs mb-2">
                    Receipt
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {receiptPhoto.map((photo, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-12 rounded-lg overflow-hidden shadow-sm"
                      >
                        <Image
                          src={photo}
                          alt="Receipt"
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <PhotoUpload
                value={receiptPhoto}
                onChange={setReceiptPhoto}
                maxFiles={1}
                label="Receipt Photo"
              />
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete" && "bg-[#fd434f] hover:bg-[#e03a45]",
                mode === "edit" && "bg-[#23D2E2] hover:bg-[#18a9b8]"
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              {getSubtitleText()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
