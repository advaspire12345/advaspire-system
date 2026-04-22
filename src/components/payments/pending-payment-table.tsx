"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Search,
  Pencil,
  Trash2,
  Check,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PendingPaymentModal,
  type PaymentModalMode,
  type PaymentFormData,
  type AddPaymentFormData,
  type StudentOption,
  type CourseOption,
  type PackageOption,
} from "@/components/payments/pending-payment-modal";
import { ImagePreviewModal } from "@/components/payments/image-preview-modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { PendingPaymentRow } from "@/data/payments";
import {
  updatePendingPaymentAction,
  approvePaymentAction,
  deletePendingPaymentAction,
  addPendingPaymentAction,
} from "@/app/(dashboard)/pending-payments/actions";

interface PendingPaymentTableProps {
  initialData: PendingPaymentRow[];
  students?: StudentOption[];
  courses?: CourseOption[];
  packages?: PackageOption[];
  hideBranch?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  totalCount: number;
}

const ITEMS_PER_PAGE = 10;

const columns = [
  { key: "parentName", label: "Parent Name", width: "120px" },
  { key: "studentName", label: "Student Name", width: "120px" },
  { key: "branch", label: "Branch", width: "100px" },
  { key: "program", label: "Program", width: "110px" },
  { key: "package", label: "Package", width: "100px" },
  { key: "price", label: "Price", width: "90px", align: "right" as const },
  { key: "payMethod", label: "Pay Method", width: "100px" },
  { key: "voucher", label: "Voucher", width: "70px", align: "center" as const },
  { key: "createdOn", label: "Created On", width: "100px" },
  { key: "paidOn", label: "Paid On", width: "100px" },
  { key: "receipt", label: "Receipt", width: "70px", align: "center" as const },
  { key: "phone", label: "Phone", width: "110px" },
  { key: "status", label: "Status", width: "80px", align: "center" as const },
  {
    key: "actions",
    label: "Actions",
    width: "120px",
    align: "center" as const,
  },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  promptpay: "PromptPay",
  other: "Other",
};

export function PendingPaymentTable({
  initialData,
  students = [],
  courses = [],
  packages = [],
  hideBranch,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  totalCount,
}: PendingPaymentTableProps) {
  const [data, setData] = useState<PendingPaymentRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Progressive loading: load remaining data in background
  const [isLoadingMore, setIsLoadingMore] = useState(initialData.length < totalCount);
  const fetchedRef = useRef(false);

  const fetchRemainingData = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let offset = initialData.length;
    const existingIds = new Set(initialData.map((r) => r.id));

    while (offset < totalCount) {
      try {
        const res = await fetch(`/api/pending-payments/table?offset=${offset}&limit=10`);
        if (!res.ok) break;
        const result: { rows: PendingPaymentRow[] } = await res.json();
        if (!result.rows || result.rows.length === 0) break;

        const newRows = result.rows.filter((r) => !existingIds.has(r.id));
        for (const r of result.rows) existingIds.add(r.id);

        if (newRows.length > 0) {
          setData((prev) => [...prev, ...newRows]);
        }
        offset += 10;
      } catch {
        break;
      }
    }
    setIsLoadingMore(false);
  }, [initialData, totalCount]);

  useEffect(() => {
    if (initialData.length < totalCount) {
      fetchRemainingData();
    }
  }, [initialData.length, totalCount, fetchRemainingData]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PaymentModalMode>("edit");
  const [selectedRecord, setSelectedRecord] =
    useState<PendingPaymentRow | null>(null);

  // Image preview modal state
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        (row.parentName?.toLowerCase().includes(query) ?? false) ||
        row.studentName.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        (row.courseName?.toLowerCase().includes(query) ?? false) ||
        (row.packageName?.toLowerCase().includes(query) ?? false) ||
        row.status.toLowerCase().includes(query),
    );
  }, [data, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Open modal with specific mode
  const openModal = (
    mode: PaymentModalMode,
    record: PendingPaymentRow | null,
  ) => {
    setModalMode(mode);
    setSelectedRecord(record);
    setModalOpen(true);
  };

  // Open image preview modal
  const openImagePreview = (imageSrc: string) => {
    setPreviewImageSrc(imageSrc);
    setImagePreviewOpen(true);
  };

  // Handle add
  const handleAdd = useCallback(
    async (formData: AddPaymentFormData) => {
      const result = await addPendingPaymentAction({
        studentId: formData.studentId,
        courseId: formData.courseId,
        packageId: formData.packageId,
        price: formData.price,
        paymentMethod: formData.paymentMethod,
        paidAt: formData.paidAt,
        receiptPhoto: formData.receiptPhoto,
        poolId: formData.poolId,
        poolStudentIds: formData.poolStudentIds,
      });

      if (result.success && result.payment) {
        const isShared = !!formData.poolId;
        // For shared pool entries, find the pool entry; otherwise find the individual student
        const poolEntry = isShared
          ? students.find((s) => s.poolId === formData.poolId)
          : null;
        const individualStudent = students.find((s) => s.id === formData.studentId);
        const student = poolEntry || individualStudent;
        const course = courses.find((c) => c.id === formData.courseId);
        const pkg = packages.find((p) => p.id === formData.packageId);

        // Generate package name from package data
        const packageName = pkg
          ? `${pkg.duration} ${pkg.packageType === "monthly" ? "Month" : "Session"}${pkg.duration > 1 ? "s" : ""}`
          : null;

        // Build shared student names from poolStudentIds
        const sharedNames = isShared && formData.poolStudentIds
          ? formData.poolStudentIds
              .map(sid => students.find(s => s.id === sid)?.name)
              .filter((n): n is string => !!n)
          : null;

        const newRow: PendingPaymentRow = {
          id: result.payment.id,
          parentName: student?.parentName ?? null,
          parentPhone: student?.parentPhone ?? null,
          studentId: formData.studentId,
          studentName: sharedNames ? sharedNames.join(' & ') : (individualStudent?.name ?? ""),
          studentPhone: null,
          branchId: "",
          branchName: student?.branchName ?? "",
          courseId: formData.courseId || null,
          courseName: course?.name ?? null,
          packageId: formData.packageId || null,
          packageName,
          price: formData.price,
          paymentMethod: formData.paymentMethod,
          status: "pending",
          receiptPhoto: formData.receiptPhoto,
          createdAt: new Date().toISOString(),
          paidAt: formData.paidAt,
          isSharedPackage: isShared,
          poolId: formData.poolId ?? null,
          sharedStudentNames: sharedNames,
          hasVoucher: false,
          voucherAmount: null,
        };
        setData((prev) => [newRow, ...prev]);
      } else {
        console.error("Failed to add:", result.error);
        throw new Error(result.error);
      }
    },
    [students, courses, packages],
  );

  // Handle update
  const handleUpdate = useCallback(
    async (formData: PaymentFormData) => {
      if (!selectedRecord) return;

      const result = await updatePendingPaymentAction(selectedRecord.id, {
        courseId: formData.courseId,
        packageId: formData.packageId,
        price: formData.price,
        paymentMethod: formData.paymentMethod,
        paidAt: formData.paidAt,
        receiptPhoto: formData.receiptPhoto,
      });

      if (result.success) {
        // Find course and package names for display
        const course = courses.find((c) => c.id === formData.courseId);
        const pkg = packages.find((p) => p.id === formData.packageId);

        // Generate package name from package data
        const packageName = pkg
          ? `${pkg.duration} ${pkg.packageType === "monthly" ? "Month" : "Session"}${pkg.duration > 1 ? "s" : ""}`
          : null;

        setData((prev) =>
          prev.map((item) =>
            item.id === selectedRecord.id
              ? {
                  ...item,
                  courseId: formData.courseId,
                  courseName: course?.name ?? null,
                  packageId: formData.packageId,
                  packageName,
                  price: formData.price,
                  paymentMethod: formData.paymentMethod,
                  paidAt: formData.paidAt,
                  receiptPhoto: formData.receiptPhoto,
                }
              : item,
          ),
        );
      } else {
        console.error("Failed to update:", result.error);
        throw new Error(result.error);
      }
    },
    [selectedRecord, courses, packages],
  );

  // Handle approve from modal
  const handleApprove = useCallback(async () => {
    if (!selectedRecord) return;

    const result = await approvePaymentAction(selectedRecord.id);

    if (result.success) {
      // Remove from list since it's no longer pending
      setData((prev) => prev.filter((item) => item.id !== selectedRecord.id));
    } else {
      console.error("Failed to approve:", result.error);
      throw new Error(result.error);
    }
  }, [selectedRecord]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedRecord) return;

    const result = await deletePendingPaymentAction(selectedRecord.id);

    if (result.success) {
      setData((prev) => prev.filter((item) => item.id !== selectedRecord.id));
    } else {
      console.error("Failed to delete:", result.error);
      throw new Error(result.error);
    }
  }, [selectedRecord]);

  // Format date display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "do MMM yyyy");
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      refunded: "bg-blue-100 text-blue-700",
      cancelled: "bg-gray-100 text-gray-700",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          styles[status] ?? "bg-gray-100 text-gray-700",
        )}
      >
        {status}
      </span>
    );
  };

  // Check if approve button should be shown
  const canApprove = (record: PendingPaymentRow) => {
    return record.paidAt && record.receiptPhoto;
  };

  // Truncate text with tooltip
  const TruncatedText = ({
    text,
    maxLength = 15,
  }: {
    text: string | null;
    maxLength?: number;
  }) => {
    if (!text) return <span>-</span>;

    if (text.length <= maxLength) {
      return <span>{text}</span>;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{text.slice(0, maxLength)}...</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="space-y-4 p-0">
          {/* Search and Add Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(
                  "pr-20 py-6 border-muted-foreground/30",
                  searchQuery && "font-semibold",
                )}
              />

              <button
                type="button"
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
              >
                <Search className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>

            {/* Add Payment Button */}
            {canCreate && (
              <Button
                onClick={() => openModal("add", null)}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1700px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={col.key}
                      className={cn(
                        "bg-transparent px-4 py-3 text-left text-base font-bold text-foreground",
                        idx === 0 && "rounded-tl-lg",
                        idx === columns.length - 1 && "rounded-tr-lg",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                        col.key === "branch" && hideBranch && "hidden",
                        col.key === "actions" && !canEdit && !canDelete && "hidden",
                      )}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>

            {/* Body Table */}
            <table className="min-w-[1700px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hideBranch ? columns.length - 1 : columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
                          Loading pending payments...
                        </div>
                      ) : (
                        "No pending payments found."
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedData.length - 1 &&
                          "rounded-bl-lg rounded-br-lg",
                      )}
                    >
                      {/* Parent Name */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[0].width }}
                      >
                        <TruncatedText text={row.parentName} maxLength={12} />
                      </td>

                      {/* Student Name - Show all siblings for shared packages */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[1].width }}
                      >
                        {row.isSharedPackage && row.sharedStudentNames && row.sharedStudentNames.length > 1 ? (
                          <div className="space-y-0.5">
                            {row.sharedStudentNames.map((name, idx) => (
                              <div key={idx} className="truncate">
                                {name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <TruncatedText text={row.studentName} maxLength={12} />
                        )}
                      </td>

                      {/* Branch */}
                      <td
                        className={cn("px-4 py-3", hideBranch && "hidden")}
                        style={{ width: columns[2].width }}
                      >
                        <TruncatedText text={row.branchName} maxLength={10} />
                      </td>

                      {/* Program */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[3].width }}
                      >
                        <TruncatedText text={row.courseName} maxLength={12} />
                      </td>

                      {/* Package */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[4].width }}
                      >
                        <TruncatedText text={row.packageName} maxLength={10} />
                      </td>

                      {/* Price */}
                      <td
                        className="px-4 py-3 text-right font-bold text-[#23d2e2]"
                        style={{ width: columns[5].width }}
                      >
                        RM{row.price.toLocaleString()}
                      </td>

                      {/* Pay Method */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {row.paymentMethod
                          ? (PAYMENT_METHOD_LABELS[row.paymentMethod] ??
                            row.paymentMethod)
                          : "-"}
                      </td>

                      {/* Voucher */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[7].width }}
                      >
                        {row.hasVoucher ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>

                      {/* Created On */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[8].width }}
                      >
                        {formatDate(row.createdAt)}
                      </td>

                      {/* Paid On */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        {formatDate(row.paidAt)}
                      </td>

                      {/* Receipt */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[10].width }}
                      >
                        {row.receiptPhoto ? (
                          <button
                            type="button"
                            onClick={() => openImagePreview(row.receiptPhoto!)}
                            className="mx-auto block"
                          >
                            <Image
                              src={row.receiptPhoto}
                              alt="Receipt"
                              width={32}
                              height={32}
                              className="h-8 w-8 object-cover rounded cursor-pointer hover:ring-2 hover:ring-[#23D2E2] transition"
                            />
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Phone */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[11].width }}
                      >
                        {row.parentPhone ?? row.studentPhone ?? "-"}
                      </td>

                      {/* Status */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[12].width }}
                      >
                        {getStatusBadge(row.status)}
                      </td>

                      {/* Actions */}
                      <td
                        className={cn("px-4 py-3", !canEdit && !canDelete && "hidden")}
                        style={{ width: columns[13].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openModal("edit", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label="Edit payment"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                          )}

                          {/* Approve Button - always visible, disabled when conditions not met */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openModal("approve", row)}
                              disabled={!canApprove(row)}
                              className={cn(
                                "rounded-lg border p-2 transition",
                                canApprove(row)
                                  ? "border-muted-foreground/30 text-muted-foreground hover:border-transparent hover:bg-green-500 hover:text-white"
                                  : "border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed",
                              )}
                              aria-label="Approve payment"
                              title={
                                canApprove(row)
                                  ? "Approve"
                                  : "Upload receipt and set paid date to approve"
                              }
                            >
                              <Check className="h-5 w-5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => openModal("delete", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label="Delete payment"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isLoadingMore && paginatedData.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <div className="h-3 w-3 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
              Loading more pending payments...
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={filteredData.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Add/Edit/Approve/Delete Modal */}
      <PendingPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        students={students}
        courses={courses}
        packages={packages}
        onSubmit={handleUpdate}
        onAdd={handleAdd}
        onApprove={handleApprove}
        onDelete={handleDelete}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={imagePreviewOpen}
        onOpenChange={setImagePreviewOpen}
        imageSrc={previewImageSrc}
        title="Receipt Photo"
      />
    </>
  );
}
