"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarIcon,
  X,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentRecordTableProps {
  initialData: PaymentRecordRow[];
  initialStartDate?: string;
  initialEndDate?: string;
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
  { key: "invoice", label: "Invoice", width: "100px" },
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
}: PaymentRecordTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data] = useState<PaymentRecordRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate ? new Date(initialStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate ? new Date(initialEndDate) : undefined
  );

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<PaymentRecordRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Apply date filter
  const applyDateFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (startDate) {
      params.set("startDate", format(startDate, "yyyy-MM-dd"));
    } else {
      params.delete("startDate");
    }

    if (endDate) {
      params.set("endDate", format(endDate, "yyyy-MM-dd"));
    } else {
      params.delete("endDate");
    }

    router.push(`/payment-record?${params.toString()}`);
  }, [startDate, endDate, router, searchParams]);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    router.push("/payment-record");
  }, [router]);

  // Handle edit
  const handleEdit = (record: PaymentRecordRow) => {
    // TODO: Implement edit modal
    console.log("Edit record:", record);
  };

  // Handle delete confirmation
  const openDeleteModal = (record: PaymentRecordRow) => {
    setRecordToDelete(record);
    setDeleteModalOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      // TODO: Implement delete action
      console.log("Delete record:", recordToDelete);
      // After successful delete, refresh the page
      router.refresh();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

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
                        col.align === "right" && "text-right"
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
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No payment records found.
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
                        <TruncatedText text={row.studentName} maxLength={12} />
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-3" style={{ width: columns[2].width }}>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Image
                                src={row.receiptPhoto}
                                alt="Receipt"
                                width={32}
                                height={32}
                                className="h-8 w-8 object-cover rounded cursor-pointer mx-auto"
                              />
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <Image
                                src={row.receiptPhoto}
                                alt="Receipt"
                                width={200}
                                height={200}
                                className="max-w-[200px] max-h-[200px] object-contain rounded"
                              />
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Invoice */}
                      <td className="px-4 py-3" style={{ width: columns[9].width }}>
                        <TruncatedText text={row.invoiceNumber} maxLength={12} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" style={{ width: columns[10].width }}>
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label="Edit payment"
                            title="Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label="Delete payment"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg bg-white p-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of{" "}
                {filteredData.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record for{" "}
              <span className="font-semibold">{recordToDelete?.studentName}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
