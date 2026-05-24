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

export interface EventFormValues {
  title: string;
  description: string | null;
  event_type: EventType;
  scope: EventScope;
  audience: EventAudience;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  color: string;
  branch_id: string | null;
  company_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: Event | null;
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

function defaultScopeFor(role: UserRole, allowed: EventScope[]): EventScope {
  if (role === "super_admin" && allowed.includes("global")) return "global";
  if (role === "group_admin" && allowed.includes("company")) return "company";
  if ((role === "company_admin" || role === "assistant_admin") && allowed.includes("branch")) return "branch";
  return "self";
}

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
  const [date, setDate] = useState("");
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [branchId, setBranchId] = useState("");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "add" || !initial) {
      setTitle("");
      setDescription("");
      setEventType("activity");
      setScope(defaultScopeFor(callerRole, allowedScopes));
      setAudience("everyone");
      const defaultDate = defaults?.date ?? "";
      const defaultEndDate =
        defaults?.end_date && defaults.end_date !== defaults?.date
          ? defaults.end_date
          : "";
      setDate(defaultDate);
      setMultiDay(!!defaultEndDate);
      setEndDate(defaultEndDate);
      setStartTime("");
      setEndTime("");
      setColor("#22c55e");
      setBranchId("");
      setCompanyId("");
    } else {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setEventType(initial.event_type);
      setScope(initial.scope);
      setAudience(initial.audience);
      setDate(initial.date);
      setMultiDay(!!initial.end_date && initial.end_date !== initial.date);
      setEndDate(initial.end_date ?? "");
      setStartTime((initial.start_time ?? "").slice(0, 5));
      setEndTime((initial.end_time ?? "").slice(0, 5));
      setColor(initial.color);
      setBranchId(initial.branch_id ?? "");
      setCompanyId(initial.company_id ?? "");
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

  const scopeOptions = useMemo(
    () => allowedScopes.map((s) => ({ value: s, label: SCOPE_LABEL[s] })),
    [allowedScopes],
  );

  const submit = () => {
    if (!title.trim() || !date) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      scope,
      audience,
      date,
      end_date: multiDay && endDate ? endDate : null,
      start_time: startTime ? `${startTime}:00` : null,
      end_time: endTime ? `${endTime}:00` : null,
      color,
      branch_id: scope === "branch" ? branchId || null : null,
      company_id: scope === "branch" || scope === "company" ? companyId || null : null,
    });
  };

  const canSubmit =
    title.trim().length > 0 &&
    !!date &&
    (scope !== "branch" || (!!branchId && !!companyId)) &&
    (scope !== "company" || !!companyId) &&
    (!multiDay || (!!endDate && endDate >= date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Event" : "Edit Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => {
                  setMultiDay(e.target.checked);
                  if (!e.target.checked) setEndDate("");
                }}
              />
              Multi-day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {multiDay ? "Start Date" : "Date"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                required
              />
            </div>
            {multiDay && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Start Time (optional)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">End Time (optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full h-[42px] rounded-[10px] border border-[#ADAFCA] px-3 text-sm focus:border-[#23D2E2] focus:outline-none"
              />
            </div>
          </div>

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
