"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StudentTableRow } from "@/data/students";
import { BranchOption, CourseOption } from "@/components/trial/trial-modal";
import { format, parseISO } from "date-fns";
import { StudentModal } from "@/components/student/student-modal";
import type { StudentFormData } from "@/components/student/student-modal";
import type { StudentFormPayload } from "@/app/(dashboard)/student/actions";

interface StudentTableProps {
  initialData: StudentTableRow[];
  branches: BranchOption[];
  courses: CourseOption[];
  onAdd: (payload: StudentFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit: (studentId: string, payload: StudentFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete: (studentId: string) => Promise<{ success: boolean; error?: string }>;
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "photo", label: "Photo", width: "70px" },
  { key: "name", label: "Student", width: "180px" },
  { key: "email", label: "Email", width: "180px" },
  { key: "branch", label: "Branch", width: "140px" },
  { key: "program", label: "Program", width: "160px" },
  { key: "schedule", label: "Schedule", width: "130px" },
  { key: "enrollDate", label: "Enroll Date", width: "110px" },
  { key: "adcoin", label: "AdCoins", width: "90px", align: "center" as const },
  { key: "status", label: "Status", width: "90px", align: "center" as const },
  { key: "action", label: "Action", width: "100px", align: "center" as const },
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
  onAdd,
  onEdit,
  onDelete,
}: StudentTableProps) {
  const [data] = useState<StudentTableRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<StudentTableRow | null>(
    null,
  );

  // Convert StudentFormData to StudentFormPayload
  // Note: File uploads (studentImage, coverImage) need separate handling via upload endpoint
  const convertToPayload = (formData: StudentFormData): StudentFormPayload => ({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    photoUrl: formData.photoUrl,
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    schoolName: formData.schoolName,
    coverPhotoUrl: null, // TODO: Handle file upload and get URL
    parentId: formData.parentId,
    parentName: formData.parentName,
    parentPhone: formData.parentPhone,
    parentEmail: formData.parentEmail,
    parentAddress: formData.parentAddress,
    parentPostcode: formData.parentPostcode,
    parentCity: formData.parentCity,
    branchId: formData.branchId,
    courseId: formData.courseId,
    packageId: formData.packageId,
    packageType: formData.packageType,
    numberOfMonths: formData.numberOfMonths,
    numberOfSessions: formData.numberOfSessions,
    scheduleEntries: formData.scheduleEntries,
    notes: formData.notes,
  });

  const handleAdd = async (formData: StudentFormData) => {
    const payload = convertToPayload(formData);
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create student");
    }
  };

  const handleEdit = async (formData: StudentFormData) => {
    if (!selectedRecord) return;
    const payload = convertToPayload(formData);
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update student");
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete student");
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.email?.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        row.programName?.toLowerCase().includes(query),
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

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr.split("T")[0];
    }
  };

  // Format schedule display
  const formatSchedule = (days: string[], time: string | null) => {
    if (days.length === 0 && !time) return "-";
    const dayAbbr = days.map((d) => d.substring(0, 3)).join(", ");
    return (
      <div className="space-y-0.5">
        <div className="font-medium">{dayAbbr || "TBD"}</div>
        {time && <div className="text-xs text-muted-foreground">{time}</div>}
      </div>
    );
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
            <Button
              onClick={openAddModal}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>

          {/* Table - EXACT STRUCTURE MATCH TO TRIAL TABLE */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1400px] w-full table-fixed border-separate border-spacing-0">
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
            <table className="min-w-[1400px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
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
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={row.photo || undefined}
                            alt={row.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-r from-[#615DFA] to-[#23D2E2] text-white font-medium text-xs">
                            {row.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </td>

                      {/* Student Name */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[1].width }}
                      >
                        {row.name}
                      </td>

                      {/* Email */}
                      <td
                        className="px-4 py-3 text-muted-foreground truncate"
                        style={{ width: columns[2].width }}
                      >
                        {row.email || "-"}
                      </td>

                      {/* Branch */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[3].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Program */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[4].width }}
                      >
                        {row.programName ?? "-"}
                      </td>

                      {/* Schedule */}
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ width: columns[5].width }}
                      >
                        {formatSchedule(row.scheduleDays, row.scheduleTime)}
                      </td>

                      {/* Enroll Date */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[6].width }}
                      >
                        {formatDate(row.enrollDate)}
                      </td>

                      {/* AdCoins */}
                      <td
                        className="px-4 py-3 text-center font-bold text-[#615DFA]"
                        style={{ width: columns[7].width }}
                      >
                        {row.adcoinBalance.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[8].width }}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            row.enrollmentStatus
                              ? ENROLLMENT_STATUS_STYLES[row.enrollmentStatus] ?? "bg-gray-100 text-gray-700"
                              : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {row.enrollmentStatus
                            ? ENROLLMENT_STATUS_LABELS[row.enrollmentStatus] ?? row.enrollmentStatus
                            : "No Enrollment"}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[9].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Edit student ${row.name}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Delete student ${row.name}`}
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
