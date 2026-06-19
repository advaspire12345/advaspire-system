"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Pencil,
  Trash2,
  CalendarIcon,
  X,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AttendanceLogModal,
  type LogModalMode,
  type AttendanceLogFormData,
} from "@/components/attendance/attendance-log-modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AttendanceLogRow } from "@/data/attendance";
import type { AttendanceStatus } from "@/db/schema";
import {
  updateAttendanceLogAction,
  deleteAttendanceLogAction,
  deleteAttendanceLogBulkAction,
} from "@/app/(dashboard)/attendance-log/actions";

interface InstructorOption {
  id: string;
  name: string;
}

interface AttendanceLogTableProps {
  initialData: AttendanceLogRow[];
  totalCount: number;
  instructors?: InstructorOption[];
  hideBranch?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  /** Slot options for matching the slot window label, built from the LMS scheduled slots (course_slots). */
  slotOptions?: { value: string; label: string; course: string; day: string; startTime: string; endTime: string }[];
}

const ITEMS_PER_PAGE = 10;

type StatusFilter = "All" | "Present" | "Absent";
const STATUS_FILTERS: StatusFilter[] = ["All", "Present", "Absent"];

// Visible data columns, in display order: Username, Slot, Date, Lesson,
// Exact Timing, Attendance, Actions — mirroring the Mark Attendance table.
// The body `<td>` blocks below are written positionally to match this exact
// order — keep them in sync. (A bulk-select checkbox column is rendered
// separately as the first column when canDelete is set.)
const columns = [
  { key: "username", label: "Username", width: "160px" },
  { key: "slot", label: "Slot", width: "200px" },
  { key: "date", label: "Date", width: "130px", hideOnMobile: true },
  { key: "lesson", label: "Lesson", width: "140px", hideOnMobile: true },
  { key: "exactTiming", label: "Exact Timing", width: "110px", hideOnMobile: true },
  {
    key: "attendance",
    label: "Attendance",
    width: "100px",
    align: "center" as const,
  },
  {
    key: "actions",
    label: "Actions",
    width: "100px",
    align: "center" as const,
    hideOnMobile: true,
  },
];

export function AttendanceLogTable({
  initialData,
  totalCount,
  instructors = [],
  canEdit = true,
  canDelete = true,
  initialStartDate,
  initialEndDate,
  slotOptions = [],
}: AttendanceLogTableProps) {
  const [data, setData] = useState<AttendanceLogRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Date filter state
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate ? new Date(initialStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate ? new Date(initialEndDate) : undefined
  );
  // Track the active (applied) date filter for progressive loading
  const [activeStartDate, setActiveStartDate] = useState<string | undefined>(initialStartDate);
  const [activeEndDate, setActiveEndDate] = useState<string | undefined>(initialEndDate);

  // Bounded progressive loading. The attendance-log API returns enrollment
  // rows + trial rows separately (trials only on offset=0), so we can't use
  // the generic useBoundedLoader hook — offset accounting must advance by
  // enrollmentRows.length, not by the merged batch size. Same AbortController
  // pattern as the hook though: each effect run cancels the previous, no
  // shared fetchingRef means no race-condition stall.
  const INITIAL_LOAD_CAP = 100;
  const [loadTotal, setLoadTotal] = useState(totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadedUpToRef = useRef(initialData.filter((r) => r.type === 'enrollment').length);
  const seenIdsRef = useRef(new Set(initialData.map((r) => r.id)));
  const abortRef = useRef<AbortController | null>(null);

  const target = (() => {
    if (searchQuery.trim().length > 0) return loadTotal;
    const pageRowCount = currentPage * ITEMS_PER_PAGE;
    const blockEnd = Math.max(INITIAL_LOAD_CAP, Math.ceil(pageRowCount / INITIAL_LOAD_CAP) * INITIAL_LOAD_CAP);
    return Math.min(blockEnd, loadTotal);
  })();

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (loadedUpToRef.current >= target) {
      setIsLoadingMore(false);
      return;
    }

    setIsLoadingMore(true);

    (async () => {
      const params = new URLSearchParams();
      if (activeStartDate) params.set("startDate", activeStartDate);
      if (activeEndDate) params.set("endDate", activeEndDate);

      try {
        while (loadedUpToRef.current < target && !controller.signal.aborted) {
          const offset = loadedUpToRef.current;
          const dateParams = params.toString();
          const res = await fetch(
            `/api/attendance-log/table?offset=${offset}&limit=10${dateParams ? `&${dateParams}` : ""}`,
            { signal: controller.signal }
          );
          if (!res.ok) break;
          const result: {
            rows: AttendanceLogRow[];
            enrollmentRows?: AttendanceLogRow[];
            trialRows?: AttendanceLogRow[];
          } = await res.json();
          const enrollmentRows = result.enrollmentRows ?? result.rows ?? [];
          const trialRows = result.trialRows ?? [];
          const allFromBatch = [...enrollmentRows, ...trialRows];
          if (enrollmentRows.length === 0) {
            loadedUpToRef.current = target;
            break;
          }
          const newRows = allFromBatch.filter((r) => !seenIdsRef.current.has(r.id));
          for (const r of allFromBatch) seenIdsRef.current.add(r.id);
          if (!controller.signal.aborted && newRows.length > 0) {
            setData((prev) => [...prev, ...newRows]);
          }
          loadedUpToRef.current = offset + enrollmentRows.length;
          if (enrollmentRows.length < 10) break;
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[attendance-log loader] fetch failed:", err);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingMore(false);
      }
    })();

    return () => controller.abort();
  }, [target, activeStartDate, activeEndDate]);

  // Bulk-selection state — set of selected row ids.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
  const totalPages = searchQuery.trim()
    ? Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
    : Math.max(1, Math.ceil(loadTotal / ITEMS_PER_PAGE));
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

  // Re-fetch data from API with given date filters (no page refresh).
  // Resets bounded loader and loads the first 10; the bounded effect tops
  // it up to INITIAL_LOAD_CAP automatically because activeStart/End change.
  const refetchWithDates = useCallback(async (filterStart?: string, filterEnd?: string) => {
    abortRef.current?.abort();
    setData([]);
    setCurrentPage(1);
    setIsLoadingMore(true);
    setActiveStartDate(filterStart);
    setActiveEndDate(filterEnd);
    loadedUpToRef.current = 0;
    seenIdsRef.current = new Set();

    const params = new URLSearchParams();
    if (filterStart) params.set("startDate", filterStart);
    if (filterEnd) params.set("endDate", filterEnd);
    const dateParams = params.toString();

    try {
      const res = await fetch(`/api/attendance-log/table?offset=0&limit=10${dateParams ? `&${dateParams}` : ""}`);
      if (!res.ok) { setIsLoadingMore(false); return; }
      const result: {
        rows: AttendanceLogRow[];
        enrollmentRows?: AttendanceLogRow[];
        trialRows?: AttendanceLogRow[];
        totalCount: number;
      } = await res.json();
      const enrollmentRows = result.enrollmentRows ?? result.rows ?? [];
      const trialRows = result.trialRows ?? [];
      const merged = [...enrollmentRows, ...trialRows];
      const newTotal = result.totalCount ?? 0;
      setData(merged);
      for (const r of merged) seenIdsRef.current.add(r.id);
      loadedUpToRef.current = enrollmentRows.length;
      setLoadTotal(newTotal);
      setIsLoadingMore(false);
    } catch {
      setIsLoadingMore(false);
    }
  }, []);

  // Apply date filter
  const applyDateFilter = useCallback(() => {
    const s = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const e = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
    refetchWithDates(s, e);
  }, [startDate, endDate, refetchWithDates]);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    // Only re-fetch if a date filter was active
    if (activeStartDate || activeEndDate) {
      refetchWithDates(undefined, undefined);
    }
  }, [activeStartDate, activeEndDate, refetchWithDates]);

  // Open modal with specific mode
  const openModal = (mode: LogModalMode, record: AttendanceLogRow) => {
    setModalMode(mode);
    setSelectedRecord(record);
    setModalOpen(true);
  };

  // Handle update — attendance history is immutable except for the student name.
  const handleUpdate = useCallback(
    async (formData: AttendanceLogFormData) => {
      if (!selectedRecord) return;

      const result = await updateAttendanceLogAction(selectedRecord.id, {
        studentName: formData.studentName,
      });

      if (result.success) {
        const renamedStudentId = selectedRecord.studentId;
        setData((prev) =>
          prev.map((item) =>
            item.studentId === renamedStudentId
              ? { ...item, studentName: formData.studentName }
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

  // --- Bulk selection helpers ---
  // Toggle a single row's selection.
  const toggleRowSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select-all toggles all currently-visible (paginated) rows.
  const visibleIds = useMemo(
    () => paginatedData.map((row) => row.id),
    [paginatedData],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }, [visibleIds]);

  // Bulk delete selected rows after confirmation.
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} selected attendance record${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const result = await deleteAttendanceLogBulkAction(ids);
      if (result.success) {
        const deletedSet = new Set(ids);
        setData((prev) => prev.filter((item) => !deletedSet.has(item.id)));
        setSelectedIds(new Set());
      } else {
        console.error("Failed to bulk delete:", result.error);
        window.alert(result.error ?? "Failed to delete selected records");
      }
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      window.alert("Failed to delete selected records");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds]);

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

  // Format date display — show actual day's date, not slot date
  const formatDate = (slotDate: string, actualDay: string | null) => {
    const actualDate = getActualDate(slotDate, actualDay);
    return format(actualDate, "do MMM yyyy");
  };

  // Format time display
  const formatTime = (time: string | null) => {
    if (!time) return "-";
    const parts = time.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  // Match an attendance row to its LMS scheduled-slot window so the Slot column
  // shows the SAME label as the Mark page (e.g. "EV3 · Friday 3:00 PM - 4:30 PM").
  // Prefer an EXACT slot-start match (slot_time is saved as the slot's start);
  // fall back to window-containment only for legacy exact-time records.
  const findSlotOption = useCallback(
    (row: AttendanceLogRow) => {
      if (!row.slotDay || !row.slotTime) return undefined;
      const t = row.slotTime.split(":").slice(0, 2).join(":");
      const day = row.slotDay.toLowerCase();
      return (
        slotOptions.find((o) => o.course === row.courseName && o.day === day && o.startTime === t) ||
        slotOptions.find((o) => o.course === row.courseName && o.day === day && t >= o.startTime && t < o.endTime)
      );
    },
    [slotOptions],
  );

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
          {/* Search, Filter and Date Range Row */}
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

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="relative w-[130px]">
                    <div
                      className={cn(
                        "peer w-full h-[50px] rounded-lg border border-muted-foreground/30 bg-transparent px-4 pr-10 flex items-center text-sm font-semibold text-foreground transition-colors cursor-pointer",
                        "hover:border-[#23D2E2] focus:border-[#23D2E2] focus:outline-none",
                        !startDate && "text-transparent"
                      )}
                    >
                      {startDate ? format(startDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </div>
                    <label
                      className={cn(
                        "pointer-events-none absolute left-3 bg-white px-1 font-semibold text-muted-foreground transition-all",
                        startDate
                          ? "-top-2.5 text-xs"
                          : "top-1/2 -translate-y-1/2 text-sm"
                      )}
                    >
                      From
                    </label>
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="relative w-[130px]">
                    <div
                      className={cn(
                        "peer w-full h-[50px] rounded-lg border border-muted-foreground/30 bg-transparent px-4 pr-10 flex items-center text-sm font-semibold text-foreground transition-colors cursor-pointer",
                        "hover:border-[#23D2E2] focus:border-[#23D2E2] focus:outline-none",
                        !endDate && "text-transparent"
                      )}
                    >
                      {endDate ? format(endDate, "dd/MM/yyyy") : "dd/mm/yyyy"}
                    </div>
                    <label
                      className={cn(
                        "pointer-events-none absolute left-3 bg-white px-1 font-semibold text-muted-foreground transition-all",
                        endDate
                          ? "-top-2.5 text-xs"
                          : "top-1/2 -translate-y-1/2 text-sm"
                      )}
                    >
                      To
                    </label>
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>

              {/* Apply Filter Button */}
              <button
                type="button"
                onClick={applyDateFilter}
                className="h-[50px] w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
              >
                <Filter className="h-5 w-5 text-primary-foreground" />
              </button>

              {/* Clear Filter Button */}
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="h-[50px] w-12 flex items-center justify-center rounded-lg border border-muted-foreground/30 hover:bg-muted transition"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk actions bar */}
          {canDelete && (
            <div className="flex items-center justify-end px-1">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || isBulkDeleting}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition",
                  selectedIds.size === 0 || isBulkDeleting
                    ? "cursor-not-allowed border border-muted-foreground/30 text-muted-foreground/50"
                    : "bg-[#fd434f] text-white hover:bg-[#fd434f]/90",
                )}
              >
                {isBulkDeleting ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete selected ({selectedIds.size})
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="md:min-w-[988px] w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  {canDelete && (
                    <th
                      className="hidden md:table-cell bg-transparent px-4 py-3 text-center text-base font-bold text-foreground"
                      style={{ width: "48px", minWidth: "48px", maxWidth: "48px" }}
                    >
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all visible rows"
                        className="h-4 w-4 cursor-pointer accent-[#fd434f]"
                      />
                    </th>
                  )}
                  {columns.map((col, idx) => (
                    <th
                      key={col.key}
                      className={cn(
                        "bg-transparent px-4 py-3 text-left text-base font-bold text-foreground",
                        idx === 0 && !canDelete && "rounded-tl-lg",
                        idx === columns.length - 1 && "rounded-tr-lg",
                        col.align === "center" && "text-center",
                        col.hideOnMobile && "hidden md:table-cell",
                        col.key === "actions" && !canEdit && !canDelete && "hidden",
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
            <table className="md:min-w-[988px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (canDelete ? 1 : 0)}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
                          Loading attendance records...
                        </div>
                      ) : (
                        "No attendance records found."
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
                          "rounded-bl-lg rounded-br-lg",
                      )}
                    >
                      {/* Select checkbox */}
                      {canDelete && (
                        <td
                          className="hidden md:table-cell px-4 py-3 text-center"
                          style={{ width: "48px" }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRowSelection(row.id)}
                            aria-label={`Select attendance record for ${row.studentName}`}
                            className="h-4 w-4 cursor-pointer accent-[#fd434f]"
                          />
                        </td>
                      )}

                      {/* Username */}
                      <td
                        className="px-4 py-3 font-bold text-[#23d2e2]"
                        style={{ width: columns[0].width }}
                      >
                        <TruncatedText text={row.studentName} maxLength={18} />
                      </td>

                      {/* Slot — shown with the SAME label as the Mark page so the
                          column values line up with the scheduled slot window. */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[1].width }}
                      >
                        {(() => {
                          const opt = findSlotOption(row);
                          if (opt) return opt.label;
                          return row.slotDay
                            ? `${row.courseName} · ${row.slotDay} ${formatTime(row.slotTime)}`
                            : "-";
                        })()}
                      </td>

                      {/* Date — the record date */}
                      <td
                        className="hidden md:table-cell px-4 py-3 font-bold"
                        style={{ width: columns[2].width }}
                      >
                        {formatDate(row.date, row.dayOfWeek)}
                      </td>

                      {/* Lesson — one line per activity stacked. */}
                      <td
                        className="hidden md:table-cell px-4 py-3"
                        style={{ width: columns[3].width }}
                      >
                        <ActivityLogCell activities={row.activities} field="lesson" maxLength={18} />
                      </td>

                      {/* Exact Timing — the exact marking time */}
                      <td
                        className="hidden md:table-cell px-4 py-3"
                        style={{ width: columns[4].width }}
                      >
                        {formatTime(row.actualStartTime)}
                      </td>

                      {/* Attendance */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[5].width }}
                      >
                        {getStatusBadge(row.status)}
                      </td>

                      {/* Actions — history is immutable except student name; absent
                          records can be removed. */}
                      <td
                        className={cn("hidden md:table-cell px-4 py-3", !canEdit && !canDelete && "hidden")}
                        style={{ width: columns[6].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openModal("edit", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit student name for ${row.studentName}`}
                              title="Edit student name"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                          )}
                          {canDelete && row.status === "absent" && (
                            <button
                              type="button"
                              onClick={() => openModal("delete", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label={`Remove absence record for ${row.studentName}`}
                              title="Remove absence record"
                            >
                              <Trash2 className="h-5 w-5" />
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
              Loading more attendance logs...
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={searchQuery.trim() ? filteredData.length : loadTotal}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
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

/**
 * Renders the Lesson or Mission column of an attendance-log row. Multiple
 * activities show stacked — first line default, the rest muted. Inlines its
 * own truncation since the TruncatedText helper above lives inside a
 * component closure and isn't reachable from this module-scope helper.
 */
function ActivityLogCell({
  activities,
  field,
  maxLength,
}: {
  activities: { lesson: string; mission: string }[] | null | undefined;
  field: "lesson" | "mission";
  maxLength: number;
}) {
  const list = (activities ?? []).filter((a) => a[field]);
  const truncate = (s: string) => (s.length > maxLength ? s.slice(0, maxLength - 1) + "…" : s);
  if (list.length === 0) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <div className="leading-tight space-y-0.5">
      {list.map((a, i) => (
        <div
          key={i}
          className={i === 0 ? "text-sm" : "text-xs text-muted-foreground"}
          title={a[field]}
        >
          {truncate(a[field])}
        </div>
      ))}
    </div>
  );
}
