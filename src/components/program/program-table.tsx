"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Pencil, Trash2, Plus, Users, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { ProgramTableRow } from "@/db/schema";
import type { BranchOption } from "@/components/trial/trial-modal";
import { ProgramModal } from "@/components/program/program-modal";
import type { ProgramFormPayload } from "@/app/(dashboard)/program/actions";

interface InstructorOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ProgramTableProps {
  initialData: ProgramTableRow[];
  branches: BranchOption[];
  instructors: InstructorOption[];
  categories: CategoryOption[];
  onAdd: (payload: ProgramFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit: (programId: string, payload: ProgramFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete: (programId: string) => Promise<{ success: boolean; error?: string }>;
  onCreateCategory: (name: string) => Promise<{ success: boolean; categoryId?: string; error?: string }>;
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
  { key: "plan", label: "Plan", width: "100px" },
  { key: "package", label: "Package", width: "100px" },
  { key: "period", label: "Period", width: "80px" },
  { key: "lessons", label: "Lessons", width: "80px", align: "center" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "assessment", label: "Assessment", width: "100px", align: "center" },
  { key: "levelling", label: "Levelling", width: "100px" },
  { key: "status", label: "Status", width: "90px", align: "center" },
  { key: "action", label: "Action", width: "100px", align: "center" },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-700",
};

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
  onAdd,
  onEdit,
  onDelete,
  onCreateCategory,
}: ProgramTableProps) {
  const [data] = useState<ProgramTableRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<ProgramTableRow | null>(null);

  const handleAdd = async (payload: ProgramFormPayload) => {
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create program");
    }
  };

  const handleEdit = async (payload: ProgramFormPayload) => {
    if (!selectedRecord) return;
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update program");
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete program");
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.category_name?.toLowerCase().includes(query) ||
        row.branch_names.some((b) => b.toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

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

  const formatBranches = (branchNames: string[]) => {
    if (branchNames.length === 0) return "-";
    if (branchNames.length === 1) return branchNames[0];
    return `${branchNames[0]} +${branchNames.length - 1}`;
  };

  const formatPricing = (pricing: ProgramTableRow["default_pricing"]) => {
    if (!pricing) return { plan: "-", package: "-", period: "-" };
    return {
      plan: `$${pricing.price}`,
      package: pricing.package_type === "monthly" ? "Monthly" : "Session",
      period: pricing.package_type === "monthly"
        ? `${pricing.duration} mo`
        : `${pricing.duration} sess`,
    };
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
            <Button
              onClick={openAddModal}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
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
            <table className="min-w-[1500px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No programs found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => {
                    const pricing = formatPricing(row.default_pricing);
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

                        {/* Plan */}
                        <td
                          className="px-4 py-3 font-bold"
                          style={{ width: columns[3].width }}
                        >
                          {pricing.plan}
                        </td>

                        {/* Package */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[4].width }}
                        >
                          {pricing.package}
                        </td>

                        {/* Period */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[5].width }}
                        >
                          {pricing.period}
                        </td>

                        {/* Lessons */}
                        <td
                          className="px-4 py-3 text-center"
                          style={{ width: columns[6].width }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {row.lesson_count}
                          </div>
                        </td>

                        {/* Branch */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[7].width }}
                        >
                          {formatBranches(row.branch_names)}
                        </td>

                        {/* Assessment */}
                        <td
                          className="px-4 py-3 text-center"
                          style={{ width: columns[8].width }}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              row.assessment_enabled
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {row.assessment_enabled ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Levelling */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[9].width }}
                        >
                          {row.levelling_time_minutes
                            ? `${row.levelling_time_minutes} min`
                            : "-"}
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
                          className="px-4 py-3"
                          style={{ width: columns[11].width }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit program ${row.name}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label={`Delete program ${row.name}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateCategory={onCreateCategory}
      />
    </>
  );
}
