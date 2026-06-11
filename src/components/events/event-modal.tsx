"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import type {
  Event,
  EventAudience,
  EventScope,
  EventType,
  UserRole,
} from "@/db/schema";

interface Option {
  value: string;
  label: string;
}
interface BranchOption extends Option {
  companyId: string | null;
}

/**
 * Values produced by the modal. Mirrors `CreateEventInput` minus the
 * server-resolved fields (id, status, created_by_*). One of two shapes
 * matters depending on `is_recurring`:
 *   - is_recurring=false → at least one entry in `occurrences[]`.
 *   - is_recurring=true  → recurring_days + recurring_start_time + end_time,
 *     plus optionally recurring_start_date + recurring_end_date when bounded.
 */
export interface EventFormValues {
  title: string;
  description: string | null;
  event_type: EventType;
  scope: EventScope;
  audience: EventAudience;
  color: string;
  branch_id: string | null;
  company_id: string | null;
  // Specific-dates mode
  occurrences: { date: string; start_time: string | null; end_time: string | null }[];
  // Recurring config
  is_recurring: boolean;
  is_bounded: boolean;
  recurring_days: string[] | null;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  recurring_start_time: string | null;
  recurring_end_time: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: (Event & { occurrences?: { date: string; start_time: string | null; end_time: string | null }[] }) | null;
  defaults?: { date?: string; end_date?: string | null } | null;
  callerRole: UserRole;
  allowedScopes: EventScope[];
  branchOptions: BranchOption[];
  companyOptions: Option[];
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
}

const TYPE_OPTIONS: { value: EventType; label: string; color: string }[] = [
  { value: "activity", label: "Activity", color: "#22c55e" },
  { value: "competition", label: "Competition", color: "#ef4444" },
  { value: "own_schedule", label: "Own Schedule", color: "#23D2E2" },
  { value: "holiday", label: "Holiday", color: "#a855f7" },
];

const SCOPE_LABEL: Record<EventScope, string> = {
  self: "Self only",
  branch: "Branch",
  company: "Company",
  global: "Global",
};

const WEEKDAYS: { value: string; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

function defaultScopeFor(role: UserRole, allowed: EventScope[]): EventScope {
  if (role === "super_admin" && allowed.includes("global")) return "global";
  if (role === "group_admin" && allowed.includes("company")) return "company";
  if ((role === "company_admin" || role === "assistant_admin") && allowed.includes("branch")) return "branch";
  return "self";
}

type DateRow = { date: string; start_time: string; end_time: string };

const blankDateRow = (date = "", start = "", end = ""): DateRow => ({
  date,
  start_time: start,
  end_time: end,
});

export function EventModal({
  open,
  onOpenChange,
  mode,
  initial,
  defaults,
  callerRole,
  allowedScopes,
  branchOptions,
  companyOptions,
  onSubmit,
  isSubmitting,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("activity");
  const [scope, setScope] = useState<EventScope>("self");
  const [audience, setAudience] = useState<EventAudience>("everyone");
  const [color, setColor] = useState("#22c55e");
  const [branchId, setBranchId] = useState("");
  const [companyId, setCompanyId] = useState("");

  // Specific-dates mode — one row per occurrence with +/− icons.
  const [dateRows, setDateRows] = useState<DateRow[]>([blankDateRow()]);

  // Recurring config (only used when isRecurring=true).
  const [isRecurring, setIsRecurring] = useState(false);
  const [isBounded, setIsBounded] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringStartDate, setRecurringStartDate] = useState("");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringStartTime, setRecurringStartTime] = useState("");
  const [recurringEndTime, setRecurringEndTime] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "add" || !initial) {
      setTitle("");
      setDescription("");
      setEventType("activity");
      setScope(defaultScopeFor(callerRole, allowedScopes));
      setAudience("everyone");
      setColor("#22c55e");
      setBranchId("");
      setCompanyId("");
      setDateRows([blankDateRow(defaults?.date ?? "")]);
      setIsRecurring(false);
      setIsBounded(false);
      setRecurringDays([]);
      setRecurringStartDate("");
      setRecurringEndDate("");
      setRecurringStartTime("");
      setRecurringEndTime("");
    } else {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setEventType(initial.event_type);
      setScope(initial.scope);
      setAudience(initial.audience);
      setColor(initial.color);
      setBranchId(initial.branch_id ?? "");
      setCompanyId(initial.company_id ?? "");

      const recurring = !!initial.is_recurring;
      setIsRecurring(recurring);
      setIsBounded(!!initial.is_bounded);
      setRecurringDays(initial.recurring_days ?? []);
      setRecurringStartDate(initial.recurring_start_date ?? "");
      setRecurringEndDate(initial.recurring_end_date ?? "");
      setRecurringStartTime((initial.recurring_start_time ?? "").slice(0, 5));
      setRecurringEndTime((initial.recurring_end_time ?? "").slice(0, 5));

      if (recurring) {
        setDateRows([blankDateRow()]);
      } else {
        const occs = initial.occurrences ?? [];
        if (occs.length > 0) {
          setDateRows(
            occs.map((o) => ({
              date: o.date,
              start_time: (o.start_time ?? "").slice(0, 5),
              end_time: (o.end_time ?? "").slice(0, 5),
            })),
          );
        } else {
          // Pre-Phase-4 event with no occurrences row yet — fall back to the
          // legacy single (date, start_time, end_time) on the event itself.
          setDateRows([{
            date: initial.date,
            start_time: (initial.start_time ?? "").slice(0, 5),
            end_time: (initial.end_time ?? "").slice(0, 5),
          }]);
        }
      }
    }
  }, [open, mode, initial, defaults, callerRole, allowedScopes]);

  // When type changes, default the color (unless user has explicitly set it)
  useEffect(() => {
    const opt = TYPE_OPTIONS.find((t) => t.value === eventType);
    if (opt && (color === "#22c55e" || color === "#ef4444" || color === "#23D2E2" || color === "#a855f7" || color === "#615DFA")) {
      setColor(opt.color);
    }
  }, [eventType, color]);

  // When branch changes, auto-derive company
  useEffect(() => {
    if (scope === "branch" && branchId) {
      const b = branchOptions.find((o) => o.value === branchId);
      if (b?.companyId) setCompanyId(b.companyId);
    }
  }, [branchId, scope, branchOptions]);

  // Toggling Recurring off auto-disables Bounded (Multi-day only makes sense
  // when Recurring is on, per the user's spec).
  useEffect(() => {
    if (!isRecurring) setIsBounded(false);
  }, [isRecurring]);

  const scopeOptions = useMemo(
    () => allowedScopes.map((s) => ({ value: s, label: SCOPE_LABEL[s] })),
    [allowedScopes],
  );

  const toggleWeekday = (day: string) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const submit = () => {
    if (!title.trim()) return;

    const filledRows = dateRows.filter((r) => r.date);
    const occurrences = filledRows.map((r) => ({
      date: r.date,
      start_time: r.start_time ? `${r.start_time}:00` : null,
      end_time: r.end_time ? `${r.end_time}:00` : null,
    }));

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      scope,
      audience,
      color,
      branch_id: scope === "branch" ? branchId || null : null,
      company_id: scope === "branch" || scope === "company" ? companyId || null : null,
      occurrences: isRecurring ? [] : occurrences,
      is_recurring: isRecurring,
      is_bounded: isRecurring && isBounded,
      recurring_days: isRecurring ? recurringDays : null,
      recurring_start_date: isRecurring && isBounded ? recurringStartDate || null : null,
      recurring_end_date: isRecurring && isBounded ? recurringEndDate || null : null,
      recurring_start_time: isRecurring && recurringStartTime ? `${recurringStartTime}:00` : null,
      recurring_end_time: isRecurring && recurringEndTime ? `${recurringEndTime}:00` : null,
    });
  };

  // Submit gate per mode.
  const canSubmit = (() => {
    if (!title.trim()) return false;
    if (scope === "branch" && (!branchId || !companyId)) return false;
    if (scope === "company" && !companyId) return false;
    if (isRecurring) {
      if (recurringDays.length === 0) return false;
      if (!recurringStartTime || !recurringEndTime) return false;
      if (isBounded) {
        if (!recurringStartDate || !recurringEndDate) return false;
        if (recurringStartDate > recurringEndDate) return false;
      }
      return true;
    }
    // Specific dates: every filled row must have at least a date.
    const filled = dateRows.filter((r) => r.date);
    return filled.length > 0;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Event" : "Edit Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-1">
          <FloatingInput
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-[10px] border border-[#ADAFCA] px-3 py-2 text-sm focus:border-[#23D2E2] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FloatingSelect
              label="Type"
              value={eventType}
              onChange={(v) => setEventType(v as EventType)}
              options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            />
            <FloatingSelect
              label="Scope"
              value={scope}
              onChange={(v) => setScope(v as EventScope)}
              options={scopeOptions}
            />
          </div>

          {scope !== "self" && (
            <FloatingSelect
              label="Audience"
              value={audience}
              onChange={(v) => setAudience(v as EventAudience)}
              options={[
                { value: "everyone", label: "Everyone (incl. parents & students)" },
                { value: "staff_only", label: "Staff only" },
              ]}
            />
          )}

          {scope === "branch" && (
            <FloatingSelect
              label="Branch"
              value={branchId}
              onChange={setBranchId}
              options={branchOptions.map((b) => ({ value: b.value, label: b.label }))}
              searchable
            />
          )}

          {scope === "company" && (
            <FloatingSelect
              label="Company"
              value={companyId}
              onChange={setCompanyId}
              options={companyOptions}
              searchable
            />
          )}

          {/* Mode toggles. Recurring exposes weekday + recurring-times; adding
              Multi-day on top bounds the recurrence to a [start, end] range. */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring
            </label>
            <label
              className={`flex items-center gap-2 cursor-pointer ${!isRecurring ? "opacity-50 cursor-not-allowed" : ""}`}
              title={!isRecurring ? "Pick Recurring first" : ""}
            >
              <input
                type="checkbox"
                checked={isBounded}
                onChange={(e) => setIsBounded(e.target.checked)}
                disabled={!isRecurring}
              />
              Multi-day (set start &amp; end date)
            </label>
          </div>

          {/* MODE 1 — Specific dates */}
          {!isRecurring && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Dates &amp; times
              </div>
              {dateRows.map((row, idx) => {
                const isLast = idx === dateRows.length - 1;
                return (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">Date</label>
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            setDateRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, date: e.target.value } : r)),
                            )
                          }
                          className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">Start</label>
                        <input
                          type="time"
                          value={row.start_time}
                          onChange={(e) =>
                            setDateRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, start_time: e.target.value } : r,
                              ),
                            )
                          }
                          className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">End</label>
                        <input
                          type="time"
                          value={row.end_time}
                          onChange={(e) =>
                            setDateRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, end_time: e.target.value } : r,
                              ),
                            )
                          }
                          className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                        />
                      </div>
                    </div>
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDateRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="flex h-[42px] w-8 shrink-0 items-center justify-center rounded-full border border-[#ADAFCA] text-[#ADAFCA] hover:border-red-500 hover:text-red-500 transition"
                        aria-label="Remove this date"
                      >
                        <span className="text-lg leading-none">−</span>
                      </button>
                    ) : null}
                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => setDateRows((prev) => [...prev, blankDateRow()])}
                        className="flex h-[42px] w-8 shrink-0 items-center justify-center rounded-full border border-[#23D2E2] text-[#23D2E2] hover:bg-[#23D2E2] hover:text-white transition"
                        aria-label="Add another date"
                      >
                        <span className="text-lg leading-none">+</span>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODES 2 & 3 — Recurring (open-ended or bounded) */}
          {isRecurring && (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Days of the week
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const active = recurringDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleWeekday(d.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                          active
                            ? "bg-[#1A1A2E] text-white"
                            : "border border-[#1A1A2E]/15 bg-white text-[#1A1A2E]/70 hover:bg-[#1A1A2E]/5"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    value={recurringStartTime}
                    onChange={(e) => setRecurringStartTime(e.target.value)}
                    className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    value={recurringEndTime}
                    onChange={(e) => setRecurringEndTime(e.target.value)}
                    className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                  />
                </div>
              </div>

              {isBounded && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      min={recurringStartDate}
                      className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {!isBounded && (
                <p className="text-[11px] text-muted-foreground italic">
                  No date range — the event runs every future {recurringDays.length === 0 ? "selected weekday" : `${recurringDays.join("/")}`} until deleted.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded border border-[#ADAFCA] cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || isSubmitting}
            className="bg-[#23D2E2] hover:bg-[#18a9b8] text-white"
          >
            {isSubmitting ? "Saving..." : mode === "add" ? "Create" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
