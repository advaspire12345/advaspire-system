"use client";

import { useState, useMemo, useEffect } from "react";
import { Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { VoucherTableRow } from "@/app/(dashboard)/voucher/page";

interface VoucherTableProps {
  data: VoucherTableRow[];
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ITEMS_PER_PAGE = 10;

function formatDiscount(type: string, value: number): string {
  return type === "percentage" ? `${value}%` : `RM${value}`;
}

function formatValidity(row: VoucherTableRow): string {
  if (row.expiryType === "monthly") {
    return `${row.expiryMonths} month${row.expiryMonths !== 1 ? "s" : ""}`;
  }
  if (row.expiryDate) {
    return format(new Date(row.expiryDate), "do MMM yyyy");
  }
  return "-";
}

function isExpired(row: VoucherTableRow): boolean {
  if (row.expiryType === "date" && row.expiryDate) {
    return new Date(row.expiryDate) < new Date();
  }
  return false;
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

type ModalMode = "add" | "edit" | "delete";

export function VoucherTable({ data, canAdd, canEdit, canDelete }: VoucherTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherTableRow | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((v) => v.code.toLowerCase().includes(q));
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const columns = [
    { key: "code", label: "Voucher Code", width: "200px" },
    { key: "discount", label: "Discount", width: "150px" },
    { key: "validity", label: "Valid Till", width: "180px" },
    { key: "action", label: "Action", width: "100px", align: "center" as const },
  ];

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            <SearchBar
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
              placeholder="Search by voucher code..."
            />
            {canAdd && (
              <Button
                onClick={() => { setSelectedVoucher(null); setModalMode("add"); setModalOpen(true); }}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Voucher
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[630px] w-full table-fixed border-separate border-spacing-0">
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
                        col.key === "action" && !canEdit && !canDelete && "hidden",
                      )}
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>

            <table className="min-w-[630px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground rounded-lg">
                      No vouchers found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => {
                    const expired = isExpired(row);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition hover:bg-[#f0f6ff]",
                          rowIdx === paginatedData.length - 1 && "rounded-bl-lg rounded-br-lg",
                        )}
                      >
                        <td className="px-4 py-3 font-bold font-mono" style={{ width: columns[0].width }}>
                          {row.code}
                        </td>
                        <td className="px-4 py-3" style={{ width: columns[1].width }}>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            row.discountType === "percentage" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700",
                          )}>
                            {formatDiscount(row.discountType, row.discountValue)}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ width: columns[2].width }}>
                          {row.expiryType === "monthly" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                              {row.expiryMonths} month{row.expiryMonths !== 1 ? "s" : ""} from use
                            </span>
                          ) : (
                            <>
                              <span className={cn(expired && "text-red-500 line-through")}>
                                {formatValidity(row)}
                              </span>
                              {expired && <span className="ml-2 text-xs text-red-500 font-medium">Expired</span>}
                            </>
                          )}
                        </td>
                        <td className={cn("px-4 py-3", !canEdit && !canDelete && "hidden")} style={{ width: columns[3].width }}>
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => { setSelectedVoucher(row); setModalMode("edit"); setModalOpen(true); }}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => { setSelectedVoucher(row); setModalMode("delete"); setModalOpen(true); }}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={filteredData.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <VoucherModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        voucher={selectedVoucher}
      />
    </>
  );
}

// ============================================
// Voucher Modal
// ============================================

function VoucherModal({
  open,
  onOpenChange,
  mode,
  voucher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  voucher: VoucherTableRow | null;
}) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryType, setExpiryType] = useState<"monthly" | "date">("date");
  const [expiryMonths, setExpiryMonths] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "add") {
      setCode(generateCode());
      setDiscountType("percentage");
      setDiscountValue("");
      setExpiryType("date");
      setExpiryMonths("");
      setExpiryDate("");
    } else if (voucher) {
      setCode(voucher.code);
      setDiscountType(voucher.discountType);
      setDiscountValue(voucher.discountValue.toString());
      setExpiryType(voucher.expiryType);
      setExpiryMonths(voucher.expiryMonths?.toString() ?? "");
      setExpiryDate(voucher.expiryDate ?? "");
    }
  }, [open, mode, voucher]);

  const handleSubmit = async () => {
    setError(null);

    if (mode === "delete") {
      if (!voucher) return;
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/voucher", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: voucher.id }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
        onOpenChange(false);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!code.trim()) { setError("Voucher code is required"); return; }
    if (!discountValue || parseFloat(discountValue) <= 0) { setError("Discount value must be greater than 0"); return; }
    if (expiryType === "monthly" && (!expiryMonths || parseInt(expiryMonths) <= 0)) {
      setError("Expiry months must be greater than 0"); return;
    }
    if (expiryType === "date" && !expiryDate) {
      setError("Expiry date is required"); return;
    }

    setIsSubmitting(true);
    try {
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch("/api/voucher", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "edit" && voucher ? { id: voucher.id } : {}),
          code: code.trim(),
          discountType,
          discountValue: parseFloat(discountValue),
          expiryType,
          expiryMonths: expiryType === "monthly" ? parseInt(expiryMonths) : null,
          expiryDate: expiryType === "date" ? expiryDate : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDelete = mode === "delete";
  const title = mode === "add" ? "Add Voucher" : mode === "edit" ? "Edit Voucher" : "Delete Voucher";
  const submitText = isSubmitting
    ? (mode === "add" ? "Adding..." : mode === "edit" ? "Saving..." : "Deleting...")
    : (mode === "add" ? "Add Voucher" : mode === "edit" ? "Save Changes" : "Confirm Delete");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-8">
            {isDelete ? (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete voucher{" "}
                <span className="font-semibold text-foreground font-mono">{voucher?.code}</span>?
                This action cannot be undone.
              </p>
            ) : (
              <>
                {/* Coupon Code */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FloatingInput
                      id="voucher-code"
                      label="Coupon Code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCode(generateCode())}
                    className="shrink-0 h-[50px] w-[50px] flex items-center justify-center rounded-lg border border-muted-foreground/30 hover:bg-muted transition"
                    title="Generate random code"
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-3">
                  <FloatingSelect
                    label="Discount Type"
                    value={discountType}
                    onChange={(val) => setDiscountType(val as "percentage" | "fixed")}
                    options={[
                      { value: "percentage", label: "Percentage (%)" },
                      { value: "fixed", label: "Fixed (RM)" },
                    ]}
                  />
                  <FloatingInput
                    id="voucher-value"
                    label={discountType === "percentage" ? "Discount (%)" : "Discount (RM)"}
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>

                {/* Expiry Type + Value */}
                <div className="grid grid-cols-2 gap-3">
                  <FloatingSelect
                    label="Expiry Type"
                    value={expiryType}
                    onChange={(val) => setExpiryType(val as "monthly" | "date")}
                    options={[
                      { value: "monthly", label: "Monthly (from usage)" },
                      { value: "date", label: "Specific Date" },
                    ]}
                  />
                  {expiryType === "monthly" ? (
                    <FloatingInput
                      id="voucher-expiry-months"
                      label="Valid For (months)"
                      type="number"
                      value={expiryMonths}
                      onChange={(e) => setExpiryMonths(e.target.value)}
                    />
                  ) : (
                    <FloatingInput
                      id="voucher-expiry-date"
                      label="Expiry Date"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                isDelete ? "bg-[#fd434f] hover:bg-[#e03340]" : "bg-[#23D2E2] hover:bg-[#18a9b8]",
              )}
            >
              {submitText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
