"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, Check, X, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryOption[];
  /** Selected category id, OR the literal "new" sentinel meaning "+ Add New Category". */
  value: string;
  onChange: (val: string) => void;
  onUpdate?: (
    id: string,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (
    id: string,
  ) => Promise<{ success: boolean; inUse?: boolean; error?: string }>;
  /** category_id → number of programs using it.  Delete icon is hidden when > 0. */
  usage?: Record<string, number>;
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  onUpdate,
  onDelete,
  usage = {},
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
        setError(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = categories.find((c) => c.id === value);
  const display =
    value === "new"
      ? "+ Add New Category"
      : selected?.name ?? "";

  const beginEdit = (cat: CategoryOption) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !onUpdate) return;
    const name = editingName.trim();
    if (!name) {
      setError("Name cannot be empty");
      return;
    }
    setBusy(true);
    const res = await onUpdate(editingId, name);
    setBusy(false);
    if (res.success) {
      setEditingId(null);
      setEditingName("");
      setError(null);
    } else {
      setError(res.error ?? "Failed to update");
    }
  };

  const doDelete = async (cat: CategoryOption) => {
    if (!onDelete) return;
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setBusy(true);
    const res = await onDelete(cat.id);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Failed to delete");
    }
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger — styled to match FloatingSelect */}
      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative h-[58px] w-full cursor-pointer rounded-[10px] border border-[#ADAFCA] bg-white px-4 py-3.5 transition-all duration-200",
          "focus:border-[#23D2E2] focus:outline-none",
          open && "border-[#23D2E2]",
        )}
      >
        <div className="flex h-full items-center justify-between">
          <span className={cn("text-base font-bold", display ? "text-foreground" : "text-[#ADAFCA]")}>
            {display || "Select category"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#ADAFCA] transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
        <label
          className={cn(
            "pointer-events-none absolute left-3 bg-white px-1 font-bold text-[#ADAFCA] transition-all",
            display
              ? "-top-2.5 text-xs"
              : "top-1/2 -translate-y-1/2 text-base",
          )}
        >
          Category
        </label>
      </div>

      {/* Popup */}
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[10px] border border-[#ADAFCA] bg-white shadow-lg">
          <div className="max-h-72 overflow-y-auto py-2">
            {/* + Add New Category */}
            <div
              onClick={() => {
                onChange("new");
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-[#23D2E2] hover:bg-[#23D2E2]/10"
            >
              <Plus className="h-4 w-4" />
              Add New Category
            </div>

            {categories.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No categories yet
              </div>
            ) : (
              categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const inUse = (usage[cat.id] ?? 0) > 0;
                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "group flex items-center gap-1 border-b border-gray-50 px-3 py-2 last:border-b-0",
                      value === cat.id && !isEditing && "bg-[#23D2E2]/5",
                    )}
                  >
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit();
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                              setError(null);
                            }
                          }}
                          disabled={busy}
                          className="flex-1 rounded-md border border-[#23D2E2] px-2 py-1.5 text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={busy}
                          className="rounded p-1.5 text-green-600 hover:bg-green-50"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setError(null);
                          }}
                          disabled={busy}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(cat.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-50",
                            value === cat.id && "font-semibold text-[#23D2E2]",
                          )}
                        >
                          {cat.name}
                        </button>
                        {onUpdate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginEdit(cat);
                            }}
                            className="rounded p-1.5 text-gray-500 opacity-60 hover:bg-gray-100 hover:opacity-100"
                            title="Rename category"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDelete && !inUse && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              doDelete(cat);
                            }}
                            className="rounded p-1.5 text-red-500 opacity-60 hover:bg-red-50 hover:opacity-100"
                            title="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
