"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Pencil, Trash2, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SlotTableRow } from "@/app/(dashboard)/slot/page";

interface SlotTableProps {
  data: SlotTableRow[];
  hideBranch?: boolean;
  showBranchInModal?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  courses: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
}

const ITEMS_PER_PAGE = 10;

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const DAY_ORDER: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

function formatTime(time: string): string {
  const parts = time.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}

function formatEndTime(startTime: string, durationMinutes: number): string {
  const parts = startTime.split(":");
  if (parts.length < 2) return "";
  const startMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  const endMinutes = startMinutes + durationMinutes;
  const endH = Math.floor(endMinutes / 60) % 24;
  const endM = endMinutes % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface GroupedSlot {
  key: string;
  courseId: string;
  courseName: string;
  branchId: string;
  branchName: string;
  slots: SlotTableRow[];
}

function groupSlots(rows: SlotTableRow[]): GroupedSlot[] {
  const map = new Map<string, GroupedSlot>();
  for (const row of rows) {
    const key = `${row.courseId}:${row.branchId}`;
    if (!map.has(key)) {
      map.set(key, {
        key, courseId: row.courseId, courseName: row.courseName,
        branchId: row.branchId, branchName: row.branchName, slots: [],
      });
    }
    map.get(key)!.slots.push(row);
  }
  return Array.from(map.values());
}

interface SlotEntry {
  tempId: string;
  dbId?: string; // existing slot ID for edit mode
  day: string;
  time: string;
  duration: number;
  limitStudent: number;
}

let tempIdCounter = 0;
function genTempId() { return `temp-${++tempIdCounter}`; }

type ModalMode = "add" | "edit" | "delete";

export function SlotTable({
  data,
  hideBranch,
  showBranchInModal,
  canAdd,
  canEdit,
  canDelete,
  courses,
  branches,
  defaultBranchId,
}: SlotTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedGroup, setSelectedGroup] = useState<GroupedSlot | null>(null);

  const allGrouped = useMemo(() => groupSlots(data), [data]);

  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return allGrouped;
    const q = searchQuery.toLowerCase();
    return allGrouped.filter(
      (g) =>
        g.courseName.toLowerCase().includes(q) ||
        g.branchName.toLowerCase().includes(q) ||
        g.slots.some((s) => s.day.toLowerCase().includes(q))
    );
  }, [allGrouped, searchQuery]);

  const totalPages = Math.ceil(filteredGrouped.length / ITEMS_PER_PAGE);
  const paginatedGrouped = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGrouped.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGrouped, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setSelectedGroup(null);
    setModalMode("add");
    setModalOpen(true);
  };

  const openEditModal = (group: GroupedSlot) => {
    setSelectedGroup(group);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (group: GroupedSlot) => {
    setSelectedGroup(group);
    setModalMode("delete");
    setModalOpen(true);
  };

  const columns = [
    { key: "program", label: "Program", width: "200px" },
    { key: "branch", label: "Branch", width: "150px" },
    { key: "slot", label: "Slot", width: "350px" },
    { key: "action", label: "Action", width: "100px", align: "center" as const },
  ];

  return (
    <>
      <Card className="bg-transparent border-none shadow-none min-w-0">
        <CardContent className="space-y-4 p-0 min-w-0">
          {/* Search + Add */}
          <div className="flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:justify-between bg-white">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by program, branch or day..."
            />
            {canAdd && (
              <Button
                onClick={openAddModal}
                className="bg-black hover:bg-black/90 text-white font-bold h-[50px] px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full table-fixed border-separate border-spacing-0">
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
                        col.key === "action" && !canEdit && !canDelete && "hidden",
                      )}
                      style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>

            <table className="min-w-[800px] w-full table-fixed border-separate border-spacing-0 bg-white rounded-lg text-sm">
              <tbody>
                {paginatedGrouped.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hideBranch ? columns.length - 1 : columns.length}
                      className="h-24 text-center text-muted-foreground rounded-lg"
                    >
                      No slots found.
                    </td>
                  </tr>
                ) : (
                  paginatedGrouped.map((group, rowIdx) => (
                    <tr
                      key={group.key}
                      className={cn(
                        "transition hover:bg-[#f0f6ff]",
                        rowIdx === paginatedGrouped.length - 1 && "rounded-bl-lg rounded-br-lg",
                      )}
                    >
                      <td className="px-4 py-3 font-bold align-top" style={{ width: columns[0].width }}>
                        {group.courseName}
                      </td>

                      <td className={cn("px-4 py-3 align-top", hideBranch && "hidden")} style={{ width: columns[1].width }}>
                        {group.branchName}
                      </td>

                      <td className="px-4 py-3" style={{ width: columns[2].width }}>
                        <div className="space-y-1">
                          {[...group.slots]
                            .sort((a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time))
                            .map((slot, idx, sorted) => {
                              const prevDay = idx > 0 ? sorted[idx - 1].day : null;
                              const showDay = slot.day !== prevDay;
                              return (
                                <div key={slot.id} className="text-sm flex items-center">
                                  <span className="font-medium inline-block w-[80px]">{showDay ? capitalize(slot.day) : ""}</span>
                                  <span className={cn("mr-1.5", showDay ? "text-muted-foreground" : "invisible")}>:</span>
                                  <span className="inline-block w-[120px]">{formatTime(slot.time)} - {formatEndTime(slot.time, slot.duration)}</span>
                                  <span className="text-muted-foreground text-xs">
                                    [{slot.limitStudent} student{slot.limitStudent !== 1 ? "s" : ""}]
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </td>

                      <td className={cn("px-4 py-3 align-top", !canEdit && !canDelete && "hidden")} style={{ width: columns[3].width }}>
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(group)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#615DFA] hover:text-white"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(group)}
                              className="rounded-lg border border-muted-foreground/30 p-2 text-muted-foreground transition hover:border-transparent hover:bg-[#fd434f] hover:text-white"
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={filteredGrouped.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Slot Modal (add / edit / delete) */}
      <SlotModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        group={selectedGroup}
        courses={courses}
        branches={branches}
        showBranch={showBranchInModal}
        defaultBranchId={defaultBranchId}
      />
    </>
  );
}

// ============================================
// Unified Slot Modal (add / edit / delete)
// ============================================

function SlotModal({
  open,
  onOpenChange,
  mode,
  group,
  courses,
  branches,
  showBranch,
  defaultBranchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  group: GroupedSlot | null;
  courses: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  showBranch?: boolean;
  defaultBranchId?: string;
}) {
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "add") {
      setCourseId("");
      setBranchId(defaultBranchId || "");
      setSlots([{ tempId: genTempId(), day: "monday", time: "09:00", duration: 60, limitStudent: 10 }]);
    } else if (group) {
      setCourseId(group.courseId);
      setBranchId(group.branchId);
      setSlots(group.slots.map((s) => ({
        tempId: genTempId(),
        dbId: s.id,
        day: s.day,
        time: s.time,
        duration: s.duration,
        limitStudent: s.limitStudent,
      })));
    }
  }, [open, mode, group, defaultBranchId]);

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { tempId: genTempId(), day: "monday", time: "09:00", duration: 60, limitStudent: 10 },
    ]);
  };

  const removeSlot = (tempId: string) => {
    setSlots((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateSlot = (tempId: string, updates: Partial<SlotEntry>) => {
    setSlots((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s)));
  };

  const handleSubmit = async () => {
    setError(null);

    if (mode === "delete") {
      if (!group) return;
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/slot", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotIds: group.slots.map((s) => s.id) }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete slots");
        }
        onOpenChange(false);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Add or Edit
    if (!courseId) { setError("Please select a program"); return; }
    if (!branchId) { setError("Please select a branch"); return; }
    if (slots.length === 0) { setError("Please add at least one slot"); return; }

    setIsSubmitting(true);
    try {
      if (mode === "add") {
        const res = await fetch("/api/slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId, branchId,
            slots: slots.map((s) => ({ day: s.day, time: s.time, duration: s.duration, limitStudent: s.limitStudent })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create slots");
        }
      } else {
        // Edit: send existing IDs for update + new ones for insert
        const res = await fetch("/api/slot", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId, branchId,
            originalSlotIds: group?.slots.map((s) => s.id) ?? [],
            slots: slots.map((s) => ({
              id: s.dbId || null,
              day: s.day, time: s.time, duration: s.duration, limitStudent: s.limitStudent,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update slots");
        }
      }
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDelete = mode === "delete";

  const title = mode === "add" ? "Add Slot" : mode === "edit" ? "Edit Slot" : "Delete Slot";
  const submitText = isSubmitting
    ? (mode === "add" ? "Adding..." : mode === "edit" ? "Saving..." : "Deleting...")
    : (mode === "add" ? "Add Slot" : mode === "edit" ? "Save Changes" : "Confirm Delete");
  const submitColor = isDelete
    ? "bg-[#fd434f] hover:bg-[#e03340]"
    : "bg-[#23D2E2] hover:bg-[#18a9b8]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-8">
            {isDelete ? (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete all{" "}
                <span className="font-semibold text-foreground">{group?.slots.length}</span> slot(s) for{" "}
                <span className="font-semibold text-foreground">{group?.courseName}</span>
                {group?.branchName ? ` at ${group.branchName}` : ""}?
                This action cannot be undone.
              </p>
            ) : (
              <>
                {/* Program Select */}
                <FloatingSelect
                  label="Program"
                  value={courseId}
                  onChange={setCourseId}
                  options={courses.map((c) => ({ value: c.id, label: c.name }))}
                />

                {/* Branch Select */}
                {showBranch && (
                  <FloatingSelect
                    label="Branch"
                    value={branchId}
                    onChange={setBranchId}
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                )}

                {/* Slot entries */}
                <div className="space-y-5">
                  <h6 className="text-sm font-bold text-foreground">Time Slots</h6>

                  {slots.map((slot, index) => (
                    <div key={slot.tempId} className="flex items-center gap-3 pb-4 border-b border-border/50 last:border-b-0 last:pb-0">
                      <div className="flex-1 space-y-3">
                        <FloatingSelect
                          label="Day"
                          value={slot.day}
                          onChange={(val) => updateSlot(slot.tempId, { day: val })}
                          options={DAY_OPTIONS}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <FloatingInput
                            label="Time"
                            type="time"
                            value={slot.time}
                            onChange={(e) => updateSlot(slot.tempId, { time: e.target.value })}
                          />
                          <FloatingInput
                            label="Duration (mins)"
                            type="number"
                            value={slot.duration.toString()}
                            onChange={(e) => updateSlot(slot.tempId, { duration: parseInt(e.target.value) || 0 })}
                          />
                          <FloatingInput
                            label="Student Limit"
                            type="number"
                            value={slot.limitStudent.toString()}
                            onChange={(e) => updateSlot(slot.tempId, { limitStudent: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {index === 0 ? (
                        <button
                          type="button"
                          onClick={addSlot}
                          className="shrink-0 p-1 rounded-full border-2 border-[#23D2E2] transition-all duration-200 flex items-center justify-center hover:bg-[#23D2E2]/10 hover:shadow-md"
                          title="Add slot"
                        >
                          <Plus size={12} className="text-[#23D2E2]" strokeWidth={5} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.tempId)}
                          className="shrink-0 p-1 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                          title="Remove slot"
                        >
                          <Minus size={12} className="text-[#fd434f]" strokeWidth={5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn("w-full h-[50px] text-white font-bold rounded-[10px]", submitColor)}
            >
              {submitText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
