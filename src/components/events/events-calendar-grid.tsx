"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addMonths, differenceInCalendarDays } from "date-fns";
import { getDefaultClassNames, type DayButton } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { Event } from "@/db/schema";

interface Props {
  events: Event[];
  onCreateRange: (from: Date, to: Date) => void;
  onEditEvent?: (event: Event) => void;
}

function getDateRange(start: Date, end: Date): Date[] {
  const [from, to] = start <= end ? [start, end] : [end, start];
  const days: Date[] = [];
  const diff = differenceInCalendarDays(to, from);
  for (let i = 0; i <= diff; i++) days.push(addDays(from, i));
  return days;
}

export function EventsCalendarGrid({ events, onCreateRange, onEditEvent }: Props) {
  const dragStartRef = useRef<Date | null>(null);
  const dragEndRef = useRef<Date | null>(null);
  const isDraggingRef = useRef(false);
  const movedRef = useRef(false);
  const [dragRender, setDragRender] = useState(0);
  // Take control of which month is visible so (a) the chevron buttons actually
  // navigate (without explicit `month`/`onMonthChange` DayPicker can swallow
  // re-renders) and (b) the recurring-event expansion below can use the
  // currently-visible month instead of today (which would otherwise drop
  // events when the user navigates).
  const [month, setMonth] = useState<Date>(() => new Date());
  const monthStart = useMemo(() => {
    const d = new Date(month);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [month]);

  const visibleEvents = useMemo(
    () => events.filter((e) => e.status !== "rejected" && !e.deleted_at),
    [events],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const pushAt = (dateStr: string, ev: Event) => {
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(ev);
    };
    for (const ev of visibleEvents) {
      if (ev.is_recurring) {
        // Recurring events expand across the visible month range (and a one
        // month buffer either side to cover the calendar's neighbouring weeks).
        // For open-ended ones we cap at the buffer too — the visible window is
        // what matters for the user looking at "this month".
        const days = ev.recurring_days ?? [];
        if (days.length === 0) continue;
        const winStart = new Date(monthStart);
        winStart.setMonth(winStart.getMonth() - 1);
        const winEnd = new Date(monthStart);
        winEnd.setMonth(winEnd.getMonth() + 2);
        const lowerBound = ev.is_bounded && ev.recurring_start_date
          ? new Date(ev.recurring_start_date + "T00:00:00")
          : winStart;
        const upperBound = ev.is_bounded && ev.recurring_end_date
          ? new Date(ev.recurring_end_date + "T00:00:00")
          : winEnd;
        const lo = winStart > lowerBound ? winStart : lowerBound;
        const hi = winEnd < upperBound ? winEnd : upperBound;
        for (const d of getDateRange(lo, hi)) {
          if (days.includes(weekdayNames[d.getDay()])) {
            pushAt(format(d, "yyyy-MM-dd"), ev);
          }
        }
      } else if (ev.occurrences && ev.occurrences.length > 0) {
        // Specific-dates mode with proper occurrences loaded.
        for (const o of ev.occurrences) {
          pushAt(o.date, ev);
        }
      } else {
        // Fallback to the legacy denormalised columns (single date or range).
        const start = new Date(ev.date + "T00:00:00");
        const endStr = ev.end_date && ev.end_date !== ev.date ? ev.end_date : ev.date;
        const end = new Date(endStr + "T00:00:00");
        for (const d of getDateRange(start, end)) {
          pushAt(format(d, "yyyy-MM-dd"), ev);
        }
      }
    }
    return map;
  }, [visibleEvents, monthStart]);

  // For each event, the sorted list of all dates it appears on, as YYYY-MM-DD.
  // Derived from eventsByDate so it covers specific dates, multi-day ranges,
  // and recurring-weekly patterns uniformly. Used both for slot assignment
  // and for the per-day pill-shape adjacency check below.
  const eventDates = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [date, list] of eventsByDate.entries()) {
      for (const ev of list) {
        const arr = m.get(ev.id) ?? [];
        arr.push(date);
        m.set(ev.id, arr);
      }
    }
    for (const arr of m.values()) arr.sort();
    return m;
  }, [eventsByDate]);

  const eventSlots = useMemo(() => {
    const slots = new Map<string, number>();
    // Sort by first-appearance date, then by occurrence count (longer first
    // so multi-day spans get the top slot — less visual hopping).
    const sorted = [...visibleEvents].sort((a, b) => {
      const aDates = eventDates.get(a.id) ?? [];
      const bDates = eventDates.get(b.id) ?? [];
      const aFirst = aDates[0] ?? a.date;
      const bFirst = bDates[0] ?? b.date;
      if (aFirst !== bFirst) return aFirst < bFirst ? -1 : 1;
      return bDates.length - aDates.length;
    });
    const slotUsageByDate = new Map<string, Set<number>>();
    for (const ev of sorted) {
      const dateStrs = eventDates.get(ev.id) ?? [];
      if (dateStrs.length === 0) continue;
      let slot = 0;
      while (dateStrs.some((ds) => slotUsageByDate.get(ds)?.has(slot))) slot++;
      slots.set(ev.id, slot);
      for (const ds of dateStrs) {
        if (!slotUsageByDate.has(ds)) slotUsageByDate.set(ds, new Set());
        slotUsageByDate.get(ds)!.add(slot);
      }
    }
    return slots;
  }, [visibleEvents, eventDates]);

  // Set of "dateStr|eventId" pairs for O(1) adjacency lookup when drawing a
  // pill — "is this event also on the previous / next calendar day?".
  const dateEventKey = useMemo(() => {
    const s = new Set<string>();
    for (const [date, list] of eventsByDate.entries()) {
      for (const ev of list) s.add(`${date}|${ev.id}`);
    }
    return s;
  }, [eventsByDate]);

  const dragRangeSet = new Set<string>();
  if (isDraggingRef.current && dragStartRef.current && dragEndRef.current) {
    for (const d of getDateRange(dragStartRef.current, dragEndRef.current)) {
      dragRangeSet.add(format(d, "yyyy-MM-dd"));
    }
  }

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
            if (
              !dragEndRef.current ||
              format(dragEndRef.current, "yyyy-MM-dd") !== dateAttr
            ) {
              movedRef.current = true;
            }
            dragEndRef.current = d;
            setDragRender((n) => n + 1);
          }
        }
      }
    };

    const handlePointerEnd = () => {
      if (isDraggingRef.current && dragStartRef.current && dragEndRef.current) {
        onCreateRange(dragStartRef.current, dragEndRef.current);
      }
      isDraggingRef.current = false;
      dragStartRef.current = null;
      dragEndRef.current = null;
      movedRef.current = false;
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
  }, [onCreateRange]);

  const CustomDayButton = useCallback(
    ({
      className,
      day,
      modifiers,
      ...props
    }: React.ComponentProps<typeof DayButton>) => {
      const defaultClassNames = getDefaultClassNames();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const ref = useRef<HTMLButtonElement>(null);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (modifiers.focused) ref.current?.focus();
      }, [modifiers.focused]);

      const dateStr = format(day.date, "yyyy-MM-dd");
      const dayEvents = eventsByDate.get(dateStr) ?? [];
      const isInDragRange = dragRangeSet.has(dateStr);

      const seenIds = new Set<string>();
      const uniqueDayEvents: Event[] = [];
      for (const ev of dayEvents) {
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          uniqueDayEvents.push(ev);
        }
      }

      const slotsOnDay = uniqueDayEvents.map((ev) => eventSlots.get(ev.id) ?? 0);
      const maxSlot = slotsOnDay.length > 0 ? Math.max(...slotsOnDay) : -1;

      type PillData = {
        label: string;
        color: string;
        id: string;
        event: Event;
        roundLeft: boolean;
        roundRight: boolean;
        showLabel: boolean;
        pending: boolean;
      };
      const eventRows: (PillData | null)[] = [];
      const isSunday = day.date.getDay() === 0;
      const isSaturday = day.date.getDay() === 6;
      const prevDateStr = format(addDays(day.date, -1), "yyyy-MM-dd");
      const nextDateStr = format(addDays(day.date, 1), "yyyy-MM-dd");
      for (let s = 0; s <= maxSlot; s++) {
        const ev = uniqueDayEvents.find((e) => eventSlots.get(e.id) === s);
        if (ev) {
          // Adjacency-driven pill shape — works uniformly for single-day
          // events, multi-day continuous ranges, multi-occurrence specific
          // dates (each occurrence isolated → own rounded pill with label),
          // and recurring weekly patterns. The legacy date/end_date or
          // is_multi_day flags are no longer consulted here.
          const hasPrev = dateEventKey.has(`${prevDateStr}|${ev.id}`);
          const hasNext = dateEventKey.has(`${nextDateStr}|${ev.id}`);
          const continuesFromPrev = hasPrev && !isSunday; // week boundary: Sun is start of new row
          const continuesToNext = hasNext && !isSaturday; // week boundary: Sat ends the row
          eventRows.push({
            label: ev.title,
            color: ev.color,
            id: ev.id,
            event: ev,
            roundLeft: !continuesFromPrev,
            roundRight: !continuesToNext,
            // Show the label whenever the pill starts here (no continuation
            // from yesterday) OR a new week begins (Sunday) — so even a long
            // continuous pill carries its title on every visible row.
            showLabel: !continuesFromPrev,
            pending: ev.status === "pending",
          });
        } else {
          eventRows.push(null);
        }
      }

      const maxPills = 4;
      const visible = eventRows.slice(0, maxPills);
      const totalAll = eventRows.filter(Boolean).length;

      return (
        <button
          {...props}
          ref={ref}
          type="button"
          data-day={day.date.toLocaleDateString()}
          data-date={dateStr}
          className={cn(
            "events-day-btn relative flex flex-col items-start w-full h-full min-w-0 min-h-[4.5rem] md:min-h-[6.5rem] p-1.5 md:p-2 border-t border-[#e5e5e5] hover:bg-gray-50 transition-colors text-left cursor-pointer select-none touch-none",
            isInDragRange &&
              "!bg-[#23D2E2]/15 ring-1 ring-inset ring-[#23D2E2]/40",
            modifiers.outside && "opacity-40",
            "group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-[#23D2E2]/30",
            defaultClassNames.day,
            className,
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            dragStartRef.current = day.date;
            dragEndRef.current = day.date;
            isDraggingRef.current = true;
            movedRef.current = false;
            setDragRender((n) => n + 1);
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span
            className={cn(
              "text-[11px] md:text-xs font-semibold leading-none flex items-center justify-center",
              modifiers.today
                ? "text-white bg-[#23D2E2] rounded-full h-5 w-5 md:h-6 md:w-6"
                : "text-[#3e3f5e]",
              modifiers.outside && !modifiers.today && "text-[#8f91ac]",
            )}
          >
            {day.date.getDate()}
          </span>

          {visible.length > 0 && (
            <div className="absolute top-[18px] md:top-[22px] left-0 right-0 z-10 flex flex-col gap-0.5">
              {visible.map((pill, i) =>
                pill ? (
                  <div
                    key={pill.id}
                    role={onEditEvent ? "button" : undefined}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      if (!onEditEvent) return;
                      e.preventDefault();
                      e.stopPropagation();
                      onEditEvent(pill.event);
                    }}
                    className={cn(
                      "py-px text-[8px] md:text-[9px] font-semibold text-white leading-tight min-w-0 cursor-pointer",
                      pill.roundLeft &&
                        pill.roundRight &&
                        "rounded-full mx-1 md:mx-1.5 px-1 md:px-1.5",
                      pill.roundLeft &&
                        !pill.roundRight &&
                        "rounded-l-full ml-1 md:ml-1.5 pl-1 md:pl-1.5 mr-0 pr-0",
                      !pill.roundLeft &&
                        pill.roundRight &&
                        "rounded-r-full mr-1 md:mr-1.5 pr-1 md:pr-1.5 -ml-px pl-0.5",
                      !pill.roundLeft && !pill.roundRight && "-ml-px mr-0 pl-0.5 pr-0",
                      pill.showLabel && "truncate",
                      pill.pending && "ring-1 ring-amber-400 ring-inset opacity-80",
                    )}
                    style={{ backgroundColor: pill.color }}
                    title={pill.pending ? `${pill.label} (pending approval)` : pill.label}
                  >
                    {pill.showLabel ? pill.label : " "}
                  </div>
                ) : (
                  <div
                    key={`empty-${i}`}
                    className="py-px text-[8px] md:text-[9px] leading-tight invisible"
                  >
                    {" "}
                  </div>
                ),
              )}
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
    [eventsByDate, eventSlots, dateEventKey, dragRender, onEditEvent],
  );

  return (
    <div className="space-y-3">
      {/* Explicit header — replaces DayPicker's built-in nav (the chevrons
          inside DayPicker get swallowed by our overridden classNames + the
          drag-to-create handlers). Buttons here unambiguously navigate. */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e5] text-[#3e3f5e] hover:bg-[#23D2E2]/10 hover:border-[#23D2E2] transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm md:text-base font-bold text-[#3e3f5e]">
          {format(monthStart, "MMMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e5] text-[#3e3f5e] hover:bg-[#23D2E2]/10 hover:border-[#23D2E2] transition"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    <Calendar
      mode="single"
      month={month}
      onMonthChange={setMonth}
      onDayClick={() => {}}
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
        // Hide DayPicker's built-in nav + caption — our own header above
        // handles month navigation.
        nav: "hidden",
        month_caption: "hidden",
        table: "w-full [border-spacing:0] rounded-lg overflow-hidden",
        weekdays: "flex w-full",
        weekday: "flex-1 text-center text-xs font-semibold text-[#8f91ac] py-2",
        week: "flex w-full [&:last-child>.rdp-day>.events-day-btn]:border-b [&:last-child>.rdp-day>.events-day-btn]:border-b-[#e5e5e5]",
        day: "flex-1 relative p-0 select-none rdp-day min-w-0 [&:not(:first-child)>.events-day-btn]:border-l",
      }}
      components={{
        DayButton: CustomDayButton,
        Weekday: ({ children, className, ...props }) => {
          const text = String(children ?? "");
          const [short, full] = text.includes("\t") ? text.split("\t") : [text, text];
          return (
            <th
              className={cn(
                "flex-1 text-center text-xs font-semibold text-[#8f91ac] py-2",
                className,
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
    </div>
  );
}
