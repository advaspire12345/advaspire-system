"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionResource, ResourcePermission, PermissionsMap, UserRole, CustomRole } from "@/db/schema";
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
};

interface RoleTab {
  id: string;       // role key: "group_admin", "company_admin", etc. or "custom:<uuid>"
  label: string;
  editable: boolean; // can current user edit this tab's permissions
  isCustom: boolean;
  customRoleId?: string; // for custom roles
}

interface RolePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole: UserRole;
  customRoles: CustomRole[];
  onLoadRolePermissions: (role: string) => Promise<PermissionsMap>;
  onSaveRolePermissions: (role: string, permissions: { resource: PermissionResource; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]) => Promise<{ success: boolean; error?: string }>;
  onCreateCustomRole: (name: string) => Promise<{ success: boolean; error?: string; role?: CustomRole }>;
  onUpdateCustomRoleName: (roleId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteCustomRole: (roleId: string) => Promise<{ success: boolean; error?: string }>;
}

export function RolePermissionModal({
  open,
  onOpenChange,
  currentUserRole,
  customRoles,
  onLoadRolePermissions,
  onSaveRolePermissions,
  onCreateCustomRole,
  onUpdateCustomRoleName,
  onDeleteCustomRole,
}: RolePermissionModalProps) {
  const isGroupAdmin = currentUserRole === "group_admin";

  // Build tabs based on current user's role
  const buildTabs = useCallback((): RoleTab[] => {
    const tabs: RoleTab[] = [];

    if (isGroupAdmin) {
      tabs.push({ id: "group_admin", label: "Group Admin", editable: true, isCustom: false });
    }
    if (isGroupAdmin) {
      tabs.push({ id: "company_admin", label: "Company Admin", editable: true, isCustom: false });
    }
    // Both group_admin and company_admin can see assistant + instructor
    tabs.push({ id: "assistant_admin", label: "Assistant", editable: true, isCustom: false });
    tabs.push({ id: "instructor", label: "Instructor", editable: true, isCustom: false });

    // Custom role tabs
    for (const cr of customRoles) {
      tabs.push({
        id: `custom:${cr.id}`,
        label: cr.name,
        editable: isGroupAdmin,
        isCustom: true,
        customRoleId: cr.id,
      });
    }

    return tabs;
  }, [isGroupAdmin, customRoles]);

  const [tabs, setTabs] = useState<RoleTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<PermissionResource, ResourcePermission>>({} as Record<PermissionResource, ResourcePermission>);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom role editing
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [createRoleName, setCreateRoleName] = useState("");

  // Initialize tabs when modal opens
  useEffect(() => {
    if (open) {
      const t = buildTabs();
      setTabs(t);
      if (t.length > 0 && !activeTab) {
        setActiveTab(t[0].id);
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [open, buildTabs, activeTab]);

  // Load permissions when active tab changes
  useEffect(() => {
    if (!open || !activeTab) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    onLoadRolePermissions(activeTab).then((perms) => {
      if (cancelled) return;
      const cloned: Record<PermissionResource, ResourcePermission> = {} as Record<PermissionResource, ResourcePermission>;
      for (const r of ALL_RESOURCES) {
        cloned[r] = { ...(perms[r] || { can_view: false, can_create: false, can_edit: false, can_delete: false }) };
      }
      setPermissions(cloned);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, activeTab, onLoadRolePermissions]);

  const togglePermission = (resource: PermissionResource, field: keyof ResourcePermission) => {
    setPermissions((prev) => {
      const updated = { ...prev };
      const current = { ...updated[resource] };

      if (field === "can_view") {
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
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const permArray = ALL_RESOURCES.map((resource) => ({
        resource,
        can_view: permissions[resource].can_view,
        can_create: permissions[resource].can_create,
        can_edit: permissions[resource].can_edit,
        can_delete: permissions[resource].can_delete,
      }));

      const result = await onSaveRolePermissions(activeTab, permArray);
      if (!result.success) {
        throw new Error(result.error || "Failed to save permissions");
      }
      setSuccessMsg("Permissions saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomRole = async () => {
    if (!createRoleName.trim()) return;
    setError(null);

    const result = await onCreateCustomRole(createRoleName.trim());
    if (result.success && result.role) {
      setIsCreatingRole(false);
      setCreateRoleName("");
      // Add new tab and switch to it
      const newTab: RoleTab = {
        id: `custom:${result.role.id}`,
        label: result.role.name,
        editable: true,
        isCustom: true,
        customRoleId: result.role.id,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(newTab.id);
    } else {
      setError(result.error || "Failed to create custom role");
    }
  };

  const handleRenameCustomRole = async (roleId: string) => {
    if (!newRoleName.trim()) return;
    setError(null);

    const result = await onUpdateCustomRoleName(roleId, newRoleName.trim());
    if (result.success) {
      setTabs((prev) =>
        prev.map((t) =>
          t.customRoleId === roleId ? { ...t, label: newRoleName.trim() } : t
        )
      );
      setEditingRoleName(null);
      setNewRoleName("");
    } else {
      setError(result.error || "Failed to rename role");
    }
  };

  const handleDeleteCustomRole = async (roleId: string) => {
    setError(null);

    const result = await onDeleteCustomRole(roleId);
    if (result.success) {
      const remaining = tabs.filter((t) => t.customRoleId !== roleId);
      setTabs(remaining);
      if (activeTab === `custom:${roleId}` && remaining.length > 0) {
        setActiveTab(remaining[0].id);
      }
    } else {
      setError(result.error || "Failed to delete role");
    }
  };

  const activeTabData = tabs.find((t) => t.id === activeTab);
  const canAddCustomRole = isGroupAdmin && customRoles.length + (tabs.filter(t => t.isCustom).length - customRoles.length) < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Role Permissions
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure permissions for each role. Changes apply to all users with this role under your company.
            </p>
          </DialogHeader>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-1 border-b">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setSuccessMsg(null); }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-semibold transition-colors relative",
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#23D2E2]" />
                  )}
                </button>
              </div>
            ))}

            {/* Add custom role button */}
            {isGroupAdmin && canAddCustomRole && !isCreatingRole && (
              <button
                type="button"
                onClick={() => setIsCreatingRole(true)}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Role
              </button>
            )}
          </div>

          {/* Creating new custom role */}
          {isCreatingRole && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={createRoleName}
                onChange={(e) => setCreateRoleName(e.target.value)}
                placeholder="Custom role name..."
                className="h-9 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateCustomRole(); if (e.key === "Escape") setIsCreatingRole(false); }}
              />
              <Button size="sm" onClick={handleCreateCustomRole} className="h-9 bg-[#23D2E2] hover:bg-[#18a9b8] text-white">
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsCreatingRole(false); setCreateRoleName(""); }} className="h-9">
                Cancel
              </Button>
            </div>
          )}

          {/* Custom role name edit / delete controls */}
          {activeTabData?.isCustom && isGroupAdmin && (
            <div className="mt-3 flex items-center gap-2">
              {editingRoleName === activeTabData.customRoleId ? (
                <>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="h-9 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameCustomRole(activeTabData.customRoleId!); if (e.key === "Escape") setEditingRoleName(null); }}
                  />
                  <Button size="sm" onClick={() => handleRenameCustomRole(activeTabData.customRoleId!)} className="h-9 bg-[#23D2E2] hover:bg-[#18a9b8] text-white">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingRoleName(null)} className="h-9">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setEditingRoleName(activeTabData.customRoleId!); setNewRoleName(activeTabData.label); }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomRole(activeTabData.customRoleId!)}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Permission Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-[#615DFA] border-t-transparent animate-spin" />
              Loading permissions...
            </div>
          ) : (
            <div className="mt-4 space-y-0">
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
                        disabled={!activeTabData?.editable}
                        onCheckedChange={() => togglePermission(resource, "can_view")}
                      />
                    </div>

                    <div className="flex justify-center">
                      <Switch
                        checked={perm.can_create}
                        disabled={!activeTabData?.editable || !perm.can_view}
                        onCheckedChange={() => togglePermission(resource, "can_create")}
                      />
                    </div>

                    <div className="flex justify-center">
                      <Switch
                        checked={perm.can_edit}
                        disabled={!activeTabData?.editable || !perm.can_view}
                        onCheckedChange={() => togglePermission(resource, "can_edit")}
                      />
                    </div>

                    <div className="flex justify-center">
                      <Switch
                        checked={perm.can_delete}
                        disabled={!activeTabData?.editable || !perm.can_view}
                        onCheckedChange={() => togglePermission(resource, "can_delete")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          {activeTabData?.editable && (
            <div className="mt-6">
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
              >
                {isSaving ? "Saving..." : "Save Permissions"}
              </Button>
              <span className="text-center block mt-2 text-xs text-muted-foreground">
                Changes apply to all {activeTabData.label} users under your company
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
