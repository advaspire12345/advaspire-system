"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBoundedLoader } from "@/hooks/use-bounded-loader";
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
  // Activities array from the most recent present/late attendance — used as
  // a hint on the table row. First entry's lesson/mission are surfaced in
  // the columns; the full list appears in the modal.
  lastActivities: { lesson: string; mission: string }[] | null;
  lastAdcoin: number;
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
    activities: { lesson: string; mission: string }[] | null;
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
  totalCount: number;
  instructors?: InstructorOption[];
  /** Function to fetch curriculum lessons for a course */
  fetchCurriculumLessons?: (courseId: string) => Promise<CurriculumLesson[]>;
  /** Whether the user can create attendance (shows "Take Attendance" button) */
  canCreate?: boolean;
  hideBranch?: boolean;
  /** If set, the instructor name is fixed (for instructor role — auto-fill, no dropdown) */
  currentUserName?: string;
  /** Slot options for the slot filter, built from the LMS scheduled slots (course_slots). */
  slotOptions?: { value: string; label: string; course: string; day: string; startTime: string; endTime: string }[];
}

const ITEMS_PER_PAGE = 10;

// Visible columns, in display order: Username, Slot, Date, Lesson,
// Exact Timing, Attendance. The body `<td>` blocks below are written
// positionally to match this exact order — keep them in sync.
const columns = [
  { key: "username", label: "Username", width: "160px" },
  { key: "slot", label: "Slot", width: "160px" },
  { key: "date", label: "Date", width: "130px", hideOnMobile: true },
  { key: "lesson", label: "Lesson", width: "120px", hideOnMobile: true },
  { key: "exactTiming", label: "Exact Timing", width: "110px", hideOnMobile: true },
  {
    key: "attendance",
    label: "Attendance",
    width: "100px",
    align: "center" as const,
  },
];

export function AttendanceTable({
  initialData,
  totalCount,
  instructors = [],
  fetchCurriculumLessons,
  canCreate = true,
  currentUserName,
  slotOptions = [],
}: AttendanceTableProps) {
  const router = useRouter();
  const [data, setData] = useState<AttendanceRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  // Bulk multi-select state: set of selected row ids, and in-flight flag.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  // Date filter defaults to today.
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedSlot, setSelectedSlot] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Bounded progressive loading via the shared hook.
  const { isLoadingMore } = useBoundedLoader<AttendanceRow>({
    initialData,
    totalCount,
    currentPage,
    searchTerm: searchQuery,
    itemsPerPage: ITEMS_PER_PAGE,
    apiUrl: useCallback((offset, limit) => `/api/attendance/table?offset=${offset}&limit=${limit}`, []),
    getId: useCallback((r: AttendanceRow) => r.id, []),
    setData,
  });

  // Sync data state when initialData changes (after page refresh)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Real-time sync: when a trial is created/edited/deleted on the trial page,
  // the mark-attendance row that mirrors it must reflect the change live without
  // a manual refresh. Subscribe to postgres_changes on the trials table and
  // refetch via router.refresh() — debounced so a burst of edits coalesces.
  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 400);
    };

    const channel = supabase
      .channel("attendance-trial-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trials" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Unified modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedRow, setSelectedRow] = useState<AttendanceRow | null>(null);

  // Store attendanceId per row so it survives server refresh even if slot matching fails
  const attendanceIdMapRef = useRef<Map<string, string>>(new Map());

  // Whether any client-side filter is active. When true, pagination operates
  // over the locally filtered set rather than the server-reported totalCount.
  const isFiltering = !!(searchQuery.trim() || selectedDate || selectedSlot);

  // Slot options come from the LMS scheduled slots (passed as a prop). Match an
  // attendance row to its slot by which window its slot_time falls into (so an
  // exact mark time like 15:32 still maps to the 3:00-4:30 PM slot).
  const findSlotOption = useCallback(
    (row: AttendanceRow) => {
      if (!row.slotDay || !row.slotTime) return undefined;
      const t = row.slotTime.split(":").slice(0, 2).join(":");
      const day = row.slotDay.toLowerCase();
      // Prefer an EXACT slot-start match (slot_time is saved as the slot's start);
      // fall back to window-containment only for legacy exact-time records. This
      // stops overlapping windows (e.g. 3:00-4:30 and 4:00-5:30) from mismatching.
      return (
        slotOptions.find((o) => o.course === row.courseName && o.day === day && o.startTime === t) ||
        slotOptions.find((o) => o.course === row.courseName && o.day === day && t >= o.startTime && t < o.endTime)
      );
    },
    [slotOptions],
  );

  // Filter data based on search, slot, and date filters (AND-applied)
  const filteredData = useMemo(() => {
    if (!isFiltering) return data;

    const query = searchQuery.trim().toLowerCase();
    return data.filter((row) => {
      if (
        query &&
        !(
          row.studentName.toLowerCase().includes(query) ||
          row.courseName.toLowerCase().includes(query) ||
          row.branchName.toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (selectedSlot) {
        const opt = findSlotOption(row);
        if (!opt || opt.value !== selectedSlot) return false;
      }
      if (selectedDate) {
        const rowDate = row.existingAttendance?.date ?? row.lastAttendanceDate;
        const normalized = rowDate ? rowDate.split("T")[0] : "";
        if (normalized !== selectedDate) return false;
      }
      return true;
    });
  }, [data, searchQuery, selectedSlot, selectedDate, isFiltering, findSlotOption]);

  // Pagination
  const totalPages = isFiltering
    ? Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
    : Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setCurrentPage(1);
  };

  const handleSlotChange = (value: string) => {
    setSelectedSlot(value);
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
            activities: null,
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
        // Activities — flexible array of {lesson, mission} pairs
        activities: (formData.activities ?? [])
          .filter((a) => a.lesson || a.mission)
          .map((a) => ({ lesson: a.lesson, mission: a.mission })),
        // Trial-specific fields
        instructorFeedback: formData.instructorFeedback || undefined,
        isTrial: formData.isTrial || false,
        // Existing attendance ID for updates
        attendanceId: formData.attendanceId || undefined,
        // Original slot info for permanent matching
        slotDay: formData.slotDay || undefined,
        slotTime: formData.slotTime || undefined,
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
                // These fields are no longer collected by the dialog; the server
                // persists them as null/0, so mirror that in the optimistic state.
                instructorName: att?.instructor_name ?? null,
                lastActivity: att?.last_activity ?? null,
                projectPhotos: att?.project_photos ?? null,
                notes: att?.notes ?? formData.notes ?? null,
                adcoin: att?.adcoin ?? 0,
                activities: att?.activities ?? (formData.activities && formData.activities.length > 0 ? formData.activities : null),
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

  // ── Bulk multi-select ──
  // Only rows on the current page are selectable via the header checkbox.
  const allPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.has(row.id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedData.forEach((row) => next.delete(row.id));
      } else {
        paginatedData.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  // Today's date as local YYYY-MM-DD.
  const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Bulk mark: persist an attendance for each selected row reusing the SAME
  // single-row endpoint (/api/attendance/mark). Today's date, the row's own
  // slot, Physical class type, no activities.
  const handleBulkMark = async (status: "present" | "absent") => {
    const rows = data.filter((r) => selectedIds.has(r.id));
    if (rows.length === 0) return;

    const verb = status === "present" ? "present" : "absent";
    if (
      !window.confirm(
        `Mark ${rows.length} selected student${rows.length === 1 ? "" : "s"} as ${verb} for today?`,
      )
    ) {
      return;
    }

    setBulkSubmitting(true);
    try {
      const date = todayLocal();
      let failures = 0;
      for (const row of rows) {
        try {
          const response = await fetch("/api/attendance/mark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollmentId: row.enrollmentId,
              date,
              status,
              classType: "Physical",
              activities: [],
              slotDay: row.slotDay || undefined,
              slotTime: row.slotTime || undefined,
            }),
          });
          if (!response.ok) {
            failures += 1;
            const err = await response.json().catch(() => ({}));
            console.error("Bulk mark failed for", row.studentName, err);
          }
        } catch (err) {
          failures += 1;
          console.error("Bulk mark error for", row.studentName, err);
        }
      }

      if (failures > 0) {
        window.alert(
          `${rows.length - failures} marked ${verb}. ${failures} could not be marked (they may already have attendance for this slot this week).`,
        );
      }

      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkSubmitting(false);
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

            {/* Date Filter */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className={cn(
                "h-[50px] rounded-lg border border-muted-foreground/30 bg-white px-4 text-sm",
                selectedDate && "font-semibold",
              )}
              aria-label="Filter by date"
            />

            {/* Slot Filter */}
            <select
              value={selectedSlot}
              onChange={(e) => handleSlotChange(e.target.value)}
              className={cn(
                "h-[50px] rounded-lg border border-muted-foreground/30 bg-white px-4 text-sm",
                selectedSlot && "font-semibold",
              )}
              aria-label="Filter by slot"
            >
              <option value="">All slots</option>
              {slotOptions.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>

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

          {/* Bulk Action Bar — shown when at least one row is selected */}
          {canCreate && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-6 py-4">
              <span className="text-sm font-bold text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleBulkMark("absent")}
                  disabled={bulkSubmitting}
                  className="bg-[#fd434f] hover:bg-[#fd434f]/90 text-white font-bold h-[44px] px-5 disabled:opacity-60"
                >
                  <UserX className="h-4 w-4" />
                  {bulkSubmitting ? "Marking..." : `Mark Absent (${selectedIds.size})`}
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkSubmitting}
                  className="text-sm font-medium text-muted-foreground underline disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="md:min-w-[1120px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {canCreate && (
                    <th
                      className="hidden md:table-cell bg-transparent px-4 py-3 text-center rounded-tl-lg"
                      style={{ width: "48px", minWidth: "48px", maxWidth: "48px" }}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-[#615DFA]"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                  )}
                  {columns.map((col, idx) => {
                    return (
                    <th
                      key={col.key}
                      className={cn(
                        "bg-transparent px-4 py-3 text-left text-base font-bold text-foreground",
                        idx === 0 && !canCreate && "rounded-tl-lg",
                        idx === columns.length - 1 && "rounded-tr-lg",
                        col.align === "center" && "text-center",
                        col.hideOnMobile && "hidden md:table-cell",
                      )}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                      }}
                    >
                      {col.label}
                    </th>
                    );
                  })}
                </tr>
              </thead>
            </table>

            {/* Body Table */}
            <table className="md:min-w-[1120px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (canCreate ? 1 : 0)}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
                          Loading students...
                        </div>
                      ) : (
                        "No students found."
                      )}
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
                      {/* Selection checkbox */}
                      {canCreate && (
                        <td
                          className="hidden md:table-cell px-4 py-3 text-center"
                          style={{ width: "48px" }}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-[#615DFA]"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            aria-label={`Select ${row.studentName}`}
                          />
                        </td>
                      )}

                      {/* Username */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[0].width }}
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

                      {/* Slot — shown with the SAME label as the slot filter so the
                          column values line up with the filter options. */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[1].width }}
                      >
                        {(() => {
                          const opt = findSlotOption(row);
                          if (opt) return opt.label;
                          return row.slotDay ? `${row.courseName} · ${row.slotDay} ${formatTime(row.slotTime, null)}` : "-";
                        })()}
                      </td>

                      {/* Date — the attendance date */}
                      <td
                        className="hidden md:table-cell px-4 py-3 font-bold text-sm"
                        style={{ width: columns[2].width }}
                      >
                        {(() => {
                          const rawDate = row.existingAttendance?.date ?? row.lastAttendanceDate;
                          if (!rawDate) return "-";
                          const normalized = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
                          const parsed = new Date(`${normalized}T00:00:00`);
                          return isNaN(parsed.getTime())
                            ? normalized
                            : format(parsed, "do MMM yyyy");
                        })()}
                      </td>

                      {/* Lesson — show all activities stacked. */}
                      <td
                        className="hidden md:table-cell px-4 py-3"
                        style={{ width: columns[3].width }}
                      >
                        <AttendanceActivityCell
                          activities={row.existingAttendance?.activities ?? row.lastActivities}
                          field="lesson"
                        />
                      </td>

                      {/* Exact Timing — the exact marking time */}
                      <td
                        className="hidden md:table-cell px-4 py-3 text-sm"
                        style={{ width: columns[4].width }}
                      >
                        {(() => {
                          const exact = row.existingAttendance?.actualStartTime;
                          if (!exact) return "-";
                          return formatTime(exact, null);
                        })()}
                      </td>

                      {/* Attendance Actions */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[5].width }}
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

          {isLoadingMore && paginatedData.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <div className="h-3 w-3 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
              Loading more attendance data...
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={isFiltering ? filteredData.length : totalCount}
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
        allStudents={data}
        selectedRow={selectedRow}
        instructors={instructors}
        onSubmit={handleModalSubmit}
        fetchCurriculumLessons={fetchCurriculumLessons}
        currentUserName={currentUserName}
      />
    </>
  );
}

/**
 * Renders one column (lesson or mission) of a multi-activity attendance row.
 * If the activities array is empty / null, shows "-". Multiple activities
 * render stacked, one per line. The first line uses default text; subsequent
 * lines are muted so the eye picks out the primary at a glance.
 */
function AttendanceActivityCell({
  activities,
  field,
}: {
  activities: { lesson: string; mission: string }[] | null | undefined;
  field: "lesson" | "mission";
}) {
  const list = (activities ?? []).filter((a) => a[field]);
  if (list.length === 0) return <>-</>;
  return (
    <div className="leading-tight">
      {list.map((a, i) => (
        <div
          key={i}
          className={i === 0 ? "text-sm" : "text-xs text-muted-foreground"}
        >
          {a[field]}
        </div>
      ))}
    </div>
  );
}
