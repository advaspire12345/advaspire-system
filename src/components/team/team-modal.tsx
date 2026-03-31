"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { FloatingTextarea } from "@/components/ui/floating-textarea";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import Image from "next/image";
import type { TeamTableRow } from "@/data/team";
import type { UserRole, TeamMemberStatus } from "@/db/schema";

interface BranchOption {
  id: string;
  name: string;
}

export interface TeamMemberFormData {
  name: string;
  email: string;
  password: string;
  phone: string | null;
  address: string | null;
  branchId: string | null;
  avatarImage: File | null;
  coverImage: File | null;
  cvPhoto: string[];
  role: UserRole;
  employedDate: string | null;
  status: TeamMemberStatus;
}

interface TeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit" | "delete";
  record: TeamTableRow | null;
  branches: BranchOption[];
  currentUserRole?: UserRole;
  currentUserBranchId?: string;
  onAdd: (data: TeamMemberFormData) => Promise<void>;
  onEdit: (data: TeamMemberFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

const ALL_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "instructor", label: "Instructor" },
];

const STATUS_OPTIONS: { value: TeamMemberStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const initialFormData: TeamMemberFormData = {
  name: "",
  email: "",
  password: "",
  phone: null,
  address: null,
  branchId: null,
  avatarImage: null,
  coverImage: null,
  cvPhoto: [],
  role: "instructor",
  employedDate: null,
  status: "active",
};

export function TeamModal({
  open,
  onOpenChange,
  mode,
  record,
  branches,
  currentUserRole,
  currentUserBranchId,
  onAdd,
  onEdit,
  onDelete,
}: TeamModalProps) {
  // Filter role options based on current user's role
  const roleOptions = useMemo(() => {
    if (currentUserRole === "admin") {
      // Admin can only create branch_admin and instructor
      return ALL_ROLE_OPTIONS.filter(
        (r) => r.value === "branch_admin" || r.value === "instructor"
      );
    }
    if (currentUserRole === "branch_admin") {
      // Branch admin can only create instructor
      return ALL_ROLE_OPTIONS.filter((r) => r.value === "instructor");
    }
    // Super admin can create all roles
    return ALL_ROLE_OPTIONS;
  }, [currentUserRole]);

  // Filter branch options based on current user's role
  const branchOptions = useMemo(() => {
    if (currentUserRole === "branch_admin" && currentUserBranchId) {
      // Branch admin can only assign to their own branch
      return branches.filter((b) => b.id === currentUserBranchId);
    }
    return branches;
  }, [branches, currentUserRole, currentUserBranchId]);
  const [formData, setFormData] = useState<TeamMemberFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Handle avatar preview URL creation and cleanup
  useEffect(() => {
    if (formData.avatarImage) {
      const url = URL.createObjectURL(formData.avatarImage);
      setAvatarPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (mode === "edit" && record?.photo) {
      setAvatarPreviewUrl(record.photo);
    } else {
      setAvatarPreviewUrl(null);
    }
  }, [formData.avatarImage, mode, record?.photo]);

  // Handle cover preview URL creation and cleanup
  useEffect(() => {
    if (formData.coverImage) {
      const url = URL.createObjectURL(formData.coverImage);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [formData.coverImage]);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && record) {
        setFormData({
          name: record.name,
          email: record.email,
          password: "",
          phone: record.phone,
          address: record.address,
          branchId: record.branchId,
          avatarImage: null,
          coverImage: null,
          cvPhoto: record.cvUrl ? [record.cvUrl] : [],
          role: record.role,
          employedDate: record.employedDate,
          status: record.status,
        });
      } else if (mode === "add") {
        setFormData({
          ...initialFormData,
          // Default role to first available option for the current user
          role: roleOptions[0]?.value ?? "instructor",
          // Auto-set branch for branch_admin (they can only assign their own branch)
          branchId: currentUserRole === "branch_admin" && currentUserBranchId ? currentUserBranchId : null,
        });
      }
      setError(null);
    }
  }, [open, mode, record]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "add") {
        await onAdd(formData);
      } else if (mode === "edit") {
        await onEdit(formData);
      } else if (mode === "delete") {
        await onDelete();
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof TeamMemberFormData>(
    field: K,
    value: TeamMemberFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getModalTitle = () => {
    if (mode === "add") return "Add Team Member";
    if (mode === "delete") return "Delete Team Member";
    return "Edit Team Member";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "add") return "Adding...";
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "add") return "Add Team Member";
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "add") return "Create a new team member";
    if (mode === "delete") return "This action cannot be undone";
    return "Update team member details";
  };

  // Upload Image Field Component
  const UploadImageField = ({
    label,
    value,
    onChange,
    id,
  }: {
    label: string;
    value: File | null;
    onChange: (file: File | null) => void;
    id: string;
  }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      onChange(file);
    };

    return (
      <div
        className={cn(
          "group flex flex-1 items-start justify-center rounded-xl bg-white border border-border",
          "transition-all duration-300 hover:-translate-y-0.5",
          "hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)] hover:border-[#23D2E2]/50",
          "min-h-[100px] py-4 px-3",
        )}
      >
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center"
        >
          <Upload
            size={24}
            className={cn(
              "text-[#ADAFCA] mb-1.5 transition-all duration-300",
              "group-hover:text-[#23D2E2]",
            )}
          />
          <span className="text-sm font-bold text-foreground">{label}</span>
          {value && (
            <span className="text-xs text-[#23D2E2] mt-1 font-medium">
              ✓ {value.name}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            id={id}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    );
  };

  const isReadonly = mode === "delete";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {getModalTitle()}
            </DialogTitle>
          </DialogHeader>

          {mode === "delete" && (
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {record?.name}
              </span>
              ? This action cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Profile Preview */}
            {!isReadonly && (
              <div className="flex flex-col rounded-[10px] overflow-hidden bg-white h-[120px] border border-border">
                {/* Cover Image - 3/5 height */}
                <div className="relative w-full h-[60%]">
                  {coverPreviewUrl ? (
                    <Image
                      src={coverPreviewUrl}
                      alt="Cover Preview"
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#23D2E2]/20 to-[#614BDD]/20" />
                  )}
                </div>

                {/* Bottom section - 2/5 height */}
                <div className="relative bg-white">
                  {/* Avatar Overlay - positioned at the boundary */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-[60px]">
                    <div className="relative">
                      <HexagonAvatar
                        size={100}
                        imageUrl={avatarPreviewUrl ?? undefined}
                        percentage={0.5}
                        animated={true}
                        fallbackInitials={
                          formData.name
                            ? formData.name.charAt(0).toUpperCase()
                            : "T"
                        }
                      />
                      <div className="absolute bottom-2 right-1 z-10">
                        <HexagonNumberBadge value={1} size={32} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Avatar and Cover */}
            {!isReadonly && (
              <div className="grid grid-cols-2 gap-4">
                <UploadImageField
                  id="team-avatar-upload"
                  label="Upload Avatar"
                  value={formData.avatarImage}
                  onChange={(file) => updateField("avatarImage", file)}
                />
                <UploadImageField
                  id="team-cover-upload"
                  label="Upload Cover"
                  value={formData.coverImage}
                  onChange={(file) => updateField("coverImage", file)}
                />
              </div>
            )}

            {/* Full Name */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record?.name ?? "-"}
                  className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Full Name
                </label>
              </div>
            ) : (
              <FloatingInput
                label="Full Name *"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            )}

            {/* Email */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record?.email ?? "-"}
                  className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Email
                </label>
              </div>
            ) : (
              <FloatingInput
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            )}

            {/* Password - Only shown in add mode */}
            {mode === "add" && (
              <FloatingInput
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />
            )}

            {/* Phone and Branch */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={record?.phone ?? "-"}
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Phone
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={record?.branchName ?? "-"}
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Branch
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <FloatingInput
                    label="Phone"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      updateField("phone", e.target.value || null)
                    }
                  />
                  <FloatingSelect
                    label="Branch"
                    value={formData.branchId || ""}
                    onChange={(value) => updateField("branchId", value || null)}
                    options={branchOptions.map((b) => ({ value: b.id, label: b.name }))}
                  />
                </>
              )}
            </div>

            {/* Address */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record?.address ?? "-"}
                  className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Address
                </label>
              </div>
            ) : (
              <FloatingInput
                label="Address"
                value={formData.address || ""}
                onChange={(e) => updateField("address", e.target.value || null)}
              />
            )}

            {/* Role and Status */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={
                        ALL_ROLE_OPTIONS.find((r) => r.value === record?.role)
                          ?.label ?? "-"
                      }
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Role
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={
                        STATUS_OPTIONS.find((s) => s.value === record?.status)
                          ?.label ?? "-"
                      }
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Status
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <FloatingSelect
                    label="Role *"
                    value={formData.role}
                    onChange={(value) => updateField("role", value as UserRole)}
                    options={roleOptions}
                  />
                  <FloatingSelect
                    label="Status"
                    value={formData.status}
                    onChange={(value) =>
                      updateField("status", value as TeamMemberStatus)
                    }
                    options={STATUS_OPTIONS}
                  />
                </>
              )}
            </div>

            {/* Employed Date */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={record?.employedDate ?? "-"}
                  className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground bg-muted/50 cursor-not-allowed opacity-70"
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Employed Date
                </label>
              </div>
            ) : (
              <FloatingInput
                label="Employed Date"
                type="date"
                value={formData.employedDate || ""}
                onChange={(e) =>
                  updateField("employedDate", e.target.value || null)
                }
              />
            )}

            {/* CV Photo Upload */}
            {!isReadonly && (
              <PhotoUpload
                value={formData.cvPhoto}
                onChange={(urls) => updateField("cvPhoto", urls)}
                maxFiles={1}
                label="CV Document"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (!isReadonly && (!formData.name || !formData.email)) ||
                (mode === "add" && formData.password.length < 6)
              }
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete" && "bg-[#fd434f] hover:bg-[#e03a45]",
                (mode === "add" || mode === "edit") &&
                  "bg-[#23D2E2] hover:bg-[#18a9b8]",
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              {getSubtitleText()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
