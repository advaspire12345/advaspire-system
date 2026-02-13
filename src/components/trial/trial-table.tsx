"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import {
  TrialModal,
  type TrialFormData,
  type BranchOption,
  type CourseOption,
} from "@/components/trial/trial-modal";
import { cn } from "@/lib/utils";
import type { TrialRow } from "@/data/trial";
import {
  addTrialAction,
  updateTrialAction,
  deleteTrialAction,
} from "@/app/(dashboard)/trial/actions";
import { format, parseISO } from "date-fns";

interface TrialTableProps {
  initialData: TrialRow[];
  branches: BranchOption[];
  courses: CourseOption[];
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "parent", label: "Parent", width: "140px" },
  { key: "child", label: "Child", width: "140px" },
  { key: "age", label: "Age", width: "60px", align: "center" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "program", label: "Program", width: "140px" },
  { key: "source", label: "Source", width: "100px" },
  { key: "date", label: "Date", width: "100px" },
  { key: "time", label: "Time", width: "80px" },
  { key: "message", label: "Message", width: "140px" },
  { key: "status", label: "Status", width: "100px", align: "center" },
  { key: "phone", label: "Phone", width: "120px" },
  { key: "action", label: "Action", width: "100px", align: "center" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
  no_show: "bg-red-100 text-red-700",
};

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  phone: "Phone",
  online: "Online",
  referral: "Referral",
  social_media: "Social Media",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function TrialTable({
  initialData,
  branches,
  courses,
}: TrialTableProps) {
  const [data] = useState<TrialRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<TrialRow | null>(null);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.parentName.toLowerCase().includes(query) ||
        row.childName.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query)
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

  // Open modal for add
  const openAddModal = () => {
    setSelectedRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (record: TrialRow) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  // Open modal for delete
  const openDeleteModal = (record: TrialRow) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
  };

  // Handle add
  const handleAdd = async (formData: TrialFormData) => {
    const result = await addTrialAction({
      parentName: formData.parentName,
      parentPhone: formData.parentPhone,
      parentEmail: formData.parentEmail,
      childName: formData.childName,
      childAge: formData.childAge,
      branchId: formData.branchId,
      courseId: formData.courseId,
      source: formData.source,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      message: formData.message,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to add trial");
    }
  };

  // Handle edit
  const handleEdit = async (formData: TrialFormData) => {
    if (!selectedRecord) return;

    const result = await updateTrialAction(selectedRecord.id, {
      parentName: formData.parentName,
      parentPhone: formData.parentPhone,
      parentEmail: formData.parentEmail,
      childName: formData.childName,
      childAge: formData.childAge,
      branchId: formData.branchId,
      courseId: formData.courseId,
      source: formData.source,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      message: formData.message,
      status: formData.status,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update trial");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRecord) return;

    const result = await deleteTrialAction(selectedRecord.id);

    if (!result.success) {
      throw new Error(result.error || "Failed to delete trial");
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  // Format time for display (remove seconds if present)
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    // Handle HH:MM:SS format
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Truncate text for message column
  const truncateText = (text: string | null, maxLength: number = 30) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
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
              placeholder="Search by parent, child, or branch..."
            />

            {/* Add Trial Button */}
            <Button
              onClick={openAddModal}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4" />
              Add Trial
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1340px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[1340px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No trials found.
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
                      {/* Parent */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[0].width }}
                      >
                        {row.parentName}
                      </td>

                      {/* Child */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[1].width }}
                      >
                        {row.childName}
                      </td>

                      {/* Age */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[2].width }}
                      >
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {row.childAge}
                        </span>
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
                        {row.courseName ?? "-"}
                      </td>

                      {/* Source */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[5].width }}
                      >
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {SOURCE_LABELS[row.source] ?? row.source}
                        </span>
                      </td>

                      {/* Date */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {formatDate(row.scheduledDate)}
                      </td>

                      {/* Time */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[7].width }}
                      >
                        {formatTime(row.scheduledTime)}
                      </td>

                      {/* Message */}
                      <td
                        className="px-4 py-3 text-muted-foreground"
                        style={{ width: columns[8].width }}
                        title={row.message ?? undefined}
                      >
                        {truncateText(row.message)}
                      </td>

                      {/* Status */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[9].width }}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            STATUS_STYLES[row.status] ?? "bg-gray-100 text-gray-700"
                          )}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>

                      {/* Phone */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[10].width }}
                      >
                        {row.parentPhone}
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
                            aria-label={`Edit trial for ${row.childName}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Delete trial for ${row.childName}`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Trial Modal */}
      <TrialModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        branches={branches}
        courses={courses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
