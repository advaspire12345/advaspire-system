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
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
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
  { key: "lesson", label: "Lesson", width: "120px" },
  { key: "mission", label: "Mission", width: "100px" },
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

export function AttendanceLogTable({
  initialData,
  totalCount,
  instructors = [],
  hideBranch,
  canEdit = true,
  canDelete = true,
  initialStartDate,
  initialEndDate,
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<LogModalMode>("edit");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceLogRow | null>(
    null,
  );

  // Filter data based on search and status, then sort by latest date + time
  // so the most recent attendance shows first regardless of batch order.
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

    return [...result].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1; // latest date first
      const aT = a.actualStartTime ?? "";
      const bT = b.actualStartTime ?? "";
      if (aT !== bT) return aT < bT ? 1 : -1; // latest time first
      return a.studentName.localeCompare(b.studentName);
    });
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
                        col.key === "branch" && hideBranch && "hidden",
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
            <table className="min-w-[1350px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                        className={cn("px-4 py-3", hideBranch && "hidden")}
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
                        {formatDate(row.date, row.dayOfWeek)}
                      </td>

                      {/* Day — prefer the explicit actual_day if set (a
                          make-up class on a non-scheduled day), else derive
                          from the attendance date itself so the column always
                          has something to show. */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {row.dayOfWeek ?? (
                          row.date
                            ? new Date(row.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
                            : "-"
                        )}
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

                      {/* Lesson — one line per activity stacked. */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <ActivityLogCell activities={row.activities} field="lesson" maxLength={15} />
                      </td>

                      {/* Mission — one line per activity stacked. */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[10].width }}
                      >
                        <ActivityLogCell activities={row.activities} field="mission" maxLength={12} />
                      </td>

                      {/* Activity */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[11].width }}
                      >
                        <TruncatedText text={row.lastActivity} maxLength={15} />
                      </td>

                      {/* Adcoin */}
                      <td
                        className="px-4 py-3 text-center font-bold text-[#23d2e2]"
                        style={{ width: columns[12].width }}
                      >
                        {row.adcoin ?? 0}
                      </td>

                      {/* PIC (Instructor/Marked By) */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[13].width }}
                      >
                        <TruncatedText
                          text={row.instructorName ?? row.markedBy}
                          maxLength={12}
                        />
                      </td>

                      {/* Actions — attendance history is immutable except student name */}
                      <td
                        className={cn("px-4 py-3", !canEdit && "hidden")}
                        style={{ width: columns[14].width }}
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
