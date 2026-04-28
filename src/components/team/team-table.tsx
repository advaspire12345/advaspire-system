"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, FileText, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TeamModal } from "@/components/team/team-modal";
import { CvPreviewModal } from "@/components/team/cv-preview-modal";
import { PermissionModal } from "@/components/team/permission-modal";
import type { PermissionModalData } from "@/components/team/permission-modal";
import { RolePermissionModal } from "@/components/team/role-permission-modal";
import type { TeamTableRow } from "@/data/team";
import type { TeamMemberFormData } from "@/components/team/team-modal";
import type { TeamMemberFormPayload } from "@/app/(dashboard)/team/actions";
import type { PermissionResource, ResourcePermission, PermissionsMap, UserRole, CustomRole } from "@/db/schema";

interface BranchOption {
  id: string;
  name: string;
}

interface TeamTableProps {
  initialData: TeamTableRow[];
  branches: BranchOption[];
  currentUserRole?: UserRole | null;
  currentUserBranchId?: string | null;
  hideBranch?: boolean;
  onAdd?: (payload: TeamMemberFormPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (userId: string, payload: TeamMemberFormPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (userId: string) => Promise<{ success: boolean; error?: string }>;
  onSavePermissions?: (
    userId: string,
    permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
  ) => Promise<{ success: boolean; error?: string }>;
  onLoadPermissions?: (
    userId: string
  ) => Promise<{ permissions: Record<PermissionResource, ResourcePermission>; role: string } | null>;
  // Role permission modal props
  canEditRolePermissions?: boolean;
  customRoles?: CustomRole[];
  onLoadRolePermissions?: (role: string) => Promise<PermissionsMap | null>;
  onSaveRolePermissions?: (role: string, permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]) => Promise<{ success: boolean; error?: string }>;
  onCreateCustomRole?: (name: string) => Promise<{ success: boolean; error?: string; role?: CustomRole }>;
  onUpdateCustomRoleName?: (roleId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteCustomRole?: (roleId: string) => Promise<{ success: boolean; error?: string }>;
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
  { key: "address", label: "Address", width: "160px" },
  { key: "branch", label: "Branch", width: "130px" },
  { key: "email", label: "Email", width: "180px" },
  { key: "cv", label: "CV", width: "70px", align: "center" as const },
  { key: "role", label: "Role", width: "120px" },
  { key: "employedDate", label: "Employed Date", width: "120px" },
  { key: "status", label: "Status", width: "90px", align: "center" as const },
  { key: "action", label: "Action", width: "140px", align: "center" as const },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  group_admin: "Group Admin",
  company_admin: "Company Admin",
  assistant_admin: "Assistant Admin",
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
  currentUserRole,
  currentUserBranchId,
  hideBranch,
  onAdd,
  onEdit,
  onDelete,
  onSavePermissions,
  onLoadPermissions,
  canEditRolePermissions,
  customRoles = [],
  onLoadRolePermissions,
  onSaveRolePermissions,
  onCreateCustomRole,
  onUpdateCustomRoleName,
  onDeleteCustomRole,
}: TeamTableProps) {
  const router = useRouter();
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

  // Permission modal state (per-user)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalData, setPermissionModalData] = useState<PermissionModalData | null>(null);

  // Role permission modal state
  const [rolePermModalOpen, setRolePermModalOpen] = useState(false);

  // Convert form data to payload
  // Note: avatarImage and coverImage are File objects that would need to be uploaded
  // to a storage service to get URLs. For now, we pass null for photoUrl.
  const convertToPayload = (formData: TeamMemberFormData, includePassword = false): TeamMemberFormPayload => ({
    name: formData.name,
    email: formData.email,
    ...(includePassword && formData.password ? { password: formData.password } : {}),
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
    if (!onAdd) return;
    const payload = convertToPayload(formData, true);
    const result = await onAdd(payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to create team member");
    }
    router.refresh();
  };

  const handleEdit = async (formData: TeamMemberFormData) => {
    if (!selectedRecord || !onEdit) return;
    const payload = convertToPayload(formData);
    const result = await onEdit(selectedRecord.id, payload);
    if (!result.success) {
      throw new Error(result.error || "Failed to update team member");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!selectedRecord || !onDelete) return;
    const result = await onDelete(selectedRecord.id);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete team member");
    }
    router.refresh();
  };

  const openPermissionModal = async (record: TeamTableRow) => {
    if (!onLoadPermissions) return;
    const result = await onLoadPermissions(record.id);
    if (result) {
      setPermissionModalData({
        userId: record.id,
        userName: record.name,
        userRole: record.role,
        permissions: result.permissions,
      });
      setPermissionModalOpen(true);
    }
  };

  const handleSavePermissions = async (
    userId: string,
    permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
  ) => {
    if (!onSavePermissions) return { success: false, error: "Not available" };
    const result = await onSavePermissions(userId, permissions);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return initialData;

    const query = searchQuery.toLowerCase();
    return initialData.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.branchName.toLowerCase().includes(query) ||
        row.phone?.toLowerCase().includes(query) ||
        ROLE_LABELS[row.role]?.toLowerCase().includes(query)
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
            <div className="flex items-center gap-3">
              {canEditRolePermissions && (
                <Button
                  onClick={() => setRolePermModalOpen(true)}
                  variant="outline"
                  className="font-bold h-[50px] px-6"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Edit Permissions
                </Button>
              )}
              {onAdd && (
                <Button
                  onClick={openAddModal}
                  className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              )}
            </div>
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
                        col.align === "right" && "text-right",
                        col.key === "branch" && hideBranch && "hidden",
                        col.key === "action" && !onEdit && !onDelete && !onSavePermissions && "hidden",
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
                      colSpan={hideBranch ? columns.length - 1 : columns.length}
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
                        <div className="relative flex justify-center">
                          <HexagonAvatar
                            size={50}
                            imageUrl={row.photo ?? undefined}
                            percentage={0.5}
                            animated={false}
                            fallbackInitials={row.name.charAt(0)}
                            cornerRadius={8}
                          />
                        </div>
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
                        className={cn("px-4 py-3", hideBranch && "hidden")}
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
                        className={cn("px-4 py-3", !onEdit && !onDelete && !onSavePermissions && "hidden")}
                        style={{ width: columns[10].width }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              aria-label={`Edit ${row.name}`}
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
                              aria-label={`Delete ${row.name}`}
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
        currentUserRole={currentUserRole ?? undefined}
        currentUserBranchId={currentUserBranchId ?? undefined}
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

      {/* Permission Modal (per-user) */}
      <PermissionModal
        open={permissionModalOpen}
        onOpenChange={setPermissionModalOpen}
        data={permissionModalData}
        onSave={handleSavePermissions}
      />

      {/* Role Permission Modal */}
      {canEditRolePermissions && onLoadRolePermissions && onSaveRolePermissions && onCreateCustomRole && onUpdateCustomRoleName && onDeleteCustomRole && (
        <RolePermissionModal
          open={rolePermModalOpen}
          onOpenChange={setRolePermModalOpen}
          currentUserRole={currentUserRole ?? "instructor"}
          customRoles={customRoles}
          onLoadRolePermissions={async (role) => {
            const result = await onLoadRolePermissions(role);
            if (!result) {
              // Return empty permissions as fallback
              const empty = {} as Record<PermissionResource, ResourcePermission>;
              const resources: PermissionResource[] = ["dashboard", "companies", "branches", "trials", "students", "examinations", "programs", "team", "attendance", "attendance_log", "payment_record", "pending_payments", "leaderboard", "transactions"];
              for (const r of resources) empty[r] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
              return empty;
            }
            return result;
          }}
          onSaveRolePermissions={onSaveRolePermissions}
          onCreateCustomRole={onCreateCustomRole}
          onUpdateCustomRoleName={onUpdateCustomRoleName}
          onDeleteCustomRole={onDeleteCustomRole}
        />
      )}
    </>
  );
}
