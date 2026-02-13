"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AttendanceLogModal,
  type LogModalMode,
  type AttendanceLogFormData,
} from "@/components/attendance/attendance-log-modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/utils/export-csv";
import type { AttendanceLogRow } from "@/data/attendance";
import type { AttendanceStatus } from "@/db/schema";
import {
  updateAttendanceLogAction,
  deleteAttendanceLogAction,
} from "@/app/(dashboard)/attendance-log/actions";

interface InstructorOption {
  id: string;
  name: string;
}

interface AttendanceLogTableProps {
  initialData: AttendanceLogRow[];
  instructors?: InstructorOption[];
}

const ITEMS_PER_PAGE = 10;

type StatusFilter = "All" | "Present" | "Absent";
const STATUS_FILTERS: StatusFilter[] = ["All", "Present", "Absent"];

const columns = [
  { key: "photo", label: "Photo", width: "80px", align: "center" as const },
  { key: "username", label: "Username", width: "140px" },
  { key: "branch", label: "Branch", width: "100px" },
  { key: "program", label: "Program", width: "120px" },
  { key: "type", label: "Type", width: "80px", align: "center" as const },
  { key: "date", label: "Date", width: "100px" },
  { key: "day", label: "Day", width: "80px" },
  { key: "time", label: "Time", width: "70px" },
  {
    key: "attendance",
    label: "Attendance",
    width: "90px",
    align: "center" as const,
  },
  { key: "activity", label: "Activity", width: "120px" },
  { key: "adcoin", label: "Adcoin", width: "70px", align: "center" as const },
  { key: "pic", label: "PIC", width: "100px" },
  {
    key: "actions",
    label: "Actions",
    width: "100px",
    align: "center" as const,
  },
];

const csvColumns = [
  { key: "studentName", label: "Student Name" },
  { key: "branchName", label: "Branch" },
  { key: "courseName", label: "Program" },
  { key: "classType", label: "Type" },
  { key: "date", label: "Date" },
  { key: "dayOfWeek", label: "Day" },
  { key: "actualStartTime", label: "Time" },
  { key: "status", label: "Attendance" },
  { key: "lastActivity", label: "Activity" },
  { key: "adcoin", label: "Adcoin" },
  { key: "instructorName", label: "Instructor" },
  { key: "markedBy", label: "Marked By" },
  { key: "notes", label: "Notes" },
];

export function AttendanceLogTable({
  initialData,
  instructors = [],
}: AttendanceLogTableProps) {
  const [data, setData] = useState<AttendanceLogRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<LogModalMode>("edit");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceLogRow | null>(
    null,
  );

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    let result = data;

    // Apply status filter
    if (statusFilter !== "All") {
      const filterStatus = statusFilter.toLowerCase();
      result = result.filter((row) => row.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (row) =>
          row.studentName.toLowerCase().includes(query) ||
          row.branchName.toLowerCase().includes(query) ||
          row.courseName.toLowerCase().includes(query) ||
          row.status.toLowerCase().includes(query) ||
          (row.instructorName?.toLowerCase().includes(query) ?? false) ||
          (row.lastActivity?.toLowerCase().includes(query) ?? false),
      );
    }

    return result;
  }, [data, searchQuery, statusFilter]);

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

  const handleStatusFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // Open modal with specific mode
  const openModal = (mode: LogModalMode, record: AttendanceLogRow) => {
    setModalMode(mode);
    setSelectedRecord(record);
    setModalOpen(true);
  };

  // Handle update
  const handleUpdate = useCallback(
    async (formData: AttendanceLogFormData) => {
      if (!selectedRecord) return;

      const result = await updateAttendanceLogAction(selectedRecord.id, {
        status: formData.status,
        classType: formData.classType,
        actualDay: formData.actualDay,
        actualStartTime: formData.actualStartTime,
        instructorName: formData.instructorName,
        lastActivity: formData.lastActivity,
        notes: formData.notes,
        projectPhotos: formData.projectPhotos,
      });

      if (result.success) {
        // Update local state
        setData((prev) =>
          prev.map((item) =>
            item.id === selectedRecord.id
              ? {
                  ...item,
                  status: formData.status,
                  classType: formData.classType,
                  dayOfWeek: formData.actualDay,
                  actualStartTime: formData.actualStartTime,
                  instructorName: formData.instructorName,
                  lastActivity: formData.lastActivity,
                  notes: formData.notes,
                  projectPhotos: formData.projectPhotos,
                }
              : item,
          ),
        );
      } else {
        console.error("Failed to update:", result.error);
        throw new Error(result.error);
      }
    },
    [selectedRecord],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedRecord) return;

    const result = await deleteAttendanceLogAction(selectedRecord.id);

    if (result.success) {
      // Remove from local state
      setData((prev) => prev.filter((item) => item.id !== selectedRecord.id));
    } else {
      console.error("Failed to delete:", result.error);
      throw new Error(result.error);
    }
  }, [selectedRecord]);

  // Export to CSV
  const handleExport = () => {
    const exportData = filteredData.map((row) => ({
      ...row,
      date: format(new Date(row.date), "do MMM yyyy"),
      status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
      adcoin: 0, // Placeholder - would come from actual data
    }));
    exportToCSV(
      exportData,
      `attendance-log-${format(new Date(), "yyyy-MM-dd")}`,
      csvColumns,
    );
  };

  // Format date display
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "do MMM yyyy");
  };

  // Format time display
  const formatTime = (time: string | null) => {
    if (!time) return "-";
    const parts = time.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  // Get status badge style
  const getStatusBadge = (status: AttendanceStatus) => {
    const styles: Record<AttendanceStatus, string> = {
      present: "bg-green-100 text-green-700",
      absent: "bg-red-100 text-red-700",
      late: "bg-yellow-100 text-yellow-700",
      excused: "bg-blue-100 text-blue-700",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          styles[status],
        )}
      >
        {status}
      </span>
    );
  };

  // Get type badge
  const getTypeBadge = (type: "Physical" | "Online" | null) => {
    if (!type) return "-";

    const styles = {
      Physical: "bg-purple-100 text-purple-700",
      Online: "bg-cyan-100 text-cyan-700",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          styles[type],
        )}
      >
        {type}
      </span>
    );
  };

  // Truncate text with tooltip
  const TruncatedText = ({
    text,
    maxLength = 20,
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
          {/* Search, Filter and Export Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            {/* Search Input */}
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search by student, branch, status, program..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(
                  "pr-20 py-6 border-muted-foreground/30",
                  searchQuery && "font-semibold",
                )}
              />

              <button
                type="button"
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
              >
                <Search className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center">
              {STATUS_FILTERS.map((filter, idx) => (
                <div key={filter} className="flex items-center">
                  <div className="h-5 w-px bg-[#eaeaf5]" />
                  <button
                    type="button"
                    onClick={() => handleStatusFilter(filter)}
                    className={cn(
                      "relative px-10 py-2 text-sm font-bold transition-colors",
                      statusFilter === filter
                        ? "text-foreground"
                        : "text-[#8B8FB9] hover:text-foreground/70",
                    )}
                  >
                    {filter}
                    {statusFilter === filter && (
                      <span className="absolute -bottom-[30px] left-0 right-0 h-[3px] rounded bg-[#23D2E2]" />
                    )}
                  </button>
                  {idx === STATUS_FILTERS.length - 1 && (
                    <div className="h-5 w-px bg-[#eaeaf5]" />
                  )}
                </div>
              ))}
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              variant="outline"
              className="font-bold h-[50px] px-6"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1350px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[1350px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedData.length - 1 &&
                          "rounded-bl-lg rounded-br-lg",
                      )}
                    >
                      {/* Photo */}
                      <td
                        className="px-4 py-3"
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
                              <HexagonNumberBadge
                                value={row.studentLevel}
                                size={22}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[1].width }}
                      >
                        <TruncatedText text={row.studentName} maxLength={15} />
                      </td>

                      {/* Branch */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[2].width }}
                      >
                        <TruncatedText text={row.branchName} maxLength={12} />
                      </td>

                      {/* Program */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[3].width }}
                      >
                        <TruncatedText text={row.courseName} maxLength={15} />
                      </td>

                      {/* Type */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[4].width }}
                      >
                        {getTypeBadge(row.classType)}
                      </td>

                      {/* Date */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[5].width }}
                      >
                        {formatDate(row.date)}
                      </td>

                      {/* Day */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {row.dayOfWeek ?? "-"}
                      </td>

                      {/* Time */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[7].width }}
                      >
                        {formatTime(row.actualStartTime)}
                      </td>

                      {/* Attendance */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[8].width }}
                      >
                        {getStatusBadge(row.status)}
                      </td>

                      {/* Activity */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <TruncatedText text={row.lastActivity} maxLength={15} />
                      </td>

                      {/* Adcoin */}
                      <td
                        className="px-4 py-3 text-center font-bold text-[#23d2e2]"
                        style={{ width: columns[10].width }}
                      >
                        0
                      </td>

                      {/* PIC (Instructor/Marked By) */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[11].width }}
                      >
                        <TruncatedText
                          text={row.instructorName ?? row.markedBy}
                          maxLength={12}
                        />
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[12].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openModal("edit", row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Edit attendance for ${row.studentName}`}
                            title="Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => openModal("delete", row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Delete attendance for ${row.studentName}`}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Delete Modal */}
      <AttendanceLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        instructors={instructors}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
