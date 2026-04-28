"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PermissionResource, ResourcePermission } from "@/db/schema";
import { ALL_RESOURCES } from "@/db/schema";

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: "Dashboard",
  companies: "Companies",
  branches: "Branches",
  trials: "Trial",
  students: "Student",
  examinations: "Examination",
  programs: "Program",
  team: "Team",
  attendance: "Mark Attendance",
  attendance_log: "Attendance History",
  payment_record: "Payment Record",
  pending_payments: "Pending Payments",
  leaderboard: "Leaderboard",
  transactions: "Transactions",
  import: "Import",
};

const ROLE_LABELS: Record<string, string> = {
  company_admin: "Company Admin",
  assistant_admin: "Assistant Admin",
  instructor: "Instructor",
};

export interface PermissionModalData {
  userId: string;
  userName: string;
  userRole: string;
  permissions: Record<PermissionResource, ResourcePermission>;
}

interface PermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PermissionModalData | null;
  onSave: (
    userId: string,
    permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
  ) => Promise<{ success: boolean; error?: string }>;
}

export function PermissionModal({
  open,
  onOpenChange,
  data,
  onSave,
}: PermissionModalProps) {
  const [permissions, setPermissions] = useState<Record<PermissionResource, ResourcePermission>>({} as Record<PermissionResource, ResourcePermission>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && data) {
      // Deep clone to avoid mutating original
      const cloned: Record<PermissionResource, ResourcePermission> = {} as Record<PermissionResource, ResourcePermission>;
      for (const r of ALL_RESOURCES) {
        cloned[r] = { ...data.permissions[r] };
      }
      setPermissions(cloned);
      setError(null);
    }
  }, [open, data]);

  const togglePermission = (resource: PermissionResource, field: keyof ResourcePermission) => {
    setPermissions((prev) => {
      const updated = { ...prev };
      const current = { ...updated[resource] };

      if (field === "can_view") {
        // Toggling view off disables all other permissions
        const newVal = !current.can_view;
        current.can_view = newVal;
        if (!newVal) {
          current.can_create = false;
          current.can_edit = false;
          current.can_delete = false;
        }
      } else {
        current[field] = !current[field];
      }

      updated[resource] = current;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!data) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const permArray = ALL_RESOURCES.map((resource) => ({
        resource,
        can_view: permissions[resource].can_view,
        can_create: permissions[resource].can_create,
        can_edit: permissions[resource].can_edit,
        can_delete: permissions[resource].can_delete,
      }));

      const result = await onSave(data.userId, permArray);
      if (!result.success) {
        throw new Error(result.error || "Failed to save permissions");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Permissions for {data.userName}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 mb-6">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                data.userRole === "company_admin"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              )}
            >
              {ROLE_LABELS[data.userRole] || data.userRole}
            </span>
          </div>

          {/* Permission Grid */}
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-2 px-3 py-2 text-xs font-bold text-muted-foreground border-b">
              <span>Resource</span>
              <span className="text-center">View</span>
              <span className="text-center">Create</span>
              <span className="text-center">Edit</span>
              <span className="text-center">Delete</span>
            </div>

            {/* Rows */}
            {ALL_RESOURCES.map((resource) => {
              const perm = permissions[resource];
              if (!perm) return null;

              return (
                <div
                  key={resource}
                  className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-2 items-center px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition"
                >
                  <span className="text-sm font-medium">
                    {RESOURCE_LABELS[resource]}
                  </span>

                  <div className="flex justify-center">
                    <Switch
                      checked={perm.can_view}
                      onCheckedChange={() => togglePermission(resource, "can_view")}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      checked={perm.can_create}
                      disabled={!perm.can_view}
                      onCheckedChange={() => togglePermission(resource, "can_create")}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      checked={perm.can_edit}
                      disabled={!perm.can_view}
                      onCheckedChange={() => togglePermission(resource, "can_edit")}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      checked={perm.can_delete}
                      disabled={!perm.can_view}
                      onCheckedChange={() => togglePermission(resource, "can_delete")}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-8">
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
            >
              {isSubmitting ? "Saving..." : "Save Permissions"}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              Configure access levels for this team member
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
