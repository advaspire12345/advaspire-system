"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import {
  BranchModal,
  type BranchFormData,
} from "@/components/branches/branch-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegistrationForm } from "@/components/registration/registration-form";
import { cn } from "@/lib/utils";
import type { BranchEntry, CompanyOption } from "@/data/branches";
import type { UserRole } from "@/db/schema";
import {
  addBranchAction,
  updateBranchAction,
  deleteBranchAction,
} from "@/app/(dashboard)/branches/actions";

interface CourseOption {
  id: string;
  name: string;
}

interface SlotOption {
  id: string;
  courseId: string;
  branchId: string;
  day: string;
  time: string;
  duration: number;
}

interface BranchTableProps {
  initialData: BranchEntry[];
  companyOptions: CompanyOption[];
  courses?: CourseOption[];
  courseSlots?: SlotOption[];
  userRole: UserRole;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canCreateBranch: boolean;
  canEditBranch: boolean;
  canDeleteBranch: boolean;
}

const ITEMS_PER_PAGE = 10;

const columns = [
  { key: "type", label: "Type", width: "90px" },
  { key: "code", label: "Code", width: "80px" },
  { key: "name", label: "Name", width: "120px" },
  { key: "company", label: "Company", width: "150px" },
  { key: "address", label: "Address", width: "150px" },
  { key: "area", label: "Area", width: "110px" },
  { key: "phone", label: "Phone", width: "100px" },
  { key: "email", label: "Email", width: "140px" },
  { key: "bankName", label: "Bank Name", width: "120px" },
  { key: "account", label: "Account No.", width: "120px" },
  { key: "action", label: "Action", width: "100px", align: "center" as const },
];

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  company: { bg: "bg-amber-100", text: "text-amber-700", label: "Company" },
  hq: { bg: "bg-purple-100", text: "text-purple-700", label: "HQ" },
  branch: { bg: "bg-blue-100", text: "text-blue-700", label: "Branch" },
};

export function BranchTable({
  initialData,
  companyOptions,
  courses = [],
  courseSlots = [],
  userRole,
  canCreateCompany,
  canEditCompany,
  canDeleteCompany,
  canCreateBranch,
  canEditBranch,
  canDeleteBranch,
}: BranchTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Registration form modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regBranch, setRegBranch] = useState<BranchEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<BranchEntry | null>(
    null,
  );

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return initialData;

    const query = searchQuery.toLowerCase();
    return initialData.filter(
      (row) =>
        row.branchName.toLowerCase().includes(query) ||
        row.parentName?.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query),
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

  const canAdd = canCreateCompany || canCreateBranch;

  // Open modal for add
  const openAddModal = () => {
    setSelectedRecord(null);
    setModalMode("add");
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (record: BranchEntry) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  // Open modal for delete
  const openDeleteModal = (record: BranchEntry) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
  };

  // Admin can edit their own company row
  const canEditRow = (row: BranchEntry) =>
    row.type === "company"
      ? canEditCompany || userRole === "group_admin"
      : canEditBranch;

  const canDeleteRow = (row: BranchEntry) =>
    row.type === "company" ? canDeleteCompany : canDeleteBranch;

  const hideActions = !canEditCompany && !canDeleteCompany && !canEditBranch && !canDeleteBranch;

  // Handle add
  const handleAdd = async (formData: BranchFormData) => {
    const result = await addBranchAction({
      name: formData.name,
      type: formData.type,
      code: formData.code,
      parentId: formData.parentId,
      address: formData.address,
      city: formData.city,
      phone: formData.phone,
      email: formData.email,
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      website: formData.website,
      logoUrl: formData.logoUrl,
      registrationNumber: formData.registrationNumber,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to add entry");
    }
    router.refresh();
  };

  // Handle edit
  const handleEdit = async (formData: BranchFormData) => {
    if (!selectedRecord) return;

    const result = await updateBranchAction(selectedRecord.id, {
      name: formData.name,
      type: formData.type,
      code: formData.code,
      parentId: formData.parentId,
      address: formData.address,
      city: formData.city,
      phone: formData.phone,
      email: formData.email,
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      website: formData.website,
      logoUrl: formData.logoUrl,
      registrationNumber: formData.registrationNumber,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to update entry");
    }
    router.refresh();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRecord) return;

    const result = await deleteBranchAction(selectedRecord.id, selectedRecord.type);

    if (!result.success) {
      throw new Error(result.error || "Failed to delete entry");
    }
    router.refresh();
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search and Action Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            {/* Search Input */}
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, type, company, or admin..."
            />

            {/* Add Button */}
            {canAdd && (
              <Button
                onClick={openAddModal}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Header Table */}
            <table className="min-w-[1380px] w-full table-fixed border-separate border-spacing-0">
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
                        col.key === "action" && hideActions && "hidden",
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
            <table className="min-w-[1380px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => {
                    const badge = TYPE_BADGE[row.type] ?? TYPE_BADGE.branch;
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition hover:bg-[#f0f6ff]",
                          rowIdx === paginatedData.length - 1 &&
                            "rounded-bl-lg rounded-br-lg",
                        )}
                      >
                        {/* Type */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[0].width }}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                              badge.bg,
                              badge.text
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Code */}
                        <td
                          className="px-4 py-3 font-mono text-xs text-muted-foreground"
                          style={{ width: columns[1].width }}
                        >
                          {row.code || "-"}
                        </td>

                        {/* Name */}
                        <td
                          className="px-4 py-3 font-bold"
                          style={{ width: columns[2].width }}
                        >
                          {row.branchName}
                        </td>

                        {/* Company */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[3].width }}
                        >
                          {row.parentName || "-"}
                        </td>

                        {/* Address */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[4].width }}
                        >
                          {row.branchAddress || "-"}
                        </td>

                        {/* Area */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[5].width }}
                        >
                          {row.city || "-"}
                        </td>

                        {/* Phone */}
                        <td
                          className="px-4 py-3 font-bold text-[#23d2e2]"
                          style={{ width: columns[6].width }}
                        >
                          {row.branchPhone || "-"}
                        </td>

                        {/* Email */}
                        <td
                          className="px-4 py-3"
                          style={{ width: columns[7].width }}
                        >
                          {row.branchEmail || "-"}
                        </td>

                        {/* Bank Name */}
                        <td
                          className="px-4 py-3 font-bold"
                          style={{ width: columns[8].width }}
                        >
                          {row.bankName || "-"}
                        </td>

                        {/* Account No */}
                        <td
                          className="px-4 py-3 text-center font-bold"
                          style={{ width: columns[9].width }}
                        >
                          {row.bankAccount || "-"}
                        </td>

                        {/* Action */}
                        <td
                          className={cn("px-4 py-3", hideActions && "hidden")}
                          style={{ width: columns[10].width }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {/* Registration Form — only for hq/branch types */}
                            {row.type !== "company" && (
                              <button
                                type="button"
                                onClick={() => { setRegBranch(row); setRegModalOpen(true); }}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#23D2E2] hover:text-white"
                                aria-label={`Registration form for ${row.branchName}`}
                                title="Registration Form"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                            )}

                            {canEditRow(row) && (
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                                aria-label={`Edit ${row.branchName}`}
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                            )}

                            {canEditRow(row) && (
                              <button
                                type="button"
                                onClick={() => canDeleteRow(row) && openDeleteModal(row)}
                                disabled={!canDeleteRow(row)}
                                className={cn(
                                  "rounded-lg border border-muted-foreground/30 p-2",
                                  canDeleteRow(row)
                                    ? "text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                                    : "text-muted-foreground/30 cursor-not-allowed opacity-50"
                                )}
                                aria-label={`Delete ${row.branchName}`}
                                title={canDeleteRow(row) ? "Delete" : "Cannot delete"}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
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

      {/* Branch Modal */}
      <BranchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        companyOptions={companyOptions}
        existingBranches={initialData}
        userRole={userRole}
        canCreateCompany={canCreateCompany}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Registration Form Modal */}
      {regBranch && (
        <Dialog open={regModalOpen} onOpenChange={setRegModalOpen}>
          <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
            <div className="max-h-[90vh] overflow-y-auto p-10">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Registration Form — {regBranch.branchName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Share link:</span>
                  <a
                    href={`/register/${regBranch.code || regBranch.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-[#23D2E2] hover:underline truncate"
                  >
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/register/${regBranch.code || regBranch.id}`}
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${regBranch.code || regBranch.id}`)}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition"
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="mt-6">
                <RegistrationForm
                  branchId={regBranch.id}
                  branchName={regBranch.branchName}
                  courses={courses.filter((c) =>
                    courseSlots.some((s) => s.courseId === c.id && s.branchId === regBranch.id)
                  )}
                  courseSlots={courseSlots
                    .filter((s) => s.branchId === regBranch.id)
                    .map((s) => ({
                      id: s.id,
                      courseId: s.courseId,
                      day: s.day,
                      time: s.time,
                      duration: s.duration,
                    }))}
                  layout="default"
                  noCard
                  onSuccess={() => router.refresh()}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
