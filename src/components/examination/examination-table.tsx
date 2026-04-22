"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Plus,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInYears } from "date-fns";
import { ExaminationModal } from "@/components/examination/examination-modal";
import { CertificatePreviewModal } from "@/components/examination/certificate-preview-modal";
import type { ExaminationTableRow, EligibleStudent, ExaminationStatus, StudentExamOption } from "@/db/schema";
import {
  createExaminationAction,
  updateExaminationAction,
  deleteExaminationAction,
  type ExaminationFormPayload,
} from "@/app/(dashboard)/examination/actions";

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
  allStudents: StudentExamOption[];
  examiners: ExaminerOption[];
  branches: BranchOption[];
  courses: CourseOption[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  hideBranch?: boolean;
  totalCount: number;
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
  { key: "age", label: "Age", width: "50px", align: "center" },
  { key: "branch", label: "Branch", width: "100px" },
  { key: "exam", label: "Exam", width: "160px" },
  { key: "sessionAttend", label: "Sessions", width: "70px", align: "center" },
  { key: "reattempt", label: "Reattempt", width: "70px", align: "center" },
  { key: "mark", label: "Mark", width: "60px", align: "center" },
  { key: "notes", label: "Detail", width: "100px" },
  { key: "examiner", label: "PIC", width: "100px" },
  { key: "date", label: "Date", width: "100px" },
  { key: "cert", label: "Cert", width: "100px", align: "center" },
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
  allStudents,
  examiners,
  branches,
  courses,
  canCreate,
  canEdit,
  canDelete,
  hideBranch,
  totalCount,
}: ExaminationTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Progressive loading: start with server-provided first batch, load rest in background
  const [serverData, setServerData] = useState<ExaminationTableRow[]>(initialData);
  const [isLoadingMore, setIsLoadingMore] = useState(initialData.length < totalCount);
  const fetchedRef = useRef(false);

  const fetchRemainingData = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let offset = initialData.length;
    const existingIds = new Set(initialData.map((r) => r.id));

    while (offset < totalCount) {
      try {
        const res = await fetch(`/api/examination/table?offset=${offset}&limit=10`);
        if (!res.ok) break;
        const result: { rows: ExaminationTableRow[] } = await res.json();
        if (!result.rows || result.rows.length === 0) break;

        const newRows = result.rows.filter((r) => !existingIds.has(r.id));
        for (const r of result.rows) existingIds.add(r.id);

        if (newRows.length > 0) {
          setServerData((prev) => [...prev, ...newRows]);
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
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] =
    useState<ExaminationTableRow | null>(null);

  // Certificate preview state
  const [certPreviewOpen, setCertPreviewOpen] = useState(false);
  const [certRecord, setCertRecord] = useState<ExaminationTableRow | null>(null);

  const openCertPreview = (record: ExaminationTableRow) => {
    setCertRecord(record);
    setCertPreviewOpen(true);
  };

  const handleAdd = async (payload: ExaminationFormPayload) => {
    if (!canCreate) return;
    const result = await createExaminationAction(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create examination");
    }
    router.refresh();
  };

  const handleEdit = async (payload: ExaminationFormPayload) => {
    if (!canEdit) return;
    if (!selectedRecord) return;
    // Eligible rows are virtual (not in DB yet), so create instead of update
    if (selectedRecord.id.startsWith("eligible-")) {
      if (!canCreate) return;
      const result = await createExaminationAction(payload);
      if (!result.success) {
        throw new Error(result.error || "Failed to create examination");
      }
    } else {
      const result = await updateExaminationAction(selectedRecord.id, payload);
      if (!result.success) {
        throw new Error(result.error || "Failed to update examination");
      }
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!selectedRecord) return;
    // Eligible rows are virtual (not in DB), nothing to delete
    if (selectedRecord.id.startsWith("eligible-")) {
      return;
    }
    const result = await deleteExaminationAction(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete examination");
    }
    router.refresh();
  };

  // Convert eligible students to virtual table rows and merge with real exam records
  const allData = useMemo(() => {
    // Create a set of existing exam keys (student+course+level) to avoid duplicates
    const existingExamKeys = new Set(
      serverData.map((row) => `${row.studentId}-${row.courseId}-${row.examLevel}`)
    );

    // Convert eligible students to virtual ExaminationTableRow entries
    const eligibleRows: ExaminationTableRow[] = eligibleStudents
      .filter((es) => !existingExamKeys.has(`${es.studentId}-${es.courseId}-${es.currentLevel}`))
      .map((es) => {
        let studentAge: number | null = null;
        if (es.dateOfBirth) {
          try {
            studentAge = differenceInYears(new Date(), parseISO(es.dateOfBirth));
          } catch { /* ignore */ }
        }
        return {
          id: `eligible-${es.studentId}-${es.enrollmentId}`,
          studentId: es.studentId,
          studentName: es.studentName,
          studentPhoto: es.studentPhoto,
          studentAge,
          branchId: es.branchId,
          branchName: es.branchName,
          courseId: es.courseId,
          courseName: es.courseName,
          sessionAttend: es.sessionsAttended,
          currentLevel: es.currentLevel,
          examName: `${es.courseName} Level ${es.currentLevel}`,
          examLevel: es.currentLevel,
          reattemptCount: 0,
          mark: null,
          notes: null,
          examinerId: null,
          examinerName: null,
          examinerPhoto: null,
          examDate: new Date().toISOString(),
          certificateUrl: null,
          certificateNumber: null,
          status: "eligible" as ExaminationStatus,
        };
      });

    return [...eligibleRows, ...serverData];
  }, [serverData, eligibleStudents]);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    let result = allData;

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
  }, [allData, searchQuery]);

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
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by student, branch, program, exam..."
              />
            </div>
            {canCreate && (
              <Button
                onClick={openAddModal}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Examination
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1300px] w-full table-fixed border-separate border-spacing-0">
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
                        col.align === "right" && "text-right",
                        col.key === "branch" && hideBranch && "hidden",
                        col.key === "action" && !canEdit && !canDelete && "hidden",
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
            <table className="min-w-[1300px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                          Loading examinations...
                        </div>
                      ) : (
                        "No examinations found."
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
                      {/* Photo */}
                      <td
                        className="px-3 py-2"
                        style={{ width: columns[0].width }}
                      >
                        <div className="relative flex justify-center">
                          <div className="relative">
                            <HexagonAvatar
                              size={50}
                              imageUrl={row.studentPhoto ?? undefined}
                              percentage={0.5}
                              animated={false}
                              fallbackInitials={row.studentName.charAt(0)}
                              cornerRadius={8}
                            />
                            <div className="absolute -bottom-1 -right-1 z-10">
                              <HexagonNumberBadge value={row.currentLevel} size={22} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td
                        className="px-3 py-2 font-bold truncate"
                        style={{ width: columns[1].width }}
                      >
                        {row.studentName}
                      </td>

                      {/* Age */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[2].width }}
                      >
                        {row.studentAge ?? "-"}
                      </td>

                      {/* Branch */}
                      <td
                        className={cn("px-3 py-2 text-sm truncate", hideBranch && "hidden")}
                        style={{ width: columns[3].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Exam (Program + Level) */}
                      <td
                        className="px-3 py-2 text-sm truncate"
                        style={{ width: columns[4].width }}
                      >
                        {row.courseName} Lv.{row.examLevel}
                      </td>

                      {/* Session Attend */}
                      <td
                        className="px-3 py-2 text-center font-medium text-[#615DFA]"
                        style={{ width: columns[5].width }}
                      >
                        {row.sessionAttend}
                      </td>

                      {/* Reattempt */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[6].width }}
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
                        style={{ width: columns[7].width }}
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
                        style={{ width: columns[8].width }}
                        title={row.notes || undefined}
                      >
                        {row.notes || "-"}
                      </td>

                      {/* Examiner (PIC) */}
                      <td
                        className="px-3 py-2 text-sm truncate"
                        style={{ width: columns[9].width }}
                      >
                        {row.examinerName || "-"}
                      </td>

                      {/* Date */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[10].width }}
                      >
                        {formatDate(row.examDate)}
                      </td>

                      {/* Certificate */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[11].width }}
                      >
                        {row.status === "pass" ? (
                          <button
                            type="button"
                            onClick={() => openCertPreview(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-transparent hover:bg-[#23D2E2] hover:text-white"
                            title="View Certificate"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Cert</span>
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Status */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[12].width }}
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
                        className={cn("px-3 py-2", !canEdit && !canDelete && "hidden")}
                        style={{ width: columns[13].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit examination for ${row.studentName}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label={`Delete examination for ${row.studentName}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
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
              Loading more examinations...
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

      {/* Modal */}
      <ExaminationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        allStudents={allStudents}
        examiners={examiners}
        courses={courses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Certificate Preview Modal */}
      {certRecord && (
        <CertificatePreviewModal
          open={certPreviewOpen}
          onOpenChange={setCertPreviewOpen}
          studentName={certRecord.studentName}
          courseName={certRecord.courseName}
          examLevel={certRecord.examLevel}
          mark={certRecord.mark}
          examinerName={certRecord.examinerName}
          examDate={certRecord.examDate}
          certificateNumber={certRecord.certificateNumber}
        />
      )}
    </>
  );
}
