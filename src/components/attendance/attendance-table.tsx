"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import {
  StudentAttendanceModal,
  type ModalMode,
  type AttendanceFormData,
} from "@/components/attendance/student-attendance-modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AttendanceStatus } from "@/db/schema";

export interface AttendanceRow {
  id: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentPhoto: string | null;
  branchId: string;
  branchName: string;
  courseId: string;
  courseName: string;
  packageName: string | null;
  dayOfWeek: string | null;
  slotDay: string;
  slotTime: string | null;
  startTime: string | null;
  endTime: string | null;
  lastAttendanceDate: string | null;
  lastAttendanceStatus: AttendanceStatus | null;
  sessionsRemaining: number;
  // Type to distinguish between enrollment and trial
  type: 'enrollment' | 'trial';
  // Trial-specific fields
  trialId?: string;
  parentName?: string;
  childAge?: number;
  // Existing attendance data for this week (if partially filled)
  existingAttendance?: {
    id: string;
    date: string;
    status: AttendanceStatus;
    classType: 'Physical' | 'Online' | null;
    actualDay: string | null;
    actualStartTime: string | null;
    instructorName: string | null;
    lastActivity: string | null;
    projectPhotos: string[] | null;
    notes: string | null;
    adcoin: number;
    lesson: string | null;
    mission: string | null;
  } | null;
}

interface InstructorOption {
  id: string;
  name: string;
}

interface CurriculumLesson {
  id: string;
  title: string;
  missions: {
    level: number | null;
    url_mission: string | null;
    url_answer: string | null;
  }[];
}

interface AttendanceTableProps {
  initialData: AttendanceRow[];
  /** All active students for manual "Take Attendance" search (not filtered by slot completion) */
  allStudentsForManualAdd?: AttendanceRow[];
  instructors?: InstructorOption[];
  /** Function to fetch curriculum lessons for a course */
  fetchCurriculumLessons?: (courseId: string) => Promise<CurriculumLesson[]>;
}

const ITEMS_PER_PAGE = 10;

const columns = [
  { key: "photo", label: "Photo", width: "80px", align: "center" as const },
  { key: "username", label: "Username", width: "160px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "program", label: "Program", width: "140px" },
  { key: "day", label: "Day", width: "80px" },
  { key: "time", label: "Time", width: "100px" },
  { key: "lesson", label: "Lesson", width: "120px" },
  { key: "mission", label: "Mission", width: "100px" },
  { key: "lastActivity", label: "Last Activity", width: "140px" },
  {
    key: "attendance",
    label: "Attendance",
    width: "100px",
    align: "center" as const,
  },
];

export function AttendanceTable({
  initialData,
  allStudentsForManualAdd,
  instructors = [],
  fetchCurriculumLessons,
}: AttendanceTableProps) {
  const router = useRouter();
  const [data, setData] = useState<AttendanceRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Sync data state when initialData changes (after page refresh)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Unified modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedRow, setSelectedRow] = useState<AttendanceRow | null>(null);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.studentName.toLowerCase().includes(query) ||
        row.courseName.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query),
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

  // Open modal with specific mode
  const openModal = (mode: ModalMode, row?: AttendanceRow) => {
    setModalMode(mode);
    setSelectedRow(row ?? null);
    setModalOpen(true);
  };

  // Handle modal submit
  const handleModalSubmit = async (formData: AttendanceFormData) => {
    // Debug: log what we're sending
    console.log('Submitting attendance formData:', formData);

    try {
      const requestBody = {
        enrollmentId: formData.enrollmentId,
        date: formData.date,
        status: formData.status,
        notes: formData.notes || undefined,
        actualDay: formData.actualDay,
        actualStartTime: formData.actualStartTime,
        classType: formData.classType,
        instructorName: formData.instructorName || undefined,
        lastActivity: formData.lastActivity || undefined,
        projectPhotos:
          formData.projectPhotos.length > 0
            ? formData.projectPhotos
            : undefined,
        adcoin: formData.adcoin || 0,
        // Lesson and mission
        lesson: formData.lesson || undefined,
        mission: formData.mission || undefined,
        // Trial-specific fields
        instructorFeedback: formData.instructorFeedback || undefined,
        isTrial: formData.isTrial || false,
      };
      console.log('Request body:', requestBody);

      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();

        // Optimistically update local data so lesson/mission show immediately
        if (selectedRow) {
          setData(prev => prev.map(row => {
            if (row.id !== selectedRow.id) return row;
            return {
              ...row,
              existingAttendance: {
                id: row.existingAttendance?.id || result.attendance?.id || '',
                date: row.existingAttendance?.date || formData.date,
                status: formData.status as AttendanceStatus,
                classType: formData.classType as 'Physical' | 'Online' | null,
                actualDay: formData.actualDay || null,
                actualStartTime: formData.actualStartTime || null,
                instructorName: formData.instructorName || null,
                lastActivity: formData.lastActivity || null,
                projectPhotos: formData.projectPhotos.length > 0 ? formData.projectPhotos : null,
                notes: formData.notes || null,
                adcoin: formData.adcoin || 0,
                lesson: formData.lesson || null,
                mission: formData.mission || null,
              },
            };
          }));
        }

        router.refresh();
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Failed to submit attendance:", error);
      throw error;
    }
  };

  // Format time display
  const formatTime = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return "-";
    const formatTimeStr = (t: string) => {
      const parts = t.split(":");
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
    };
    if (!endTime) return formatTimeStr(startTime);
    return `${formatTimeStr(startTime)} - ${formatTimeStr(endTime)}`;
  };

  // Format last activity
  const formatLastActivity = (
    date: string | null,
    status: AttendanceStatus | null,
  ) => {
    if (!date) return "-";
    const formatted = format(new Date(date), "do MMM yyyy");
    if (!status) return formatted;
    return `${formatted}`;
  };

  // Get status badge style
  const getStatusBadge = (status: AttendanceStatus | null) => {
    if (!status) return null;

    const styles: Record<AttendanceStatus, string> = {
      present: "bg-green-100 text-green-700",
      absent: "bg-red-100 text-red-700",
      late: "bg-yellow-100 text-yellow-700",
      excused: "bg-blue-100 text-blue-700",
    };

    return (
      <span
        className={cn(
          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          styles[status],
        )}
      >
        {status}
      </span>
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

            {/* Take Attendance Button */}
            <Button
              onClick={() => openModal("add")}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4" />
              Take Attendance
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[900px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[900px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                  paginatedData.map((row, rowIdx) => {
                    // Check if attendance exists but is incomplete
                    const hasIncompleteAttendance = row.existingAttendance &&
                      (!row.existingAttendance.classType || !row.existingAttendance.instructorName);

                    return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedData.length - 1 &&
                          "rounded-bl-lg rounded-br-lg",
                        row.type === 'trial' && "bg-purple-50/50",
                        hasIncompleteAttendance && "bg-amber-50/50",
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
                                value={row.sessionsRemaining}
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
                        <div className="flex items-center gap-2">
                          {row.studentName}
                          {row.type === 'trial' && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                              Trial
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Branch */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[2].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Program */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[3].width }}
                      >
                        {row.courseName}
                      </td>

                      {/* Day */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[4].width }}
                      >
                        {row.slotDay ?? "-"}
                      </td>

                      {/* Time */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[5].width }}
                      >
                        {formatTime(row.slotTime, null)}
                      </td>

                      {/* Lesson */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {row.existingAttendance?.lesson ?? "-"}
                      </td>

                      {/* Mission */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[7].width }}
                      >
                        {row.existingAttendance?.mission ?? "-"}
                      </td>

                      {/* Last Activity */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[8].width }}
                      >
                        <span className="font-bold">
                          {formatLastActivity(
                            row.lastAttendanceDate,
                            row.lastAttendanceStatus,
                          )}
                        </span>
                        {getStatusBadge(row.lastAttendanceStatus)}
                      </td>

                      {/* Attendance Actions */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {/* Mark Present Button */}
                          <button
                            type="button"
                            onClick={() => openModal("present", row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Mark ${row.studentName} as present`}
                            title="Mark Present"
                          >
                            <UserCheck className="h-5 w-5" />
                          </button>

                          {/* Mark Absent Button */}
                          <button
                            type="button"
                            onClick={() => openModal("absent", row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Mark ${row.studentName} as absent`}
                            title="Mark Absent"
                          >
                            <UserX className="h-5 w-5" />
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

      {/* Unified Attendance Modal */}
      <StudentAttendanceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        allStudents={modalMode === 'add' ? (allStudentsForManualAdd ?? data) : data}
        selectedRow={selectedRow}
        instructors={instructors}
        onSubmit={handleModalSubmit}
        fetchCurriculumLessons={fetchCurriculumLessons}
      />
    </>
  );
}
