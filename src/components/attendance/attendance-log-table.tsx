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

  // Progressive loading: load remaining data in background
  const [loadTotal, setLoadTotal] = useState(totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(initialData.length < totalCount);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAllData = useCallback(async (
    startOffset: number,
    existingRows: AttendanceLogRow[],
    total: number,
    filterStartDate?: string,
    filterEndDate?: string,
  ) => {
    let offset = startOffset;
    const existingIds = new Set(existingRows.map((r) => r.id));

    const params = new URLSearchParams();
    if (filterStartDate) params.set("startDate", filterStartDate);
    if (filterEndDate) params.set("endDate", filterEndDate);

    // Create abort controller for this fetch sequence
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    while (offset < total) {
      if (controller.signal.aborted) return;
      try {
        const dateParams = params.toString();
        const res = await fetch(
          `/api/attendance-log/table?offset=${offset}&limit=10${dateParams ? `&${dateParams}` : ""}`,
          { signal: controller.signal }
        );
        if (!res.ok) break;
        const result: { rows: AttendanceLogRow[] } = await res.json();
        if (!result.rows || result.rows.length === 0) break;

        const newRows = result.rows.filter((r) => !existingIds.has(r.id));
        for (const r of result.rows) existingIds.add(r.id);

        if (newRows.length > 0) {
          setData((prev) => [...prev, ...newRows]);
        }
        offset += 10;
      } catch {
        break;
      }
    }
    if (!controller.signal.aborted) {
      setIsLoadingMore(false);
    }
  }, []);

  // Initial progressive load on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (initialData.length < totalCount) {
      fetchAllData(initialData.length, initialData, totalCount, initialStartDate, initialEndDate);
    }
  }, [initialData, totalCount, initialStartDate, initialEndDate, fetchAllData]);

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

  // Re-fetch data from API with given date filters (no page refresh)
  const refetchWithDates = useCallback(async (filterStart?: string, filterEnd?: string) => {
    // Abort any in-progress fetch
    abortRef.current?.abort();
    setData([]);
    setCurrentPage(1);
    setIsLoadingMore(true);
    setActiveStartDate(filterStart);
    setActiveEndDate(filterEnd);

    const params = new URLSearchParams();
    if (filterStart) params.set("startDate", filterStart);
    if (filterEnd) params.set("endDate", filterEnd);
    const dateParams = params.toString();

    try {
      const res = await fetch(`/api/attendance-log/table?offset=0&limit=10${dateParams ? `&${dateParams}` : ""}`);
      if (!res.ok) { setIsLoadingMore(false); return; }
      const result: { rows: AttendanceLogRow[]; totalCount: number } = await res.json();
      const rows = result.rows ?? [];
      const newTotal = result.totalCount ?? 0;
      setData(rows);
      setLoadTotal(newTotal);
      if (rows.length < newTotal) {
        fetchAllData(rows.length, rows, newTotal, filterStart, filterEnd);
      } else {
        setIsLoadingMore(false);
      }
    } catch {
      setIsLoadingMore(false);
    }
  }, [fetchAllData]);

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
        adcoin: formData.adcoin,
        lesson: formData.lesson,
        mission: formData.mission,
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
                  adcoin: formData.adcoin,
                  lesson: formData.lesson,
                  mission: formData.mission,
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

                      {/* Lesson */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <TruncatedText text={row.lesson} maxLength={15} />
                      </td>

                      {/* Mission */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[10].width }}
                      >
                        <TruncatedText text={row.mission} maxLength={12} />
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

                      {/* Actions */}
                      <td
                        className={cn("px-4 py-3", !canEdit && !canDelete && "hidden")}
                        style={{ width: columns[14].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openModal("edit", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit attendance for ${row.studentName}`}
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => openModal("delete", row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label={`Delete attendance for ${row.studentName}`}
                              title="Delete"
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
            totalResults={filteredData.length}
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
