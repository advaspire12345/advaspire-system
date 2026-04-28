"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import {
  TransferAdcoinModal,
  type TransferFormData,
} from "@/components/leaderboard/transfer-adcoin-modal";
import { cn } from "@/lib/utils";
import type { TransactionDisplayRow } from "@/data/adcoins";
import type { TransferParticipant } from "@/data/users";

interface TransactionsTableProps {
  initialData: TransactionDisplayRow[];
  totalCount: number;
  participants: TransferParticipant[];
  hideBranch?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  currentUserBranchId?: string | null;
  filterByBranch?: boolean;
  canAdjust?: boolean;
}

const ITEMS_PER_PAGE = 10;

const columns = [
  { key: "date", label: "Date", width: "10%" },
  { key: "sender", label: "Sender", width: "18%" },
  { key: "type", label: "Type", width: "10%", align: "center" as const },
  { key: "receiver", label: "Receiver", width: "18%" },
  { key: "branch", label: "Branch", width: "12%" },
  { key: "amount", label: "Amount", width: "10%", align: "right" as const },
  { key: "description", label: "Description", width: "22%" },
];

const typeStyles: Record<string, string> = {
  earned: "bg-green-100 text-green-700",
  spent: "bg-red-100 text-red-700",
  transfer: "bg-cyan-100 text-cyan-700",
  adjusted: "bg-yellow-100 text-yellow-700",
  refunded: "bg-green-100 text-green-700",
  mission_reward: "bg-purple-100 text-purple-700",
  teacher_award: "bg-blue-100 text-blue-700",
  item_purchase: "bg-orange-100 text-orange-700",
};

const typeLabels: Record<string, string> = {
  earned: "Earned",
  spent: "Spent",
  transfer: "Transfer",
  adjusted: "Adjusted",
  refunded: "Refunded",
  mission_reward: "Mission",
  teacher_award: "Award",
  item_purchase: "Purchase",
};

function getTypeBadge(type: string) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        typeStyles[type] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {typeLabels[type] ?? type}
    </span>
  );
}

function getAmountDisplay(amount: number) {
  return <span className="font-bold">{Math.abs(amount).toLocaleString()}</span>;
}

export function TransactionsTable({ initialData, totalCount, participants, hideBranch, currentUserId, currentUserName, currentUserBranchId, filterByBranch, canAdjust }: TransactionsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Progressive loading: start with server-provided first batch, load rest in background
  const [allData, setAllData] = useState<TransactionDisplayRow[]>(initialData);
  const [isLoadingMore, setIsLoadingMore] = useState(initialData.length < totalCount);
  const fetchedRef = useRef(false);

  const fetchRemainingData = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let offset = initialData.length;
    const existingIds = new Set(initialData.map((r) => r.id));

    while (offset < totalCount) {
      try {
        const res = await fetch(`/api/transactions/table?offset=${offset}&limit=10`);
        if (!res.ok) break;
        const result: { rows: TransactionDisplayRow[] } = await res.json();
        if (!result.rows || result.rows.length === 0) break;

        const newRows = result.rows.filter((r) => !existingIds.has(r.id));
        for (const r of result.rows) existingIds.add(r.id);

        if (newRows.length > 0) {
          setAllData((prev) => [...prev, ...newRows]);
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
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  // Filter to own branch transactions only (for non-admin roles)
  const filteredData = useMemo(() => {
    let result = allData;

    if (filterByBranch && currentUserBranchId) {
      result = result.filter((row) => row.branchId === currentUserBranchId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          (row.senderName?.toLowerCase().includes(query) ?? false) ||
          (row.receiverName?.toLowerCase().includes(query) ?? false) ||
          (row.description?.toLowerCase().includes(query) ?? false) ||
          (typeLabels[row.type]?.toLowerCase().includes(query) ?? row.type.toLowerCase().includes(query)) ||
          (row.branchName?.toLowerCase().includes(query) ?? false)
      );
    }

    return result;
  }, [allData, searchQuery, currentUserBranchId]);

  // Transfer modal: own branch only for non-admin roles, all participants for admin roles
  const localParticipants = useMemo(() => {
    if (filterByBranch && currentUserBranchId) {
      return participants.filter((p) => p.branchId === currentUserBranchId);
    }
    return participants;
  }, [participants, currentUserBranchId, filterByBranch]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Re-fetch first page immediately, then load rest in background
  const refetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions/table?offset=0&limit=10`);
      if (!res.ok) return;
      const result: { rows: TransactionDisplayRow[]; totalCount: number } = await res.json();
      setAllData(result.rows ?? []);
      setCurrentPage(1);

      // Load remaining in background (non-blocking)
      if ((result.rows?.length ?? 0) < (result.totalCount ?? 0)) {
        setIsLoadingMore(true);
        const loadRemaining = async () => {
          let offset = result.rows.length;
          const existingIds = new Set(result.rows.map((r) => r.id));
          while (offset < result.totalCount) {
            const batchRes = await fetch(`/api/transactions/table?offset=${offset}&limit=10`);
            if (!batchRes.ok) break;
            const batch: { rows: TransactionDisplayRow[] } = await batchRes.json();
            if (!batch.rows?.length) break;
            const newRows = batch.rows.filter((r) => !existingIds.has(r.id));
            for (const r of batch.rows) existingIds.add(r.id);
            if (newRows.length > 0) setAllData((prev) => [...prev, ...newRows]);
            offset += 10;
          }
          setIsLoadingMore(false);
        };
        loadRemaining();
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle transfer submit
  const handleTransferSubmit = async (formData: TransferFormData) => {
    try {
      const response = await fetch("/api/adcoin/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: formData.senderId,
          receiverId: formData.recipientId,
          senderType: formData.senderType,
          receiverType: formData.recipientType,
          transactionType: formData.transactionType,
          amount: formData.amount,
          message: formData.message || undefined,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transfer adcoin");
      }
      // Re-fetch first page (fast) then refresh server components for balance updates
      refetchData();
      router.refresh();
    } catch (error) {
      console.error("Failed to transfer adcoin:", error);
      throw error;
    }
  };

  return (
    <>
    <Card className="bg-transparent border-none shadow-none min-w-0">
      <CardContent className="space-y-4 p-0 min-w-0">
        {/* Search and Action Row */}
        <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name or description..."
          />

          <div className="flex items-center gap-3">
            {canAdjust && (
              <Button
                onClick={() => setAdjustModalOpen(true)}
                variant="outline"
                className="font-bold h-[50px] px-6"
              >
                <Settings className="h-4 w-4" />
                Adcoin Adjustment
              </Button>
            )}
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4" />
              Transfer Adcoin
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {/* Header Table */}
          <table className="w-full table-fixed border-separate border-spacing-0">
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
                      col.key === "branch" && hideBranch && "hidden"
                    )}
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>

          {/* Body Table */}
          <table className="w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                          Loading transactions...
                        </div>
                      ) : (
                        "No transactions found."
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
                    {/* Date */}
                    <td
                      className="px-4 py-3 text-muted-foreground"
                      style={{ width: columns[0].width }}
                    >
                      {format(new Date(row.createdAt), "do MMM yyyy")}
                    </td>

                    {/* Sender */}
                    <td
                      className="px-4 py-3"
                      style={{ width: columns[1].width }}
                    >
                      {row.senderName ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <HexagonAvatar
                              size={50}
                              imageUrl={row.senderPhoto ?? undefined}
                              percentage={0.5}
                              animated={false}
                              fallbackInitials={row.senderName.charAt(0)}
                              cornerRadius={8}
                            />
                            <div className="absolute -bottom-1 -right-1 z-10">
                              <HexagonNumberBadge value={row.senderLevel} size={22} />
                            </div>
                          </div>
                          <span className="font-bold text-[#23d2e2] truncate">
                            {row.senderName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Type */}
                    <td
                      className="px-4 py-3 text-center"
                      style={{ width: columns[2].width }}
                    >
                      {getTypeBadge(row.type)}
                    </td>

                    {/* Receiver */}
                    <td
                      className="px-4 py-3"
                      style={{ width: columns[3].width }}
                    >
                      {row.receiverName ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <HexagonAvatar
                              size={50}
                              imageUrl={row.receiverPhoto ?? undefined}
                              percentage={0.5}
                              animated={false}
                              fallbackInitials={row.receiverName.charAt(0)}
                              cornerRadius={8}
                            />
                            <div className="absolute -bottom-1 -right-1 z-10">
                              <HexagonNumberBadge value={row.receiverLevel} size={22} />
                            </div>
                          </div>
                          <span className="font-bold text-[#23d2e2] truncate">
                            {row.receiverName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Branch */}
                    <td
                      className={cn("px-4 py-3", hideBranch && "hidden")}
                      style={{ width: columns[4].width }}
                    >
                      {row.branchName}
                    </td>

                    {/* Amount */}
                    <td
                      className="px-4 py-3 text-right"
                      style={{ width: columns[5].width }}
                    >
                      {getAmountDisplay(row.amount)}
                    </td>

                    {/* Description */}
                    <td
                      className="px-4 py-3 text-muted-foreground truncate"
                      style={{ width: columns[6].width }}
                      title={row.description ?? undefined}
                    >
                      {row.description ?? "-"}
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
              Loading more transactions...
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

    {/* Transfer Adcoin Modal */}
    <TransferAdcoinModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      participants={localParticipants}
      recipientId={null}
      defaultSenderId={currentUserId}
      defaultSenderName={currentUserName}
      onSubmit={handleTransferSubmit}
    />

    {/* Adcoin Adjustment Modal */}
    {canAdjust && (
      <TransferAdcoinModal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        participants={localParticipants}
        recipientId={null}
        defaultSenderId={currentUserId}
        defaultSenderName={currentUserName}
        onSubmit={handleTransferSubmit}
        defaultTransactionType="adjusted"
      />
    )}
    </>
  );
}
