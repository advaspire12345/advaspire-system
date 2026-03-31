"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserCheck,
  UserX,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
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
  lastActivityText: string | null;
  lastLesson: string | null;
  lastMission: string | null;
  lastAdcoin: number;
  sessionsRemaining: number;
  // Whether student has an active exam for this enrollment
  hasExam: boolean;
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
  /** Whether the user can create attendance (shows "Take Attendance" button) */
  canCreate?: boolean;
  hideBranch?: boolean;
  /** If set, the instructor name is fixed (for instructor role — auto-fill, no dropdown) */
  currentUserName?: string;
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
  { key: "lastAttendance", label: "Last Attendance", width: "130px" },
  { key: "status", label: "Status", width: "90px", align: "center" as const },
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
  canCreate = true,
  hideBranch,
  currentUserName,
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

  // Store attendanceId per row so it survives server refresh even if slot matching fails
  const attendanceIdMapRef = useRef<Map<string, string>>(new Map());

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
    if (row) {
      // If row lost its existingAttendance after server refresh but we have a stored attendanceId,
      // inject it back so the modal can pass it for direct update
      const storedId = attendanceIdMapRef.current.get(row.id);
      if (!row.existingAttendance?.id && storedId) {
        setSelectedRow({
          ...row,
          existingAttendance: {
            id: storedId,
            date: '',
            status: 'present',
            classType: null,
            actualDay: null,
            actualStartTime: null,
            instructorName: null,
            lastActivity: null,
            projectPhotos: null,
            notes: null,
            adcoin: 0,
            lesson: null,
            mission: null,
          },
        });
      } else {
        setSelectedRow(row);
      }
    } else {
      setSelectedRow(null);
    }
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
        // Existing attendance ID for updates
        attendanceId: formData.attendanceId || undefined,
        // Original slot info for permanent matching
        slotDay: formData.slotDay || undefined,
        slotTime: formData.slotTime || undefined,
        // Password for adcoin transfer verification
        adcoinPassword: formData.adcoinPassword || undefined,
      };
      console.log('Request body:', requestBody);

      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();

        // Optimistically update local data so lesson/mission/adcoin show immediately
        // Use server response (result.attendance) as primary source since it has the saved DB values
        if (selectedRow) {
          const att = result.attendance;
          const attendanceId = att?.id ?? selectedRow.existingAttendance?.id ?? '';

          // Store the attendanceId so it survives server refresh
          if (attendanceId) {
            attendanceIdMapRef.current.set(selectedRow.id, attendanceId);
          }

          setData(prev => prev.map(row => {
            if (row.id !== selectedRow.id) return row;
            return {
              ...row,
              existingAttendance: {
                id: attendanceId,
                date: att?.date ?? row.existingAttendance?.date ?? formData.date,
                status: (att?.status ?? formData.status) as AttendanceStatus,
                classType: (att?.class_type ?? formData.classType ?? null) as 'Physical' | 'Online' | null,
                actualDay: att?.actual_day ?? formData.actualDay ?? null,
                actualStartTime: att?.actual_start_time ?? formData.actualStartTime ?? null,
                instructorName: att?.instructor_name ?? formData.instructorName ?? null,
                lastActivity: att?.last_activity ?? formData.lastActivity ?? null,
                projectPhotos: att?.project_photos ?? (formData.projectPhotos.length > 0 ? formData.projectPhotos : null),
                notes: att?.notes ?? formData.notes ?? null,
                adcoin: att?.adcoin ?? formData.adcoin ?? 0,
                lesson: att?.lesson ?? formData.lesson ?? null,
                mission: att?.mission ?? formData.mission ?? null,
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

  // Compute the actual calendar date from actual_day relative to the slot date's week
  const getActualDate = (slotDate: string, actualDay: string | null): Date => {
    const base = new Date(slotDate + 'T00:00:00');
    if (!actualDay) return base;
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const targetIdx = dayMap[actualDay.toLowerCase()];
    if (targetIdx === undefined) return base;
    const baseDay = base.getDay();
    const mondayOff = baseDay === 0 ? -6 : 1 - baseDay;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOff);
    const daysFromMon = targetIdx === 0 ? 6 : targetIdx - 1;
    const target = new Date(monday);
    target.setDate(monday.getDate() + daysFromMon);
    return target;
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
            {canCreate && (
              <Button
                onClick={() => openModal("add")}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4" />
                Take Attendance
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1120px] w-full table-fixed border-separate border-spacing-0">
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
                        col.key === "branch" && hideBranch && "hidden",
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
            <table className="min-w-[1120px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hideBranch ? columns.length - 1 : columns.length}
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
                          {row.hasExam && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Exam
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Branch */}
                      <td
                        className={cn("px-4 py-3", hideBranch && "hidden")}
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

                      {/* Day — always show enrollment slot day */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[4].width }}
                      >
                        {row.slotDay ?? "-"}
                      </td>

                      {/* Time — always show enrollment slot time */}
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
                        {row.existingAttendance
                          ? (row.existingAttendance.lesson || "-")
                          : (row.lastLesson || "-")}
                      </td>

                      {/* Mission */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[7].width }}
                      >
                        {row.existingAttendance
                          ? (row.existingAttendance.mission || "-")
                          : (row.lastMission || "-")}
                      </td>

                      {/* Last Activity */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[8].width }}
                      >
                        <span className="text-sm">
                          {row.existingAttendance
                            ? (row.existingAttendance.lastActivity || "-")
                            : (row.lastActivityText || "-")}
                        </span>
                      </td>

                      {/* Last Attendance — show actual day's date + time */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <span className="font-bold text-sm">
                          {row.existingAttendance
                            ? (() => {
                                const actualDate = getActualDate(row.existingAttendance.date, row.existingAttendance.actualDay);
                                const timeStr = row.existingAttendance.actualStartTime
                                  ? `, ${row.existingAttendance.actualStartTime.split(':').slice(0, 2).join(':')}`
                                  : '';
                                return `${format(actualDate, "do MMM yyyy")}${timeStr}`;
                              })()
                            : row.lastAttendanceDate
                              ? format(new Date(row.lastAttendanceDate), "do MMM yyyy")
                              : "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[10].width }}
                      >
                        {(() => {
                          const status = row.existingAttendance?.status ?? row.lastAttendanceStatus;
                          if (!status) return <span className="text-muted-foreground">-</span>;
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                status === "present" || status === "late"
                                  ? "bg-green-100 text-green-700"
                                  : status === "absent"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700",
                              )}
                            >
                              {status === "present" || status === "late"
                                ? "Present"
                                : status === "absent"
                                  ? "Absent"
                                  : status}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Attendance Actions */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[11].width }}
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={filteredData.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
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
        currentUserName={currentUserName}
      />
    </>
  );
}
