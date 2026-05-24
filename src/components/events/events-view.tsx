"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  Event,
  EventScope,
  EventType,
  EventAudience,
  UserRole,
} from "@/db/schema";
import { EventModal, type EventFormValues } from "@/components/events/event-modal";
import { EventsCalendarGrid } from "@/components/events/events-calendar-grid";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  approveEventAction,
  rejectEventAction,
} from "@/app/(dashboard)/events/actions";

const TYPE_LABEL: Record<EventType, string> = {
  activity: "Activity",
  competition: "Competition",
  own_schedule: "Own Schedule",
  holiday: "Holiday",
};

const TYPE_COLOR: Record<EventType, string> = {
  activity: "bg-green-100 text-green-700",
  competition: "bg-red-100 text-red-700",
  own_schedule: "bg-cyan-100 text-cyan-700",
  holiday: "bg-purple-100 text-purple-700",
};

const SCOPE_LABEL: Record<EventScope, string> = {
  self: "Self",
  branch: "Branch",
  company: "Company",
  global: "Global",
};

const AUDIENCE_LABEL: Record<EventAudience, string> = {
  everyone: "Everyone",
  staff_only: "Staff Only",
};

interface Option {
  value: string;
  label: string;
}
interface BranchOption extends Option {
  companyId: string | null;
}

interface Props {
  initialEvents: Event[];
  initialPending: Event[];
  callerRole: UserRole;
  allowedScopes: EventScope[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  branchOptions: BranchOption[];
  companyOptions: Option[];
}

function formatRange(e: Event): string {
  const start = format(new Date(e.date), "d MMM yyyy");
  if (!e.end_date || e.end_date === e.date) return start;
  const end = format(new Date(e.end_date), "d MMM yyyy");
  return `${start} → ${end}`;
}

export function EventsView({
  initialEvents,
  initialPending,
  callerRole,
  allowedScopes,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  branchOptions,
  companyOptions,
}: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [pending, setPending] = useState<Event[]>(initialPending);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<Event | null>(null);
  const [modalDefaults, setModalDefaults] = useState<{ date?: string; end_date?: string | null } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allCalendarEvents = useMemo(
    () => [...events, ...pending],
    [events, pending],
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const onAdd = () => {
    setError(null);
    setEditing(null);
    setModalDefaults(null);
    setModalMode("add");
    setModalOpen(true);
  };

  const onAddRange = (from: Date, to: Date) => {
    if (!canCreate) return;
    setError(null);
    setEditing(null);
    const [start, end] = from <= to ? [from, to] : [to, from];
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    setModalDefaults({
      date: startStr,
      end_date: endStr !== startStr ? endStr : null,
    });
    setModalMode("add");
    setModalOpen(true);
  };

  const onEdit = (e: Event) => {
    setError(null);
    setEditing(e);
    setModalDefaults(null);
    setModalMode("edit");
    setModalOpen(true);
  };

  const onDelete = (e: Event) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEventAction(e.id);
      if (!res.ok) setError(res.error);
      else setEvents((prev) => prev.filter((x) => x.id !== e.id));
    });
  };

  const onSave = (values: EventFormValues) => {
    setError(null);
    startTransition(async () => {
      if (modalMode === "add") {
        const res = await createEventAction(values);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        // Pending events go into the pending list; published into events list.
        if (res.event.status === "pending") {
          setPending((prev) => [res.event, ...prev]);
        } else {
          setEvents((prev) => [res.event, ...prev]);
        }
        setModalOpen(false);
      } else if (editing) {
        const res = await updateEventAction(editing.id, values);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setEvents((prev) => prev.map((x) => (x.id === res.event.id ? res.event : x)));
        setModalOpen(false);
      }
    });
  };

  const onApprove = (id: string) => {
    startTransition(async () => {
      const res = await approveEventAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const approved = pending.find((p) => p.id === id);
      setPending((prev) => prev.filter((p) => p.id !== id));
      if (approved) setEvents((prev) => [{ ...approved, status: "published" }, ...prev]);
    });
  };

  const onReject = (id: string) => {
    startTransition(async () => {
      const res = await rejectEventAction(id, rejectReason);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPending((prev) => prev.filter((p) => p.id !== id));
      setRejectingId(null);
      setRejectReason("");
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-[#23D2E2]" />
            <h2 className="text-base font-bold text-[#3e3f5e]">Calendar</h2>
            <span className="ml-2 text-[11px] text-[#8f91ac] hidden md:inline">
              Tap a date to add. Drag across days for a multi-day event.
            </span>
          </div>
          <EventsCalendarGrid
            events={allCalendarEvents}
            onCreateRange={canCreate ? onAddRange : () => {}}
            onEditEvent={canEdit ? onEdit : undefined}
          />
        </CardContent>
      </Card>

      {canApprove && pending.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#3e3f5e]">
                Pending Approvals ({pending.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pending.map((p) => (
                <div key={p.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#3e3f5e]">{p.title}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", TYPE_COLOR[p.event_type])}>
                        {TYPE_LABEL[p.event_type]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatRange(p)}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(p.id)}
                      disabled={isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingId(p.id)}
                      disabled={isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {rejectingId && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Reason for rejecting
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-amber-200 px-2 py-1 text-sm"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => onReject(rejectingId)} disabled={isPending}>
                    Confirm reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#3e3f5e]">All Events</h2>
            {canCreate && (
              <Button onClick={onAdd} className="bg-[#23D2E2] hover:bg-[#18a9b8] text-white">
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            )}
          </div>

          {sortedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No events yet. Click &quot;Add Event&quot; to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground border-b">
                    <th className="py-2">Title</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Scope</th>
                    <th className="py-2">Audience</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedEvents.map((e) => {
                    const isFromProgram = !!e.source_course_id;
                    return (
                      <tr key={e.id}>
                        <td className="py-3">
                          <div className="font-medium text-[#3e3f5e]">{e.title}</div>
                          {isFromProgram && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              Synced from Program
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", TYPE_COLOR[e.event_type])}>
                            {TYPE_LABEL[e.event_type]}
                          </span>
                        </td>
                        <td className="py-3">{SCOPE_LABEL[e.scope]}</td>
                        <td className="py-3 text-muted-foreground">
                          {e.scope === "self" ? "—" : AUDIENCE_LABEL[e.audience]}
                        </td>
                        <td className="py-3 text-muted-foreground">{formatRange(e)}</td>
                        <td className="py-3">
                          {e.status === "published" ? (
                            <span className="text-green-700 text-xs font-semibold">Published</span>
                          ) : e.status === "pending" ? (
                            <span className="text-amber-700 text-xs font-semibold">Pending</span>
                          ) : (
                            <span className="text-red-700 text-xs font-semibold" title={e.rejected_reason ?? ""}>
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {canEdit && !isFromProgram && (
                            <button
                              type="button"
                              onClick={() => onEdit(e)}
                              className="inline-flex items-center gap-1 text-xs text-[#23D2E2] hover:text-[#18a9b8] mr-3"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                          {canDelete && !isFromProgram && (
                            <button
                              type="button"
                              onClick={() => onDelete(e)}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                          {isFromProgram && (
                            <span className="text-xs text-muted-foreground">Manage in /program</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        initial={editing}
        defaults={modalDefaults}
        callerRole={callerRole}
        allowedScopes={allowedScopes}
        branchOptions={branchOptions}
        companyOptions={companyOptions}
        onSubmit={onSave}
        isSubmitting={isPending}
      />
    </div>
  );
}
