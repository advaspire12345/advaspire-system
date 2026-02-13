"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight, Plus, Star } from "lucide-react";
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
import type { LeaderboardEntry } from "@/data/leaderboard";
import type { TransferParticipant } from "@/data/users";

interface LeaderboardTableProps {
  initialData: LeaderboardEntry[];
  participants: TransferParticipant[];
}

const ITEMS_PER_PAGE = 10;

const columns = [
  { key: "rank", label: "Rank", width: "70px", align: "center" as const },
  { key: "photo", label: "Photo", width: "80px", align: "center" as const },
  { key: "username", label: "Username", width: "160px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "program", label: "Program", width: "140px" },
  { key: "level", label: "Level", width: "80px", align: "center" as const },
  { key: "adstar", label: "Adstar", width: "80px", align: "center" as const },
  { key: "adcoin", label: "Adcoin", width: "100px", align: "right" as const },
  { key: "achievement", label: "Achievement", width: "140px", align: "center" as const },
  { key: "action", label: "Action", width: "100px", align: "center" as const },
];

export function LeaderboardTable({ initialData, participants }: LeaderboardTableProps) {
  const [data] = useState<LeaderboardEntry[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null
  );

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.studentName.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        (row.program?.toLowerCase().includes(query) ?? false)
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

  // Open transfer modal
  const openTransferModal = (recipientId?: string) => {
    setSelectedRecipientId(recipientId ?? null);
    setModalOpen(true);
  };

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
    } catch (error) {
      console.error("Failed to transfer adcoin:", error);
      throw error;
    }
  };

  // Get rank badge color based on position
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-400 text-yellow-900";
      case 2:
        return "bg-gray-300 text-gray-700";
      case 3:
        return "bg-amber-600 text-amber-100";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search and Action Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            {/* Search Input */}
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, branch, or program..."
            />

            {/* Transfer Adcoin Button */}
            <Button
              onClick={() => openTransferModal()}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4" />
              Transfer Adcoin
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1140px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[1140px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No students found.
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
                      {/* Rank */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[0].width }}
                      >
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                              getRankStyle(row.rank)
                            )}
                          >
                            {row.rank}
                          </span>
                        </div>
                      </td>

                      {/* Photo */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[1].width }}
                      >
                        <div className="relative flex justify-center">
                          <div className="relative">
                            <HexagonAvatar
                              size={50}
                              imageUrl={row.photo ?? undefined}
                              percentage={0.5}
                              animated={false}
                              fallbackInitials={row.studentName.charAt(0)}
                              cornerRadius={8}
                            />
                            <div className="absolute -bottom-1 -right-1 z-10">
                              <HexagonNumberBadge value={row.level} size={22} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[2].width }}
                      >
                        {row.studentName}
                      </td>

                      {/* Branch */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[3].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Program */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[4].width }}
                      >
                        {row.program ?? "-"}
                      </td>

                      {/* Level */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[5].width }}
                      >
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {row.level}
                        </span>
                      </td>

                      {/* Adstar */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[6].width }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{row.adstar}</span>
                        </div>
                      </td>

                      {/* Adcoin */}
                      <td
                        className="px-4 py-3 text-right font-bold text-primary"
                        style={{ width: columns[7].width }}
                      >
                        {row.adcoin.toLocaleString()}
                      </td>

                      {/* Achievement */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[8].width }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {row.achievements.slice(0, 4).map((achievement) => (
                            <img
                              key={achievement.id}
                              src={achievement.icon_url || "/badges/default.png"}
                              alt={achievement.name}
                              title={achievement.name}
                              className="h-6 w-6 rounded-full object-cover border border-muted-foreground/20"
                            />
                          ))}
                          {row.achievements.length > 4 && (
                            <span className="text-xs font-medium text-muted-foreground">
                              +{row.achievements.length - 4}
                            </span>
                          )}
                          {row.achievements.length === 0 && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openTransferModal(row.studentId)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Transfer adcoin to ${row.studentName}`}
                            title="Transfer Adcoin"
                          >
                            <ArrowLeftRight className="h-5 w-5" />
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
        participants={participants}
        recipientId={selectedRecipientId}
        onSubmit={handleTransferSubmit}
      />
    </>
  );
}
