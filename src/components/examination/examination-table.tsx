"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Plus,
  Download,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ExaminationModal } from "@/components/examination/examination-modal";
import type { ExaminationTableRow, EligibleStudent, ExaminationStatus } from "@/db/schema";
import type { ExaminationFormPayload } from "@/app/(dashboard)/examination/actions";

export interface BranchOption {
  id: string;
  name: string;
}

export interface CourseOption {
  id: string;
  name: string;
  numberOfLevels: number | null;
}

export interface ExaminerOption {
  id: string;
  name: string;
  photo: string | null;
}

interface ExaminationTableProps {
  initialData: ExaminationTableRow[];
  eligibleStudents: EligibleStudent[];
  examiners: ExaminerOption[];
  branches: BranchOption[];
  courses: CourseOption[];
  onAdd: (
    payload: ExaminationFormPayload
  ) => Promise<{ success: boolean; error?: string }>;
  onEdit: (
    examId: string,
    payload: Partial<ExaminationFormPayload>
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (examId: string) => Promise<{ success: boolean; error?: string }>;
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "photo", label: "Photo", width: "50px" },
  { key: "student", label: "Student", width: "130px" },
  { key: "branch", label: "Branch", width: "100px" },
  { key: "age", label: "Age", width: "50px", align: "center" },
  { key: "program", label: "Program", width: "120px" },
  { key: "sessionAttend", label: "Sessions", width: "70px", align: "center" },
  { key: "level", label: "Level", width: "60px", align: "center" },
  { key: "exam", label: "Exam", width: "140px" },
  { key: "reattempt", label: "Reattempt", width: "70px", align: "center" },
  { key: "mark", label: "Mark", width: "60px", align: "center" },
  { key: "notes", label: "Detail", width: "100px" },
  { key: "examiner", label: "PIC", width: "50px", align: "center" },
  { key: "date", label: "Date", width: "100px" },
  { key: "cert", label: "Cert", width: "60px", align: "center" },
  { key: "status", label: "Status", width: "90px", align: "center" },
  { key: "action", label: "Action", width: "90px", align: "center" },
];

const STATUS_STYLES: Record<ExaminationStatus, string> = {
  eligible: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  absent: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<ExaminationStatus, string> = {
  eligible: "Eligible",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  pass: "Pass",
  fail: "Fail",
  absent: "Absent",
};

export function ExaminationTable({
  initialData,
  eligibleStudents,
  examiners,
  branches,
  courses,
  onAdd,
  onEdit,
  onDelete,
}: ExaminationTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExaminationStatus | "all">(
    "all"
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] =
    useState<ExaminationTableRow | null>(null);

  const handleAdd = async (payload: ExaminationFormPayload) => {
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create examination");
    }
    router.refresh();
  };

  const handleEdit = async (payload: ExaminationFormPayload) => {
    if (!selectedRecord) return;
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update examination");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete examination");
    }
    router.refresh();
  };

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    let result = initialData;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((row) => row.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          row.studentName.toLowerCase().includes(query) ||
          row.branchName.toLowerCase().includes(query) ||
          row.courseName.toLowerCase().includes(query) ||
          row.examName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [initialData, searchQuery, statusFilter]);

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

  const handleStatusFilterChange = (status: ExaminationStatus | "all") => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Modal handlers
  const openAddModal = () => {
    setSelectedRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  const openEditModal = (record: ExaminationTableRow) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (record: ExaminationTableRow) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "do MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search and Action Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by student, branch, program, exam..."
              />
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  handleStatusFilterChange(
                    e.target.value as ExaminationStatus | "all"
                  )
                }
                className="h-[50px] px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#615DFA]"
              >
                <option value="all">All Status</option>
                <option value="eligible">Eligible</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Examination
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1600px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={`${col.key}-${idx}`}
                      className={cn(
                        "bg-transparent px-3 py-3 text-left text-base font-bold text-foreground",
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
            <table className="min-w-[1600px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No examinations found.
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
                      {/* Photo */}
                      <td
                        className="px-3 py-2"
                        style={{ width: columns[0].width }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={row.studentPhoto || undefined}
                            alt={row.studentName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-r from-[#615DFA] to-[#23D2E2] text-white font-medium text-xs">
                            {row.studentName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </td>

                      {/* Student Name */}
                      <td
                        className="px-3 py-2 font-bold truncate"
                        style={{ width: columns[1].width }}
                      >
                        {row.studentName}
                      </td>

                      {/* Branch */}
                      <td
                        className="px-3 py-2 text-sm truncate"
                        style={{ width: columns[2].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Age */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[3].width }}
                      >
                        {row.studentAge ?? "-"}
                      </td>

                      {/* Program */}
                      <td
                        className="px-3 py-2 text-sm truncate"
                        style={{ width: columns[4].width }}
                      >
                        {row.courseName}
                      </td>

                      {/* Session Attend */}
                      <td
                        className="px-3 py-2 text-center font-medium text-[#615DFA]"
                        style={{ width: columns[5].width }}
                      >
                        {row.sessionAttend}
                      </td>

                      {/* Level */}
                      <td
                        className="px-3 py-2 text-center font-bold"
                        style={{ width: columns[6].width }}
                      >
                        {row.currentLevel}
                      </td>

                      {/* Exam */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[7].width }}
                      >
                        <div className="space-y-0.5">
                          <div className="font-medium truncate">
                            {row.examName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Level {row.examLevel}
                          </div>
                        </div>
                      </td>

                      {/* Reattempt */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[8].width }}
                      >
                        {row.reattemptCount > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {row.reattemptCount}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Mark */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[9].width }}
                      >
                        {row.mark !== null ? (
                          <span
                            className={cn(
                              "font-bold",
                              row.mark >= 70
                                ? "text-green-600"
                                : row.mark >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                            )}
                          >
                            {row.mark}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Notes */}
                      <td
                        className="px-3 py-2 text-xs truncate"
                        style={{ width: columns[10].width }}
                        title={row.notes || undefined}
                      >
                        {row.notes || "-"}
                      </td>

                      {/* Examiner (PIC) */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[11].width }}
                      >
                        {row.examinerPhoto || row.examinerName ? (
                          <Avatar
                            className="h-6 w-6 mx-auto"
                            title={row.examinerName || undefined}
                          >
                            <AvatarImage
                              src={row.examinerPhoto || undefined}
                              alt={row.examinerName || "Examiner"}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                              {row.examinerName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Date */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[12].width }}
                      >
                        {formatDate(row.examDate)}
                      </td>

                      {/* Certificate */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[13].width }}
                      >
                        {row.certificateUrl ? (
                          <a
                            href={row.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 text-[#615DFA] hover:bg-[#615DFA]/10 rounded"
                            title="Download Certificate"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : row.status === "pass" ? (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Status */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[14].width }}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_STYLES[row.status]
                          )}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="px-3 py-2"
                        style={{ width: columns[15].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Edit examination for ${row.studentName}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Delete examination for ${row.studentName}`}
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

      {/* Modal */}
      <ExaminationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        eligibleStudents={eligibleStudents}
        examiners={examiners}
        courses={courses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
