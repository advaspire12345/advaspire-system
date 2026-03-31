"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";
import type { StudentTableRow } from "@/data/students";
import { BranchOption, CourseOption } from "@/components/trial/trial-modal";
import { parseISO, format } from "date-fns";
import { StudentModal } from "@/components/student/student-modal";
import type { StudentFormData, CoursePricingOption, CourseSlotOption, ParentOption, StudentSelectOption } from "@/components/student/student-modal";
import type { StudentFormPayload } from "@/app/(dashboard)/student/actions";

interface StudentTableProps {
  initialData: StudentTableRow[];
  branches: BranchOption[];
  courses: CourseOption[];
  coursePricing: CoursePricingOption[];
  courseSlots: CourseSlotOption[];
  parents: ParentOption[];
  onAdd?: (payload: StudentFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (studentId: string, payload: StudentFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (studentId: string) => Promise<{ success: boolean; error?: string }>;
  hideBranch?: boolean;
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "photo", label: "Photo", width: "60px" },
  { key: "name", label: "Student", width: "140px" },
  { key: "studentId", label: "Student ID", width: "100px" },
  { key: "age", label: "Age", width: "50px", align: "center" as const },
  { key: "schoolName", label: "School", width: "120px" },
  { key: "branch", label: "Branch", width: "100px" },
  { key: "program", label: "Program", width: "130px" },
  { key: "level", label: "Level", width: "60px", align: "center" as const },
  { key: "adcoin", label: "AdCoins", width: "80px", align: "center" as const },
  { key: "packageType", label: "Package", width: "110px" },
  { key: "periodActive", label: "Period Active", width: "140px" },
  { key: "attend", label: "Attend", width: "70px", align: "center" as const },
  { key: "paymentCount", label: "Payment Settled", width: "120px" },
  { key: "schedule", label: "Schedule", width: "110px" },
  { key: "contact", label: "Contact", width: "110px" },
  { key: "city", label: "City", width: "90px" },
  { key: "status", label: "Status", width: "80px", align: "center" as const },
  { key: "action", label: "Action", width: "90px", align: "center" as const },
];

const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-700",
};

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function StudentTable({
  initialData,
  branches,
  courses,
  coursePricing,
  courseSlots,
  parents,
  onAdd,
  onEdit,
  onDelete,
  hideBranch,
}: StudentTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Build student select options from initialData (deduplicated by student id)
  const studentSelectOptions: StudentSelectOption[] = useMemo(() => {
    const studentMap = new Map<string, StudentSelectOption>();
    for (const row of initialData) {
      const existing = studentMap.get(row.id);
      if (existing) {
        if (row.courseId && !existing.enrolledCourseIds.includes(row.courseId)) {
          existing.enrolledCourseIds.push(row.courseId);
        }
      } else {
        studentMap.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          schoolName: row.schoolName,
          photo: row.photo,
          coverPhoto: row.coverPhoto,
          branchId: row.branchId,
          level: row.level,
          adcoinBalance: row.adcoinBalance,
          studentId: row.studentId,
          enrolledCourseIds: row.courseId ? [row.courseId] : [],
          parentId: row.parentId,
          parentRelationship: row.parentRelationship,
        });
      }
    }
    return Array.from(studentMap.values());
  }, [initialData]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<StudentTableRow | null>(
    null,
  );

  // Convert StudentFormData to StudentFormPayload
  // Photos are uploaded immediately via API and URLs are stored in formData
  const convertToPayload = (formData: StudentFormData): StudentFormPayload => ({
    existingStudentId: formData.existingStudentId,
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    photoUrl: formData.photoUrl,
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    schoolName: formData.schoolName,
    coverPhotoUrl: formData.coverPhotoUrl,
    studentId: formData.studentId,
    level: formData.level,
    adcoinBalance: formData.adcoinBalance,
    parentId: formData.parentId,
    parentName: formData.parentName,
    parentPhone: formData.parentPhone,
    parentEmail: formData.parentEmail,
    parentRelationship: formData.parentRelationship,
    parentAddress: formData.parentAddress,
    parentPostcode: formData.parentPostcode,
    parentCity: formData.parentCity,
    branchId: formData.branchId,
    courseId: formData.courseId,
    instructorId: formData.instructorId,
    packageId: formData.packageId,
    packageType: formData.packageType,
    numberOfMonths: formData.numberOfMonths,
    numberOfSessions: formData.numberOfSessions,
    scheduleEntries: formData.scheduleEntries,
    shareWithSibling: formData.shareWithSibling,
    existingPoolId: formData.existingPoolId,
    enrollmentStatus: formData.enrollmentStatus,
    notes: formData.notes,
  });

  const handleAdd = async (formData: StudentFormData) => {
    if (!onAdd) return;
    const payload = convertToPayload(formData);
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create student");
    }
    router.refresh();
  };

  const handleEdit = async (formData: StudentFormData) => {
    if (!onEdit) return;
    if (!selectedRecord) return;
    const payload = convertToPayload(formData);
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update student");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete student");
    }
    router.refresh();
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return initialData;

    const query = searchQuery.toLowerCase();
    return initialData.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.email?.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        row.programName?.toLowerCase().includes(query),
    );
  }, [initialData, searchQuery]);

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

  // Open modal handlers
  const openAddModal = () => {
    setSelectedRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  const openEditModal = (record: StudentTableRow) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (record: StudentTableRow) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return "-";
    try {
      const birthDate = parseISO(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return "-";
    }
  };

  // Format schedule display as "Day: Time" for each entry
  const formatSchedule = (days: string[], time: string | null) => {
    if (days.length === 0 && !time) return "-";

    // Parse times (comma-separated like "17:00:00, 09:00:00")
    const times = time ? time.split(',').map((t) => t.trim()) : [];

    // Format time to HH:MM (remove seconds)
    const formatTime = (t: string) => {
      if (!t) return "";
      const parts = t.split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
    };

    // Capitalize first letter of day
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    // Build "Day: Time" entries
    const entries = days.map((day, index) => {
      const dayFormatted = capitalize(day.substring(0, 3));
      const timeFormatted = formatTime(times[index] || "");
      return timeFormatted ? `${dayFormatted}: ${timeFormatted}` : dayFormatted;
    });

    return (
      <div className="space-y-0.5">
        {entries.map((entry, index) => (
          <div key={index} className="text-sm">{entry}</div>
        ))}
      </div>
    );
  };

  // Format period active display based on package type
  const formatPeriodActive = (row: StudentTableRow) => {
    if (!row.packageType) return "-";

    const sessions = row.sessionsRemaining ?? 0;

    // For MONTHLY packages — show date only
    if (row.packageType === "monthly") {
      if (row.periodStart && row.periodEnd) {
        try {
          const startDate = parseISO(row.periodStart);
          const endDate = parseISO(row.periodEnd);
          return (
            <span className="font-medium text-xs">
              {format(startDate, "d/M")} - {format(endDate, "d/M")}
            </span>
          );
        } catch {
          return "-";
        }
      }
      return (
        <span className="text-amber-500 text-xs font-medium">Pending</span>
      );
    }

    // For SESSION packages — show sessions count
    if (row.packageType === "session") {
      if (sessions < 0) {
        return (
          <span className="text-red-500 text-sm font-medium">
            {sessions} session{Math.abs(sessions) !== 1 ? "s" : ""}
          </span>
        );
      } else if (sessions === 0) {
        return (
          <span className="text-red-500 text-sm font-medium">0 sessions</span>
        );
      } else {
        return (
          <span className="text-[#615DFA] text-sm font-medium">
            {sessions} session{sessions !== 1 ? "s" : ""}
          </span>
        );
      }
    }

    return "-";
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search and Action Row - EXACT MATCH TO TRIAL TABLE */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, email, branch or program..."
            />
            {onAdd && (
              <Button
                onClick={openAddModal}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            )}
          </div>

          {/* Table - EXACT STRUCTURE MATCH TO TRIAL TABLE */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1830px] w-full table-fixed border-separate border-spacing-0">
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
                        col.align === "right" && "text-right",
                        col.key === "branch" && hideBranch && "hidden",
                        col.key === "action" && !onEdit && !onDelete && "hidden",
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

            {/* Body Table - EXACT STYLING MATCH */}
            <table className="min-w-[1830px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                  paginatedData.map((row, rowIdx) => (
                    <tr
                      key={`${row.id}-${row.enrollmentId || 'no-enrollment'}`}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedData.length - 1 &&
                          "rounded-bl-lg rounded-br-lg",
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
                              imageUrl={row.photo ?? undefined}
                              percentage={0.5}
                              animated={false}
                              fallbackInitials={row.name.charAt(0)}
                              cornerRadius={8}
                            />
                            <div className="absolute -bottom-1 -right-1 z-10">
                              <HexagonNumberBadge value={row.level} size={22} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td
                        className="px-3 py-2 font-bold truncate"
                        style={{ width: columns[1].width }}
                      >
                        {row.name}
                      </td>

                      {/* Student ID */}
                      <td
                        className="px-3 py-2 text-xs text-muted-foreground"
                        style={{ width: columns[2].width }}
                      >
                        {row.studentId || "-"}
                      </td>

                      {/* Age */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[3].width }}
                      >
                        {calculateAge(row.dateOfBirth)}
                      </td>

                      {/* School Name */}
                      <td
                        className="px-3 py-2 text-sm truncate"
                        style={{ width: columns[4].width }}
                      >
                        {row.schoolName || "-"}
                      </td>

                      {/* Branch */}
                      <td
                        className={cn("px-3 py-2 text-sm", hideBranch && "hidden")}
                        style={{ width: columns[5].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Program */}
                      <td
                        className="px-3 py-2 font-medium text-sm truncate"
                        style={{ width: columns[6].width }}
                      >
                        {row.programName ?? "-"}
                      </td>

                      {/* Level */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[7].width }}
                      >
                        {row.level}
                      </td>

                      {/* AdCoins */}
                      <td
                        className="px-3 py-2 text-center font-bold text-[#615DFA]"
                        style={{ width: columns[8].width }}
                      >
                        {row.adcoinBalance.toLocaleString()}
                      </td>

                      {/* Package Type */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[9].width }}
                      >
                        {row.packageType && row.packageDuration ? (
                          <span className="font-medium">
                            {row.packageDuration} {row.packageType === "session" ? "session" : "month"}
                            {row.packageDuration !== 1 ? "s" : ""}
                          </span>
                        ) : row.packageType ? (
                          <span className="capitalize">{row.packageType}</span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Period Active */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[10].width }}
                      >
                        {formatPeriodActive(row)}
                      </td>

                      {/* Attend - Total sessions attended */}
                      <td
                        className="px-3 py-2 text-center font-medium text-[#23D2E2]"
                        style={{ width: columns[11].width }}
                      >
                        {row.sessionCount}
                      </td>

                      {/* Payment Settled */}
                      <td
                        className="px-3 py-2 text-xs"
                        style={{ width: columns[12].width }}
                      >
                        <div className="space-y-0.5">
                          <div className="font-medium text-green-600">
                            RM{(row.paymentCount?.totalPaid ?? 0).toLocaleString()}
                          </div>
                          <div className="text-muted-foreground">
                            {row.paymentCount?.totalSessionsBought ?? 0} sessions
                          </div>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td
                        className="px-3 py-2 text-xs"
                        style={{ width: columns[13].width }}
                      >
                        {formatSchedule(row.scheduleDays, row.scheduleTime)}
                      </td>

                      {/* Contact */}
                      <td
                        className="px-3 py-2 text-sm"
                        style={{ width: columns[14].width }}
                      >
                        {row.parentPhone || "-"}
                      </td>

                      {/* City */}
                      <td
                        className="px-3 py-2 text-sm capitalize"
                        style={{ width: columns[15].width }}
                      >
                        {row.parentCity || "-"}
                      </td>

                      {/* Status — auto-derived for session packages based on sessions */}
                      <td
                        className="px-3 py-2 text-center"
                        style={{ width: columns[16].width }}
                      >
                        {(() => {
                          const sessions = row.sessionsRemaining ?? 0;
                          // For session packages: override status based on session count
                          const autoStatus =
                            row.packageType === "session"
                              ? sessions > 0 ? "active" : "pending"
                              : row.enrollmentStatus;
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                autoStatus
                                  ? ENROLLMENT_STATUS_STYLES[autoStatus] ?? "bg-gray-100 text-gray-700"
                                  : "bg-gray-100 text-gray-700",
                              )}
                            >
                              {autoStatus
                                ? ENROLLMENT_STATUS_LABELS[autoStatus] ?? autoStatus
                                : "None"}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Action */}
                      <td
                        className={cn("px-3 py-2", !onEdit && !onDelete && "hidden")}
                        style={{ width: columns[17].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit student ${row.name}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                              aria-label={`Delete student ${row.name}`}
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

          {/* Pagination - EXACT MATCH */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={filteredData.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Modal stub - matches trial modal structure */}
      <StudentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        courses={courses}
        coursePricing={coursePricing}
        courseSlots={courseSlots}
        parents={parents}
        students={studentSelectOptions}
        mode={modalMode}
        record={selectedRecord}
        branches={branches}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
