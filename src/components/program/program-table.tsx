"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Trash2, Plus, Users, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { ProgramTableRow, ProgramFull } from "@/db/schema";
import type { BranchOption } from "@/components/trial/trial-modal";
import { ProgramModal } from "@/components/program/program-modal";
import type { ProgramFormPayload } from "@/app/(dashboard)/program/actions";

interface InstructorOption {
  id: string;
  name: string;
  branch_id: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface VoucherOption {
  id: string;
  code: string;
  discount: string;
}

interface ProgramTableProps {
  initialData: ProgramTableRow[];
  branches: BranchOption[];
  instructors: InstructorOption[];
  categories: CategoryOption[];
  vouchers?: VoucherOption[];
  hideBranch?: boolean;
  onAdd?: (payload: ProgramFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (programId: string, payload: ProgramFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (programId: string) => Promise<{ success: boolean; error?: string }>;
  onCreateCategory?: (name: string) => Promise<{ success: boolean; categoryId?: string; error?: string }>;
  onFetchProgram: (programId: string) => Promise<{ success: boolean; data?: ProgramFull; error?: string }>;
  onUploadCoverImage?: (formData: FormData) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "name", label: "Program Name", width: "200px" },
  { key: "category", label: "Category", width: "120px" },
  { key: "enrolled", label: "Enrolled", width: "90px", align: "center" },
  { key: "monthly", label: "Monthly Pack", width: "110px", align: "center" },
  { key: "session", label: "Session Pack", width: "110px", align: "center" },
  { key: "lessons", label: "Lessons", width: "80px", align: "center" },
  { key: "branch", label: "Branch", width: "150px" },
  { key: "slots", label: "Slots", width: "150px" },
  { key: "levels", label: "Levels", width: "80px", align: "center" },
  { key: "sessions_level", label: "Level Up Sessions", width: "130px", align: "center" },
  { key: "status", label: "Status", width: "90px", align: "center" },
  { key: "action", label: "Action", width: "100px", align: "center" },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-700",
};

// Color palette for branches - each branch gets a consistent color
const BRANCH_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
];

// Get consistent color for a branch name
function getBranchColor(branchName: string, allBranches: string[]) {
  const index = allBranches.indexOf(branchName);
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

export function ProgramTable({
  initialData,
  branches,
  instructors,
  categories,
  vouchers = [],
  hideBranch,
  onAdd,
  onEdit,
  onDelete,
  onCreateCategory,
  onFetchProgram,
  onUploadCoverImage,
}: ProgramTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<ProgramTableRow | null>(null);

  const handleAdd = async (payload: ProgramFormPayload) => {
    if (!onAdd) return;
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create program");
    }
    router.refresh();
  };

  const handleEdit = async (payload: ProgramFormPayload) => {
    if (!onEdit) return;
    if (!selectedRecord) return;
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update program");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete program");
    }
    router.refresh();
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return initialData;

    const query = searchQuery.toLowerCase();
    return initialData.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.category_name?.toLowerCase().includes(query) ||
        row.branch_names.some((b) => b.toLowerCase().includes(query))
    );
  }, [initialData, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setSelectedRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  const openEditModal = (record: ProgramTableRow) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (record: ProgramTableRow) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
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
              placeholder="Search by name, category, or branch..."
            />
            {onAdd && (
              <Button
                onClick={openAddModal}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1500px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={`${col.key}-${idx}`}
                      className={cn(
                        "bg-transparent px-4 py-3 text-left text-base font-bold text-foreground",
                        idx === 0 && "rounded-tl-lg",
                        idx === columns.length - 1 && "rounded-tr-lg",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                        col.key === "branch" && hideBranch && "hidden",
                        col.key === "action" && !onEdit && !onDelete && "hidden",
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
            <table className="min-w-[1500px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hideBranch ? columns.length - 1 : columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No programs found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => {
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition hover:bg-[#f0f6ff]",
                          rowIdx === paginatedData.length - 1 &&
                            "rounded-bl-lg rounded-br-lg"
                        )}
                      >
                        {/* Program Name */}
                        <td
                          className="px-4 py-3 font-bold"
                          style={{ width: columns[0].width }}
                        >
                          <div className="flex items-center gap-2">
                            {row.cover_image_url ? (
                              <Image
                                src={row.cover_image_url}
                                alt={row.name}
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-gradient-to-r from-[#615DFA] to-[#23D2E2] flex items-center justify-center text-white font-medium text-xs">
                                {row.name.charAt(0)}
                              </div>
                            )}
                            <span className="truncate">{row.name}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td
                          className="px-4 py-3 text-muted-foreground"
                          style={{ width: columns[1].width }}
                        >
                          {row.category_name || "-"}
                        </td>

                        {/* Enrolled */}
                        <td
                          className="px-4 py-3 text-center"
                          style={{ width: columns[2].width }}
                        >
                          <div className="flex items-center justify-center gap-1 text-[#615DFA] font-bold">
                            <Users className="h-4 w-4" />
                            {row.enrolled_count}
                          </div>
                        </td>

                        {/* Monthly Package Count */}
                        <td
                          className="px-4 py-3 text-center font-medium"
                          style={{ width: columns[3].width }}
                        >
                          <span className="text-[#615DFA]">
                            {row.monthly_package_count || 0}
                          </span>
                        </td>

                        {/* Session Package Count */}
                        <td
                          className="px-4 py-3 text-center font-medium"
                          style={{ width: columns[4].width }}
                        >
                          <span className="text-[#23D2E2]">
                            {row.session_package_count || 0}
                          </span>
                        </td>

                        {/* Lessons */}
                        <td
                          className="px-4 py-3 text-center"
                          style={{ width: columns[5].width }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {row.lesson_count}
                          </div>
                        </td>

                        {/* Branch - Show all branches with different colors */}
                        <td
                          className={cn("px-4 py-3", hideBranch && "hidden")}
                          style={{ width: columns[6].width }}
                        >
                          {row.branch_names.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.branch_names.map((name, idx) => {
                                const color = getBranchColor(name, row.branch_names);
                                return (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                      color.bg,
                                      color.text
                                    )}
                                  >
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Slots - Show count per branch with matching colors */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[7].width }}
                        >
                          {row.slot_counts.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.slot_counts.map((slot, idx) => {
                                const color = getBranchColor(slot.branch_name, row.branch_names);
                                return (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                      color.bg,
                                      color.text
                                    )}
                                  >
                                    {slot.count}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Number of Levels */}
                        <td
                          className="px-4 py-3 text-center font-medium"
                          style={{ width: columns[8].width }}
                        >
                          {row.number_of_levels || "-"}
                        </td>

                        {/* Sessions to Level Up */}
                        <td
                          className="px-4 py-3 text-center font-medium"
                          style={{ width: columns[9].width }}
                        >
                          {row.sessions_to_level_up || "-"}
                        </td>

                        {/* Status */}
                        <td
                          className="px-4 py-3 text-center"
                          style={{ width: columns[10].width }}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              STATUS_STYLES[row.status || "active"] ||
                                "bg-gray-100 text-gray-700"
                            )}
                          >
                            {STATUS_LABELS[row.status || "active"] || row.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td
                          className={cn("px-4 py-3", !onEdit && !onDelete && "hidden")}
                          style={{ width: columns[11].width }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                                aria-label={`Edit program ${row.name}`}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                onClick={() => openDeleteModal(row)}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                                aria-label={`Delete program ${row.name}`}
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

      {/* Modal */}
      <ProgramModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        branches={branches}
        instructors={instructors}
        categories={categories}
        vouchers={vouchers}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateCategory={onCreateCategory}
        onFetchProgram={onFetchProgram}
        onUploadCoverImage={onUploadCoverImage}
      />
    </>
  );
}
