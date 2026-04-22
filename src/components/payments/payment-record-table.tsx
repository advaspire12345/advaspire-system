"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Pencil,
  Trash2,
  CalendarIcon,
  X,
  Filter,
  Download,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { PaymentRecordRow } from "@/data/payments";
import {
  PaymentRecordModal,
  type PaymentRecordModalMode,
  type PaymentRecordFormData,
  type CourseOption,
  type PackageOption,
} from "@/components/payments/payment-record-modal";
import { ReceiptPreviewModal } from "@/components/payments/receipt-preview-modal";
import { ImagePreviewModal } from "@/components/payments/image-preview-modal";
import {
  updatePaymentRecordAction,
  deletePaymentRecordAction,
} from "@/app/(dashboard)/payment-record/actions";

interface PaymentRecordTableProps {
  initialData: PaymentRecordRow[];
  initialStartDate?: string;
  initialEndDate?: string;
  courses?: CourseOption[];
  packages?: PackageOption[];
  hideBranch?: boolean;
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
  { key: "paidOn", label: "Paid On", width: "100px" },
  { key: "receipt", label: "Receipt", width: "70px", align: "center" as const },
  { key: "invoice", label: "Invoice", width: "100px", align: "center" as const },
  { key: "actions", label: "Actions", width: "100px", align: "center" as const },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  promptpay: "PromptPay",
  other: "Other",
};

export function PaymentRecordTable({
  initialData,
  initialStartDate,
  initialEndDate,
  courses = [],
  packages = [],
  hideBranch,
  canEdit = true,
  canDelete = true,
  totalCount,
}: PaymentRecordTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PaymentRecordRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate ? new Date(initialStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate ? new Date(initialEndDate) : undefined
  );
  // Track the active (applied) date filter for progressive loading
  const [activeStartDate, setActiveStartDate] = useState<string | undefined>(initialStartDate);
  const [activeEndDate, setActiveEndDate] = useState<string | undefined>(initialEndDate);

  // Progressive loading: load remaining data in background
  const [isLoadingMore, setIsLoadingMore] = useState(initialData.length < totalCount);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAllData = useCallback(async (
    startOffset: number,
    existingRows: PaymentRecordRow[],
    total: number,
    filterStartDate?: string,
    filterEndDate?: string,
  ) => {
    let offset = startOffset;
    const existingIds = new Set(existingRows.map((r) => r.id));

    const params = new URLSearchParams();
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    while (offset < total) {
      if (controller.signal.aborted) return;
      try {
        const dateParams = params.toString();
        const res = await fetch(
          `/api/payment-record/table?offset=${offset}&limit=10${dateParams ? `&${dateParams}` : ""}`,
          { signal: controller.signal }
        );
        if (!res.ok) break;
        const result: { rows: PaymentRecordRow[] } = await res.json();
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
    if (!controller.signal.aborted) {
      setIsLoadingMore(false);
    }
  }, []);

  // Initial progressive load on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (initialData.length < totalCount) {
      fetchAllData(initialData.length, initialData, totalCount, initialStartDate, initialEndDate);
    }
  }, [initialData, totalCount, initialStartDate, initialEndDate, fetchAllData]);

  // Edit/Delete modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PaymentRecordModalMode>("edit");
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecordRow | null>(
    null
  );

  // Receipt preview modal state (for invoice)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<PaymentRecordRow | null>(
    null
  );

  // Image preview modal state (for receipt photo)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");

  // Filter data based on search (date filtering is done server-side)
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
        (row.invoiceNumber?.toLowerCase().includes(query) ?? false)
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

  // Re-fetch data from API with given date filters (no page refresh)
  const refetchWithDates = useCallback(async (filterStart?: string, filterEnd?: string) => {
    abortRef.current?.abort();
    setData([]);
    setCurrentPage(1);
    setIsLoadingMore(true);
    setActiveStartDate(filterStart);
    setActiveEndDate(filterEnd);

    const params = new URLSearchParams();
    if (filterStart) params.set("startDate", filterStart);
    if (filterEnd) params.set("endDate", filterEnd);
    const dateParams = params.toString();

    try {
      const res = await fetch(`/api/payment-record/table?offset=0&limit=10${dateParams ? `&${dateParams}` : ""}`);
      if (!res.ok) { setIsLoadingMore(false); return; }
      const result: { rows: PaymentRecordRow[]; totalCount: number } = await res.json();
      const rows = result.rows ?? [];
      const newTotal = result.totalCount ?? 0;
      setData(rows);
      if (rows.length < newTotal) {
        fetchAllData(rows.length, rows, newTotal, filterStart, filterEnd);
      } else {
        setIsLoadingMore(false);
      }
    } catch {
      setIsLoadingMore(false);
    }
  }, [fetchAllData]);

  // Apply date filter
  const applyDateFilter = useCallback(() => {
    const s = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const e = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
    refetchWithDates(s, e);
  }, [startDate, endDate, refetchWithDates]);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    if (activeStartDate || activeEndDate) {
      refetchWithDates(undefined, undefined);
    }
  }, [activeStartDate, activeEndDate, refetchWithDates]);

  // Open modal with specific mode
  const openModal = (mode: PaymentRecordModalMode, record: PaymentRecordRow) => {
    setModalMode(mode);
    setSelectedRecord(record);
    setModalOpen(true);
  };

  // Open receipt preview modal (for invoice)
  const openReceiptModal = (record: PaymentRecordRow) => {
    setReceiptRecord(record);
    setReceiptModalOpen(true);
  };

  // Open image preview modal (for receipt photo)
  const openImagePreview = (imageSrc: string) => {
    setPreviewImageSrc(imageSrc);
    setImagePreviewOpen(true);
  };

  // Handle update
  const handleUpdate = useCallback(
    async (formData: PaymentRecordFormData) => {
      if (!selectedRecord) return;

      const result = await updatePaymentRecordAction(selectedRecord.id, {
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

        setData((prev) =>
          prev.map((item) =>
            item.id === selectedRecord.id
              ? {
                  ...item,
                  courseId: formData.courseId,
                  courseName: course?.name ?? null,
                  packageId: formData.packageId,
                  packageName: pkg?.name ?? null,
                  price: formData.price,
                  paymentMethod: formData.paymentMethod,
                  paidAt: formData.paidAt,
                  receiptPhoto: formData.receiptPhoto,
                }
              : item
          )
        );
      } else {
        console.error("Failed to update:", result.error);
        throw new Error(result.error);
      }
    },
    [selectedRecord, courses, packages]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedRecord) return;

    const result = await deletePaymentRecordAction(selectedRecord.id);

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
          {/* Search and Filter Row */}
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
                  searchQuery && "font-semibold"
                )}
              />

              <button
                type="button"
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
              >
                <Search className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="relative w-[160px]">
                    <div
                      className={cn(
                        "peer w-full h-[50px] rounded-lg border border-muted-foreground/30 bg-transparent px-4 pr-10 flex items-center text-sm font-semibold text-foreground transition-colors cursor-pointer",
                        "hover:border-[#23D2E2] focus:border-[#23D2E2] focus:outline-none",
                        !startDate && "text-transparent"
                      )}
                    >
                      {startDate ? format(startDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </div>
                    <label
                      className={cn(
                        "pointer-events-none absolute left-3 bg-white px-1 font-semibold text-muted-foreground transition-all",
                        startDate
                          ? "-top-2.5 text-xs"
                          : "top-1/2 -translate-y-1/2 text-sm"
                      )}
                    >
                      From
                    </label>
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="relative w-[160px]">
                    <div
                      className={cn(
                        "peer w-full h-[50px] rounded-lg border border-muted-foreground/30 bg-transparent px-4 pr-10 flex items-center text-sm font-semibold text-foreground transition-colors cursor-pointer",
                        "hover:border-[#23D2E2] focus:border-[#23D2E2] focus:outline-none",
                        !endDate && "text-transparent"
                      )}
                    >
                      {endDate ? format(endDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </div>
                    <label
                      className={cn(
                        "pointer-events-none absolute left-3 bg-white px-1 font-semibold text-muted-foreground transition-all",
                        endDate
                          ? "-top-2.5 text-xs"
                          : "top-1/2 -translate-y-1/2 text-sm"
                      )}
                    >
                      To
                    </label>
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Apply Filter Button */}
              <button
                type="button"
                onClick={applyDateFilter}
                className="h-[50px] w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
              >
                <Filter className="h-5 w-5 text-primary-foreground" />
              </button>

              {/* Clear Filter Button */}
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="h-[50px] w-12 flex items-center justify-center rounded-lg border border-muted-foreground/30 hover:bg-muted transition"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1200px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[1200px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                          Loading payment records...
                        </div>
                      ) : (
                        "No payment records found."
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
                          "rounded-bl-lg rounded-br-lg"
                      )}
                    >
                      {/* Parent Name */}
                      <td className="px-4 py-3" style={{ width: columns[0].width }}>
                        <TruncatedText text={row.parentName} maxLength={12} />
                      </td>

                      {/* Student Name */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[1].width }}
                      >
                        {row.isSharedPackage && row.sharedStudentNames && row.sharedStudentNames.length > 1 ? (
                          <div className="space-y-0.5">
                            {row.sharedStudentNames.map((name, idx) => (
                              <div key={idx} className="truncate">
                                {name.length > 12 ? `${name.slice(0, 12)}...` : name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <TruncatedText text={row.studentName} maxLength={12} />
                        )}
                      </td>

                      {/* Branch */}
                      <td className={cn("px-4 py-3", hideBranch && "hidden")} style={{ width: columns[2].width }}>
                        <TruncatedText text={row.branchName} maxLength={10} />
                      </td>

                      {/* Program */}
                      <td className="px-4 py-3 font-bold" style={{ width: columns[3].width }}>
                        <TruncatedText text={row.courseName} maxLength={12} />
                      </td>

                      {/* Package */}
                      <td className="px-4 py-3" style={{ width: columns[4].width }}>
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
                      <td className="px-4 py-3" style={{ width: columns[6].width }}>
                        {row.paymentMethod
                          ? PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod
                          : "-"}
                      </td>

                      {/* Paid On */}
                      <td className="px-4 py-3" style={{ width: columns[7].width }}>
                        {formatDate(row.paidAt)}
                      </td>

                      {/* Receipt */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[8].width }}
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

                      {/* Invoice - Download Button */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[9].width }}
                      >
                        <button
                          type="button"
                          onClick={() => openReceiptModal(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-transparent hover:bg-[#23D2E2] hover:text-white"
                          title="Download Invoice"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Invoice</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className={cn("px-4 py-3", !canEdit && !canDelete && "hidden")} style={{ width: columns[10].width }}>
                        {(() => {
                          const isLocked = row.paidAt && (Date.now() - new Date(row.paidAt).getTime() > 7 * 24 * 60 * 60 * 1000);
                          if (isLocked) {
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center text-xs text-muted-foreground/50 font-medium">Locked</div>
                                </TooltipTrigger>
                                <TooltipContent><p>Cannot edit after 1 week</p></TooltipContent>
                              </Tooltip>
                            );
                          }
                          return (
                            <div className="flex items-center justify-center gap-2">
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
                          );
                        })()}
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
              Loading more payment records...
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

      {/* Edit/Delete Modal */}
      <PaymentRecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        courses={courses}
        packages={packages}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Receipt Preview Modal (Invoice) */}
      {receiptRecord && (() => {
        // Use frozen snapshot ONLY after 1 week; within 1 week use live data so edits are reflected
        const snap = receiptRecord.invoiceSnapshot;
        const isLocked = receiptRecord.paidAt && (Date.now() - new Date(receiptRecord.paidAt).getTime() > 7 * 24 * 60 * 60 * 1000);
        const useSnapshot = !!snap && isLocked;

        if (useSnapshot && snap) {
          return (
            <ReceiptPreviewModal
              open={receiptModalOpen}
              onOpenChange={setReceiptModalOpen}
              billToName={snap.billToName}
              billToAddress={snap.billToAddress ?? undefined}
              billToContact={snap.billToContact ?? undefined}
              date={receiptRecord.paidAt ? new Date(receiptRecord.paidAt) : new Date()}
              receiptNo={receiptRecord.invoiceNumber ?? `RCP-${receiptRecord.id.slice(0, 8).toUpperCase()}`}
              invoiceNo={receiptRecord.invoiceNumber ?? `INV-${receiptRecord.id.slice(0, 8).toUpperCase()}`}
              items={snap.items}
              total={snap.total}
              branch={{
                name: snap.branchName,
                companyName: snap.branchCompanyName,
                address: snap.branchAddress,
                phone: snap.branchPhone,
                email: snap.branchEmail,
                bankName: snap.branchBankName,
                bankAccount: snap.branchBankAccount,
              }}
            />
          );
        }

        // Live data: within 1 week (editable) or legacy payments without snapshot
        return (
          <ReceiptPreviewModal
            open={receiptModalOpen}
            onOpenChange={setReceiptModalOpen}
            billToName={receiptRecord.parentName ?? receiptRecord.studentName}
            billToAddress={(() => {
              const parts: string[] = [];
              if (receiptRecord.parentAddress) parts.push(receiptRecord.parentAddress);
              const postcodeCity = [receiptRecord.parentPostcode, receiptRecord.parentCity].filter(Boolean).join(" ");
              if (postcodeCity) parts.push(postcodeCity);
              return parts.length > 0 ? parts.join("\n") : undefined;
            })()}
            billToContact={undefined}
            date={receiptRecord.paidAt ? new Date(receiptRecord.paidAt) : new Date()}
            receiptNo={receiptRecord.invoiceNumber ?? `RCP-${receiptRecord.id.slice(0, 8).toUpperCase()}`}
            invoiceNo={receiptRecord.invoiceNumber ?? `INV-${receiptRecord.id.slice(0, 8).toUpperCase()}`}
            items={(() => {
              const items: { code: string; product: string; qty: number; rate: number }[] = [];
              const packageCode = receiptRecord.courseCode ?? receiptRecord.packageId?.slice(0, 8).toUpperCase() ?? "PKG";
              const duration = receiptRecord.packageDuration ?? 1;
              const isSession = receiptRecord.packageName?.toLowerCase().includes("session") || receiptRecord.packageType?.toLowerCase() === "session";
              const unitLabel = isSession ? "Session" : "Month";

              if (receiptRecord.isSharedPackage && receiptRecord.sharedStudentNames && receiptRecord.sharedStudentNames.length > 1) {
                const siblingCount = receiptRecord.sharedStudentNames.length;
                const splitSessions = Math.floor(duration / siblingCount);
                const splitPrice = receiptRecord.price / siblingCount;

                receiptRecord.sharedStudentNames.forEach((name) => {
                  items.push({
                    code: packageCode,
                    product: `${receiptRecord.courseName ?? "Course"} - ${splitSessions} ${unitLabel}${splitSessions > 1 ? "s" : ""}\n(${name})`,
                    qty: 1,
                    rate: splitPrice,
                  });
                });
              } else {
                items.push({
                  code: packageCode,
                  product: `${receiptRecord.courseName ?? "Course"} - ${duration} ${unitLabel}${duration > 1 ? "s" : ""}\n(${receiptRecord.studentName})`,
                  qty: 1,
                  rate: receiptRecord.price,
                });
              }
              return items;
            })()}
            total={receiptRecord.price}
            branch={{
              name: receiptRecord.branchName,
              companyName: receiptRecord.branchCompanyName,
              address: receiptRecord.branchAddress,
              phone: receiptRecord.branchPhone,
              email: receiptRecord.branchEmail,
              bankName: receiptRecord.branchBankName,
              bankAccount: receiptRecord.branchBankAccount,
            }}
          />
        );
      })()}

      {/* Image Preview Modal (Receipt Photo) */}
      <ImagePreviewModal
        open={imagePreviewOpen}
        onOpenChange={setImagePreviewOpen}
        imageSrc={previewImageSrc}
        title="Receipt Photo"
      />
    </>
  );
}
