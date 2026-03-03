"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TeamModal } from "@/components/team/team-modal";
import { CvPreviewModal } from "@/components/team/cv-preview-modal";
import type { TeamTableRow } from "@/data/team";
import type { TeamMemberFormData } from "@/components/team/team-modal";
import type { TeamMemberFormPayload } from "@/app/(dashboard)/team/actions";

interface BranchOption {
  id: string;
  name: string;
}

interface TeamTableProps {
  initialData: TeamTableRow[];
  branches: BranchOption[];
  onAdd: (payload: TeamMemberFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit: (userId: string, payload: TeamMemberFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

const ITEMS_PER_PAGE = 10;

const columns: {
  key: string;
  label: string;
  width: string;
  align?: "center" | "right";
}[] = [
  { key: "photo", label: "Photo", width: "70px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "phone", label: "Phone", width: "130px" },
  { key: "address", label: "Address", width: "180px" },
  { key: "branch", label: "Branch", width: "130px" },
  { key: "email", label: "Email", width: "180px" },
  { key: "cv", label: "CV", width: "70px", align: "center" as const },
  { key: "role", label: "Role", width: "120px" },
  { key: "employedDate", label: "Employed Date", width: "120px" },
  { key: "status", label: "Status", width: "90px", align: "center" as const },
  { key: "action", label: "Action", width: "100px", align: "center" as const },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  branch_admin: "Branch Admin",
  instructor: "Instructor",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function TeamTable({
  initialData,
  branches,
  onAdd,
  onEdit,
  onDelete,
}: TeamTableProps) {
  const [data] = useState<TeamTableRow[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");
  const [selectedRecord, setSelectedRecord] = useState<TeamTableRow | null>(null);

  // CV Preview modal state
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState("");
  const [cvMemberName, setCvMemberName] = useState("");

  // Convert form data to payload
  // Note: avatarImage and coverImage are File objects that would need to be uploaded
  // to a storage service to get URLs. For now, we pass null for photoUrl.
  const convertToPayload = (formData: TeamMemberFormData): TeamMemberFormPayload => ({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    branchId: formData.branchId,
    photoUrl: null, // TODO: Upload formData.avatarImage and get URL
    cvUrl: formData.cvPhoto[0] || null,
    role: formData.role,
    employedDate: formData.employedDate,
    status: formData.status,
  });

  const handleAdd = async (formData: TeamMemberFormData) => {
    const payload = convertToPayload(formData);
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create team member");
    }
  };

  const handleEdit = async (formData: TeamMemberFormData) => {
    if (!selectedRecord) return;
    const payload = convertToPayload(formData);
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update team member");
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete team member");
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        row.phone?.toLowerCase().includes(query) ||
        ROLE_LABELS[row.role]?.toLowerCase().includes(query)
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

  const openEditModal = (record: TeamTableRow) => {
    setSelectedRecord(record);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (record: TeamTableRow) => {
    setSelectedRecord(record);
    setModalMode("delete");
    setModalOpen(true);
  };

  // CV preview handler
  const openCvPreview = (cvUrl: string, memberName: string) => {
    setCvPreviewUrl(cvUrl);
    setCvMemberName(memberName);
    setCvPreviewOpen(true);
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "do MMM yyyy");
    } catch {
      return dateStr.split("T")[0];
    }
  };

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search and Action Row */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, email, branch or role..."
            />
            <Button
              onClick={openAddModal}
              className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>

          {/* Table */}
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
                        col.align === "right" && "text-right"
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
            <table className="min-w-[1400px] table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedData.length - 1 &&
                          "rounded-bl-lg rounded-br-lg"
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

                      {/* Name */}
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ width: columns[1].width }}
                      >
                        {row.name}
                      </td>

                      {/* Phone */}
                      <td
                        className="px-4 py-3 text-muted-foreground"
                        style={{ width: columns[2].width }}
                      >
                        {row.phone || "-"}
                      </td>

                      {/* Address */}
                      <td
                        className="px-4 py-3 text-muted-foreground truncate"
                        style={{ width: columns[3].width }}
                        title={row.address || undefined}
                      >
                        {row.address || "-"}
                      </td>

                      {/* Branch */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[4].width }}
                      >
                        {row.branchName}
                      </td>

                      {/* Email */}
                      <td
                        className="px-4 py-3 text-muted-foreground truncate"
                        style={{ width: columns[5].width }}
                        title={row.email}
                      >
                        {row.email}
                      </td>

                      {/* CV */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[6].width }}
                      >
                        {row.cvUrl ? (
                          <button
                            type="button"
                            onClick={() => openCvPreview(row.cvUrl!, row.name)}
                            className="inline-flex items-center justify-center rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`View CV of ${row.name}`}
                            title="View CV"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Role */}
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ width: columns[7].width }}
                      >
                        {ROLE_LABELS[row.role] || row.role}
                      </td>

                      {/* Employed Date */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[8].width }}
                      >
                        {formatDate(row.employedDate)}
                      </td>

                      {/* Status */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ width: columns[9].width }}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            STATUS_STYLES[row.status] || "bg-gray-100 text-gray-700"
                          )}
                        >
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="px-4 py-3"
                        style={{ width: columns[10].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                            aria-label={`Edit ${row.name}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(row)}
                            className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
                            aria-label={`Delete ${row.name}`}
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

      {/* Team Member Modal */}
      <TeamModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        record={selectedRecord}
        branches={branches}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* CV Preview Modal */}
      <CvPreviewModal
        open={cvPreviewOpen}
        onOpenChange={setCvPreviewOpen}
        cvUrl={cvPreviewUrl}
        memberName={cvMemberName}
      />
    </>
  );
}
