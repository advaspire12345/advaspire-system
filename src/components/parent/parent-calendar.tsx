"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { cn } from "@/lib/utils";
import { getDefaultClassNames, type DayButton } from "react-day-picker";
import type { ParentEvent } from "@/data/parent-portal";
import type { UpcomingClass } from "@/data/parent-portal";

interface ParentCalendarProps {
  scheduledDates: Date[];
  attendanceDates: Date[];
  parentId: string;
  initialEvents: ParentEvent[];
  upcomingClasses?: UpcomingClass[];
}

const eventColors = [
  { label: "Purple", value: "#615DFA" },
  { label: "Cyan", value: "#23D2E2" },
  { label: "Orange", value: "#F17521" },
  { label: "Pink", value: "#FB06D4" },
  { label: "Red", value: "#EB1A33" },
  { label: "Green", value: "#22c55e" },
];

// Helper: get all dates between two dates (inclusive)
function getDateRange(start: Date, end: Date): Date[] {
  const [from, to] =
    start <= end ? [start, end] : [end, start];
  const days: Date[] = [];
  const diff = differenceInCalendarDays(to, from);
  for (let i = 0; i <= diff; i++) {
    days.push(addDays(from, i));
  }
  return days;
}

export function ParentCalendar({
  scheduledDates,
  attendanceDates,
  parentId,
  initialEvents,
  upcomingClasses = [],
}: ParentCalendarProps) {
  const [events, setEvents] = useState<ParentEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drag state — use refs for imperative tracking (avoids stale closures in mouseup)
  // plus useState to trigger re-renders for highlighting
  const dragStartRef = useRef<Date | null>(null);
  const dragEndRef = useRef<Date | null>(null);
  const isDraggingRef = useRef(false);
  const [dragRender, setDragRender] = useState(0); // bump to force re-render on drag

  // Form state
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#615DFA");

  // Build a map of date -> events for quick lookup, expanding multi-day events
  const eventsByDate = new Map<string, ParentEvent[]>();
  for (const ev of events) {
    if (ev.endDate && ev.endDate !== ev.date) {
      const start = new Date(ev.date + "T00:00:00");
      const end = new Date(ev.endDate + "T00:00:00");
      const range = getDateRange(start, end);
      for (const d of range) {
        const key = format(d, "yyyy-MM-dd");
        if (!eventsByDate.has(key)) eventsByDate.set(key, []);
        eventsByDate.get(key)!.push(ev);
      }
    } else {
      const key = ev.date;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  }

  // Compute stable slot assignment for events so each event stays on the same
  // visual row across all days it spans (prevents "jumping" when events overlap)
  const eventSlots = new Map<string, number>();
  const sortedEventsForSlots = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const aDur = differenceInCalendarDays(
      new Date((a.endDate ?? a.date) + "T00:00:00"),
      new Date(a.date + "T00:00:00")
    );
    const bDur = differenceInCalendarDays(
      new Date((b.endDate ?? b.date) + "T00:00:00"),
      new Date(b.date + "T00:00:00")
    );
    return bDur - aDur; // longer events first
  });

  const slotUsageByDate = new Map<string, Set<number>>();
  for (const ev of sortedEventsForSlots) {
    const evStart = new Date(ev.date + "T00:00:00");
    const evEnd = new Date((ev.endDate ?? ev.date) + "T00:00:00");
    const range = getDateRange(evStart, evEnd);
    const dateStrs = range.map((d) => format(d, "yyyy-MM-dd"));

    let slot = 0;
    while (dateStrs.some((ds) => slotUsageByDate.get(ds)?.has(slot))) {
      slot++;
    }

    eventSlots.set(ev.id, slot);
    for (const ds of dateStrs) {
      if (!slotUsageByDate.has(ds)) slotUsageByDate.set(ds, new Set());
      slotUsageByDate.get(ds)!.add(slot);
    }
  }

  // Build a map of date -> upcoming classes
  const classesByDate = new Map<string, UpcomingClass[]>();
  for (const cls of upcomingClasses) {
    const key = cls.date;
    if (!classesByDate.has(key)) classesByDate.set(key, []);
    classesByDate.get(key)!.push(cls);
  }

  // Scheduled/attended date sets for modifier styling
  const scheduledSet = new Set(
    scheduledDates.map((d) => format(d, "yyyy-MM-dd"))
  );
  const attendedSet = new Set(
    attendanceDates.map((d) => format(d, "yyyy-MM-dd"))
  );

  // Compute drag range set for highlighting (reads refs, re-renders via dragRender)
  const dragRangeSet = new Set<string>();
  if (isDraggingRef.current && dragStartRef.current && dragEndRef.current) {
    const range = getDateRange(dragStartRef.current, dragEndRef.current);
    for (const d of range) {
      dragRangeSet.add(format(d, "yyyy-MM-dd"));
    }
  }

  // Open modal with the drag selection
  const openModalForRange = useCallback(
    (start: Date, end: Date) => {
      const [from, to] = start <= end ? [start, end] : [end, start];
      setSelectedDate(from);
      setSelectedEndDate(
        differenceInCalendarDays(to, from) > 0 ? to : null
      );
      setTitle("");
      setStartTime("09:00");
      setEndTime("");
      setColor("#615DFA");
      setShowAddModal(true);
    },
    []
  );

  // Global pointer move — use elementFromPoint to detect hovered day cell
  // (mouseenter doesn't work during drag due to browser implicit pointer capture)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const el = document.elementFromPoint(clientX, clientY);
      const dayBtn = el?.closest("[data-date]");
      if (dayBtn) {
        const dateAttr = dayBtn.getAttribute("data-date");
        if (dateAttr) {
          const d = new Date(dateAttr + "T00:00:00");
          if (!isNaN(d.getTime())) {
            dragEndRef.current = d;
            setDragRender((n) => n + 1);
          }
        }
      }
    };

    const handlePointerEnd = () => {
      if (isDraggingRef.current && dragStartRef.current && dragEndRef.current) {
        openModalForRange(dragStartRef.current, dragEndRef.current);
      }
      isDraggingRef.current = false;
      dragStartRef.current = null;
      dragEndRef.current = null;
      setDragRender((n) => n + 1);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("touchend", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("touchend", handlePointerEnd);
    };
  }, [openModalForRange]);

  // handleDayClick is now a no-op — drag flow handles everything via mousedown/mouseup
  const handleDayClick = () => {};

  const handleSave = async () => {
    if (!title.trim() || !selectedDate) return;

    setSaving(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const endDateStr = selectedEndDate
        ? format(selectedEndDate, "yyyy-MM-dd")
        : null;
      const res = await fetch("/api/parent/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: dateStr,
          endDate: endDateStr,
          startTime,
          endTime: endTime || null,
          color,
        }),
      });

      if (res.ok) {
        const newEvent = await res.json();
        setEvents((prev) => [...prev, newEvent]);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Failed to save event:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/parent/events?id=${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Events for the selected date range (for showing in modal)
  const selectedDateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : "";
  const selectedEndDateStr = selectedEndDate
    ? format(selectedEndDate, "yyyy-MM-dd")
    : selectedDateStr;

  // Gather events that overlap with the selected range
  const eventsOnDate = events.filter((e) => {
    const evStart = e.date;
    const evEnd = e.endDate ?? e.date;
    return evStart <= selectedEndDateStr && evEnd >= selectedDateStr;
  });

  // Modal date display
  const modalDateLabel = selectedDate
    ? selectedEndDate
      ? `${format(selectedDate, "EEEE, d MMMM")} → ${format(selectedEndDate, "EEEE, d MMMM yyyy")}`
      : format(selectedDate, "EEEE, d MMMM yyyy")
    : "";

  // Custom DayButton that renders date top-left + event pills in center + drag support
  const CustomDayButton = useCallback(
    ({
      className,
      day,
      modifiers,
      ...props
    }: React.ComponentProps<typeof DayButton>) => {
      const defaultClassNames = getDefaultClassNames();
      const ref = useRef<HTMLButtonElement>(null);
      useEffect(() => {
        if (modifiers.focused) ref.current?.focus();
      }, [modifiers.focused]);

      const dateStr = format(day.date, "yyyy-MM-dd");
      const dayEvents = eventsByDate.get(dateStr) ?? [];
      const dayClasses = classesByDate.get(dateStr) ?? [];
      const isScheduled = scheduledSet.has(dateStr);
      const isAttended = attendedSet.has(dateStr);
      const isInDragRange = dragRangeSet.has(dateStr);

      // Build slot-ordered pills for consistent vertical position across days
      // 1) Deduplicate events on this day
      const seenIds = new Set<string>();
      const uniqueDayEvents: ParentEvent[] = [];
      for (const ev of dayEvents) {
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          uniqueDayEvents.push(ev);
        }
      }

      // 2) Find max slot used on this day
      const slotsOnDay = uniqueDayEvents.map(
        (ev) => eventSlots.get(ev.id) ?? 0
      );
      const maxSlot =
        slotsOnDay.length > 0 ? Math.max(...slotsOnDay) : -1;

      // 3) Build slot array (null = placeholder to maintain alignment)
      type PillData = {
        label: string;
        color: string;
        id: string;
        roundLeft: boolean;
        roundRight: boolean;
        showLabel: boolean;
      };
      const eventRows: (PillData | null)[] = [];
      for (let s = 0; s <= maxSlot; s++) {
        const ev = uniqueDayEvents.find(
          (e) => eventSlots.get(e.id) === s
        );
        if (ev) {
          const isMultiDay = ev.endDate && ev.endDate !== ev.date;
          if (!isMultiDay) {
            eventRows.push({
              label: ev.title,
              color: ev.color,
              id: ev.id,
              roundLeft: true,
              roundRight: true,
              showLabel: true,
            });
          } else {
            const isEventStart = dateStr === ev.date;
            const isEventEnd = dateStr === ev.endDate;
            const isSunday = day.date.getDay() === 0;
            const isSaturday = day.date.getDay() === 6;

            eventRows.push({
              label: ev.title,
              color: ev.color,
              id: ev.id,
              roundLeft: isEventStart || isSunday,
              roundRight: isEventEnd || isSaturday,
              showLabel:
                isEventStart || (isSunday && !isEventStart),
            });
          }
        } else {
          eventRows.push(null); // empty placeholder
        }
      }

      // 4) Class pills (always single-day, rendered before event slots)
      const classPills = dayClasses.map((cls) => ({
        label: cls.courseName,
        color: "#23D2E2",
        roundLeft: true,
        roundRight: true,
        showLabel: true,
      }));

      // Total visible rows: events first (stable slots), then classes after
      const maxPills = 4;
      const visibleEventRows = eventRows.slice(0, maxPills);
      const visibleClassPills = classPills.slice(
        0,
        Math.max(0, maxPills - visibleEventRows.length)
      );
      const totalVisible =
        visibleEventRows.length + visibleClassPills.length;
      const totalAll =
        eventRows.filter(Boolean).length + classPills.length;

      return (
        <button
          {...props}
          ref={ref}
          type="button"
          data-day={day.date.toLocaleDateString()}
          data-date={dateStr}
          className={cn(
            "parent-day-btn relative flex flex-col items-start w-full h-full min-w-0 min-h-[3.75rem] md:min-h-[6.25rem] p-1.5 md:p-2 border-t border-[#e5e5e5] hover:bg-gray-50 transition-colors text-left cursor-pointer select-none touch-none",
            isScheduled && "bg-[#23D2E2]/8",
            isAttended && "bg-[#615DFA]/8",
            isInDragRange && "!bg-[#615DFA]/15 ring-1 ring-inset ring-[#615DFA]/30",
            modifiers.outside && "opacity-40",
            "group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-[#615DFA]/30",
            defaultClassNames.day,
            className
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            // Release implicit pointer capture so pointermove fires on other elements
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            dragStartRef.current = day.date;
            dragEndRef.current = day.date;
            isDraggingRef.current = true;
            setDragRender((n) => n + 1);
          }}
          onClick={(e) => {
            // Drag flow handles modal via pointerup. Prevent rdp default click.
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Date number — top left */}
          <span
            className={cn(
              "text-[11px] md:text-xs font-semibold leading-none flex items-center justify-center",
              modifiers.today
                ? "text-white bg-[#615DFA] rounded-full h-5 w-5 md:h-6 md:w-6"
                : "text-[#3e3f5e]",
              modifiers.outside && !modifiers.today && "text-[#8f91ac]"
            )}
          >
            {day.date.getDate()}
          </span>

          {/* Event pills — top-anchored for consistent row alignment */}
          {totalVisible > 0 && (
            <div className="absolute top-[18px] md:top-[22px] left-0 right-0 z-10 flex flex-col gap-0.5 pointer-events-none">
              {/* Event slots first (stable rows across days) */}
              {visibleEventRows.map((pill, i) =>
                pill ? (
                  <div
                    key={pill.id}
                    className={cn(
                      "py-px text-[8px] md:text-[9px] font-semibold text-white leading-tight min-w-0",
                      pill.roundLeft && pill.roundRight &&
                        "rounded-full mx-1 md:mx-1.5 px-1 md:px-1.5",
                      pill.roundLeft && !pill.roundRight &&
                        "rounded-l-full ml-1 md:ml-1.5 pl-1 md:pl-1.5 mr-0 pr-0",
                      !pill.roundLeft && pill.roundRight &&
                        "rounded-r-full mr-1 md:mr-1.5 pr-1 md:pr-1.5 -ml-px pl-0.5",
                      !pill.roundLeft && !pill.roundRight &&
                        "-ml-px mr-0 pl-0.5 pr-0",
                      pill.showLabel && "truncate"
                    )}
                    style={{ backgroundColor: pill.color }}
                  >
                    {pill.showLabel ? pill.label : "\u00A0"}
                  </div>
                ) : (
                  <div
                    key={`empty-${i}`}
                    className="py-px text-[8px] md:text-[9px] leading-tight invisible"
                  >
                    {"\u00A0"}
                  </div>
                )
              )}
              {/* Class pills after events (don't interfere with event row stability) */}
              {visibleClassPills.map((pill, i) => (
                <div
                  key={`cls-${i}`}
                  className="rounded-full mx-1 md:mx-1.5 px-1 md:px-1.5 py-px text-[8px] md:text-[9px] font-semibold text-white truncate leading-tight"
                  style={{ backgroundColor: pill.color }}
                >
                  {pill.label}
                </div>
              ))}
              {totalAll > maxPills && (
                <span className="text-[8px] font-semibold text-[#8f91ac] leading-none pl-1 md:pl-1.5">
                  +{totalAll - maxPills} more
                </span>
              )}
            </div>
          )}
        </button>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, upcomingClasses, dragRender]
  );

  return (
    <>
      <div className="rounded-xl bg-white p-4 md:p-5 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-[#23D2E2]" />
          <h2 className="text-base font-bold text-[#3e3f5e]">Calendar</h2>
        </div>

        <Calendar
          mode="multiple"
          selected={scheduledDates}
          onDayClick={handleDayClick}
          modifiers={{
            attended: attendanceDates,
            scheduled: scheduledDates,
          }}
          formatters={{
            formatWeekdayName: (date) => {
              const full = date.toLocaleDateString("en-US", { weekday: "long" });
              const short = date.toLocaleDateString("en-US", { weekday: "short" });
              return `${short}\t${full}`;
            },
          }}
          className="w-full"
          classNames={{
            root: "w-full",
            month: "flex flex-col w-full gap-4",
            table: "w-full [border-spacing:0] rounded-lg overflow-hidden",
            weekdays: "flex w-full",
            weekday:
              "flex-1 text-center text-xs font-semibold text-[#8f91ac] py-2",
            week: "flex w-full [&:last-child>.rdp-day>.parent-day-btn]:border-b [&:last-child>.rdp-day>.parent-day-btn]:border-b-[#e5e5e5]",
            day: "flex-1 relative p-0 select-none rdp-day min-w-0 [&:not(:first-child)>.parent-day-btn]:border-l",
          }}
          components={{
            DayButton: CustomDayButton,
            Weekday: ({ children, className, ...props }) => {
              const text = String(children ?? "");
              const [short, full] = text.includes("\t")
                ? text.split("\t")
                : [text, text];
              return (
                <th
                  className={cn(
                    "flex-1 text-center text-xs font-semibold text-[#8f91ac] py-2",
                    className
                  )}
                  {...props}
                >
                  <span className="md:hidden">{short}</span>
                  <span className="hidden md:inline">{full}</span>
                </th>
              );
            },
          }}
        />

        <div className="flex items-center gap-4 mt-3 px-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#23D2E2]" />
            <span className="text-[11px] font-medium text-[#8f91ac]">
              Scheduled
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#615DFA]" />
            <span className="text-[11px] font-medium text-[#8f91ac]">
              Attended
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FB06D4]" />
            <span className="text-[11px] font-medium text-[#8f91ac]">
              Event
            </span>
          </div>
        </div>

        {/* Upcoming: combined scheduled classes + custom events */}
        {(() => {
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const combined: {
            key: string;
            date: string;
            endDate: string | null;
            title: string;
            subtitle: string;
            color: string;
            type: "class" | "event";
            eventId?: string;
          }[] = [];

          // Add scheduled classes
          for (const cls of upcomingClasses) {
            if (cls.date >= todayStr) {
              combined.push({
                key: `class-${cls.date}-${cls.childName}`,
                date: cls.date,
                endDate: null,
                title: cls.courseName,
                subtitle: `${cls.childName} · ${cls.startTime}${cls.endTime ? ` - ${cls.endTime}` : ""}`,
                color: "#23D2E2",
                type: "class",
              });
            }
          }

          // Add custom events (show once, not expanded)
          for (const ev of events) {
            const evEnd = ev.endDate ?? ev.date;
            if (evEnd >= todayStr) {
              combined.push({
                key: `event-${ev.id}`,
                date: ev.date,
                endDate: ev.endDate,
                title: ev.title,
                subtitle: `${ev.startTime.slice(0, 5)}${ev.endTime ? ` - ${ev.endTime.slice(0, 5)}` : ""}`,
                color: ev.color,
                type: "event",
                eventId: ev.id,
              });
            }
          }

          // Sort by date, take 5
          combined.sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const items = combined.slice(0, 5);

          if (!items.length) return null;

          return (
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8f91ac] uppercase px-1">
                Upcoming
              </p>
              {items.map((item) => {
                // Format date label: multi-day shows range
                const dateLabel =
                  item.endDate && item.endDate !== item.date
                    ? `${format(new Date(item.date + "T00:00:00"), "d MMM")} - ${format(new Date(item.endDate + "T00:00:00"), "d MMM")}`
                    : format(new Date(item.date + "T00:00:00"), "d MMM, EEEE");

                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors group"
                    style={{ borderLeft: `3px solid ${item.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#3e3f5e] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#8f91ac]">
                        {dateLabel} &middot; {item.subtitle}
                      </p>
                    </div>
                    {item.type === "event" && item.eventId && (
                      <button
                        onClick={() => handleDelete(item.eventId!)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#8f91ac] hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Add Event Modal */}
      {showAddModal && selectedDate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-visible rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating close button — overlapping top-right */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute -top-4 -right-4 z-50 bg-gray-400 hover:bg-gray-600 text-white rounded-lg p-2.5 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#615DFA]/10">
                <Plus className="h-4 w-4 text-[#615DFA]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3e3f5e]">
                  Add Event
                </h3>
                <p className="text-xs text-[#8f91ac]">
                  {modalDateLabel}
                </p>
              </div>
            </div>

            {/* Existing events on this date range */}
            {eventsOnDate.length > 0 && (
              <div className="mb-5 space-y-1.5">
                <p className="text-[11px] font-semibold text-[#8f91ac] uppercase">
                  Events on {selectedEndDate ? "these days" : "this day"}
                </p>
                {eventsOnDate.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50"
                    style={{ borderLeft: `3px solid ${ev.color}` }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#3e3f5e]">
                        {ev.title}
                      </p>
                      <p className="text-xs text-[#8f91ac]">
                        {ev.startTime.slice(0, 5)}
                        {ev.endTime ? ` - ${ev.endTime.slice(0, 5)}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="p-1 rounded text-[#8f91ac] hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Title — FloatingInput style */}
            <div className="mb-4">
              <FloatingInput
                label="Event Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Time row — FloatingInput style */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <FloatingInput
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <FloatingInput
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-[#8f91ac] uppercase block mb-1.5">
                Color
              </label>
              <div className="flex gap-2">
                {eventColors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      outline:
                        color === c.value ? `2px solid ${c.value}` : "none",
                      outlineOffset: "2px",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
                className="flex-1 h-11 rounded-xl font-bold border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 h-11 text-white font-bold rounded-xl bg-[#23D2E2] hover:bg-[#18a9b8] shadow-md"
              >
                {saving ? "Saving..." : "Save Event"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
