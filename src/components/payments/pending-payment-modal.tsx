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
import type { PendingPaymentRow } from "@/data/payments";
import type { PaymentMethod } from "@/db/schema";

export type PaymentModalMode = "add" | "edit" | "approve" | "delete";

export interface StudentOption {
  id: string;
  name: string;
  branchName: string;
  parentName: string | null;
}

export interface CourseOption {
  id: string;
  name: string;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
}

interface PendingPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PaymentModalMode;
  record: PendingPaymentRow | null;
  students?: StudentOption[];
  courses?: CourseOption[];
  packages?: PackageOption[];
  onSubmit: (data: PaymentFormData) => Promise<void>;
  onAdd?: (data: AddPaymentFormData) => Promise<void>;
  onApprove?: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface PaymentFormData {
  courseId: string | null;
  packageId: string | null;
  price: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptPhoto: string | null;
}

export interface AddPaymentFormData {
  studentId: string;
  courseId: string;
  packageId: string;
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

export function PendingPaymentModal({
  open,
  onOpenChange,
  mode,
  record,
  students = [],
  courses = [],
  packages = [],
  onSubmit,
  onAdd,
  onApprove,
  onDelete,
}: PendingPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paidAt, setPaidAt] = useState("");
  const [receiptPhoto, setReceiptPhoto] = useState<string[]>([]);

  // Add mode fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  // Get selected student details
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Get selected package price
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const price = selectedPackage?.price ?? 0;

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        // Reset all fields for add mode
        setSelectedStudentId("");
        setSelectedCourseId("");
        setSelectedPackageId("");
        setPaymentMethod("");
        setPaidAt("");
        setReceiptPhoto([]);
      } else if (record) {
        // Edit/delete/approve mode: initialize from record
        setSelectedCourseId(record.courseId ?? "");
        setSelectedPackageId(record.packageId ?? "");
        setPaymentMethod(record.paymentMethod ?? "");
        setPaidAt(record.paidAt ? format(new Date(record.paidAt), "yyyy-MM-dd") : "");
        setReceiptPhoto(record.receiptPhoto ? [record.receiptPhoto] : []);
      }
    }
  }, [open, record, mode]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "delete") {
        await onDelete();
      } else if (mode === "approve") {
        if (!onApprove) return;
        await onApprove();
      } else if (mode === "add") {
        if (!onAdd || !selectedStudentId || !selectedPackageId) return;
        await onAdd({
          studentId: selectedStudentId,
          courseId: selectedCourseId,
          packageId: selectedPackageId,
          price,
          paymentMethod: paymentMethod || null,
          paidAt: paidAt ? new Date(paidAt).toISOString() : null,
          receiptPhoto: receiptPhoto[0] || null,
        });
      } else {
        if (!record) return;
        await onSubmit({
          courseId: selectedCourseId || null,
          packageId: selectedPackageId || null,
          price: price || record.price,
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

  const isReadonly = mode === "delete" || mode === "approve";
  const isAddMode = mode === "add";
  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  const getModalTitle = () => {
    if (mode === "add") return "Add Payment";
    if (mode === "approve") return "Approve Payment";
    if (mode === "delete") return "Delete Payment";
    return "Edit Payment";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "add") return "Adding...";
      if (mode === "approve") return "Approving...";
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "add") return "Add Payment";
    if (mode === "approve") return "Confirm Approve";
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "add") return "Create a new payment record";
    if (mode === "approve") return "Mark this payment as paid";
    if (mode === "delete") return "This action cannot be undone";
    return "Update payment details";
  };

  // For edit/delete mode, we need a record
  if (!isAddMode && !record) return null;

  // Dropdown options
  const studentOptions = students.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const packageOptions = packages.map((p) => ({
    value: p.id,
    label: `${p.name} (RM${p.price.toLocaleString()})`,
  }));

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

          {mode === "approve" && (
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to approve this payment? The payment will be
              marked as paid and removed from the pending list.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Add Mode: Student Selection */}
            {isAddMode ? (
              <>
                {/* Student Select */}
                <FloatingSelect
                  id="select-student"
                  label="Student"
                  placeholder="Select student..."
                  value={selectedStudentId}
                  onChange={setSelectedStudentId}
                  options={studentOptions}
                />

                {/* Parent Name (auto-filled based on student) */}
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedStudent?.parentName ?? "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Parent Name
                  </label>
                </div>

                {/* Branch and Program on same row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={selectedStudent?.branchName ?? "-"}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Branch
                    </label>
                  </div>

                  <FloatingSelect
                    id="select-course"
                    label="Program"
                    placeholder="Select program..."
                    value={selectedCourseId}
                    onChange={setSelectedCourseId}
                    options={courseOptions}
                  />
                </div>

                {/* Package and Price on same row */}
                <div className="grid grid-cols-2 gap-4">
                  <FloatingSelect
                    id="select-package"
                    label="Package"
                    placeholder="Select package..."
                    value={selectedPackageId}
                    onChange={setSelectedPackageId}
                    options={packageOptions}
                  />

                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-[58px] items-center justify-center rounded-[10px] border border-[#ADAFCA] text-2xl font-bold text-[#23d2e2]",
                        readonlyFieldClass
                      )}
                    >
                      RM{price.toLocaleString()}
                    </div>
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Price
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Edit/Delete/Approve Mode: Display record info */}
                {/* Parent Name (readonly) */}
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={record?.parentName ?? "-"}
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
                    value={record?.studentName ?? "-"}
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
                      value={record?.branchName ?? "-"}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Branch
                    </label>
                  </div>

                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={record?.courseName ?? "-"}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Program
                      </label>
                    </div>
                  ) : (
                    <FloatingSelect
                      id="edit-select-course"
                      label="Program"
                      placeholder="Select program..."
                      value={selectedCourseId}
                      onChange={setSelectedCourseId}
                      options={courseOptions}
                    />
                  )}
                </div>

                {/* Package and Price */}
                <div className="grid grid-cols-2 gap-4">
                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={record?.packageName ?? "-"}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Package
                      </label>
                    </div>
                  ) : (
                    <FloatingSelect
                      id="edit-select-package"
                      label="Package"
                      placeholder="Select package..."
                      value={selectedPackageId}
                      onChange={setSelectedPackageId}
                      options={packageOptions}
                    />
                  )}

                  <div className="relative">
                    <div
                      className={cn(
                        "flex h-[58px] items-center justify-center rounded-[10px] border border-[#ADAFCA] text-2xl font-bold text-[#23d2e2]",
                        readonlyFieldClass
                      )}
                    >
                      RM{(isReadonly ? (record?.price ?? 0) : price).toLocaleString()}
                    </div>
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Price
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Payment Method */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={paymentMethod ? PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label ?? paymentMethod : "-"}
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
                      <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
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
              disabled={isSubmitting || (isAddMode && (!selectedStudentId || !selectedPackageId))}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete" && "bg-[#fd434f] hover:bg-[#e03a45]",
                mode === "approve" && "bg-green-500 hover:bg-green-600",
                (mode === "add" || mode === "edit") && "bg-[#23D2E2] hover:bg-[#18a9b8]"
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
