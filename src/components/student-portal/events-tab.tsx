"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Event, EventType } from "@/db/schema";

interface EventsTabProps {
  studentId: string;
}

const TYPE_LABEL: Record<EventType, string> = {
  activity: "Activity",
  competition: "Competition",
  own_schedule: "Personal",
  holiday: "Holiday",
};

export function EventsTab({ studentId }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: format(monthStart, "yyyy-MM-dd"),
        to: format(monthEnd, "yyyy-MM-dd"),
      });
      const res = await fetch(`/api/events?${params}`);
      if (res.ok) {
        const { events: list } = await res.json();
        setEvents(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const grouped = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of events) {
      const key = e.date;
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const onAdd = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          event_type: "own_schedule",
          scope: "self",
          date,
          color: "#23D2E2",
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setTitle("");
        setDate("");
        await load();
      }
    } finally {
      setSaving(false);
    }
    void studentId;
  };

  return (
    <div className="w-full text-white">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="rounded p-1 hover:bg-white/10"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-bold tracking-wide">
          {format(cursor, "MMMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded p-1 hover:bg-white/10"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdd((s) => !s)}
        className="mb-3 w-full rounded-lg bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold py-2 text-sm flex items-center justify-center gap-1"
      >
        <Plus className="h-4 w-4" />
        Add Personal Event
      </button>

      {showAdd && (
        <div className="mb-3 rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAdd}
              disabled={!title.trim() || !date || saving}
              className="text-xs px-3 py-1 rounded bg-[#23D2E2] hover:bg-[#18a9b8] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-white/70 py-6">Loading…</p>
      ) : grouped.length === 0 ? (
        <p className="text-center text-sm text-white/70 py-6">No events this month.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([dayKey, items]) => (
            <div key={dayKey}>
              <div className="text-[10px] uppercase font-bold text-white/60 tracking-wider mb-1">
                {format(new Date(dayKey), "EEE, d MMM")}
              </div>
              <div className="space-y-1.5">
                {items.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg bg-white/10 px-3 py-2 border-l-4"
                    style={{ borderLeftColor: ev.color }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold flex-1 truncate">{ev.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15">
                        {TYPE_LABEL[ev.event_type]}
                      </span>
                    </div>
                    {ev.end_date && ev.end_date !== ev.date && (
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Until {format(new Date(ev.end_date), "d MMM")}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-[11px] text-white/70 mt-0.5 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
