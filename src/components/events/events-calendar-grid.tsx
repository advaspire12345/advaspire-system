"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, differenceInCalendarDays } from "date-fns";
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

  const visibleEvents = useMemo(
    () => events.filter((e) => e.status !== "rejected" && !e.deleted_at),
    [events],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of visibleEvents) {
      const start = new Date(ev.date + "T00:00:00");
      const endStr = ev.end_date && ev.end_date !== ev.date ? ev.end_date : ev.date;
      const end = new Date(endStr + "T00:00:00");
      for (const d of getDateRange(start, end)) {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    }
    return map;
  }, [visibleEvents]);

  const eventSlots = useMemo(() => {
    const slots = new Map<string, number>();
    const sorted = [...visibleEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const aDur = differenceInCalendarDays(
        new Date((a.end_date ?? a.date) + "T00:00:00"),
        new Date(a.date + "T00:00:00"),
      );
      const bDur = differenceInCalendarDays(
        new Date((b.end_date ?? b.date) + "T00:00:00"),
        new Date(b.date + "T00:00:00"),
      );
      return bDur - aDur;
    });
    const slotUsageByDate = new Map<string, Set<number>>();
    for (const ev of sorted) {
      const evStart = new Date(ev.date + "T00:00:00");
      const evEnd = new Date((ev.end_date ?? ev.date) + "T00:00:00");
      const dateStrs = getDateRange(evStart, evEnd).map((d) => format(d, "yyyy-MM-dd"));
      let slot = 0;
      while (dateStrs.some((ds) => slotUsageByDate.get(ds)?.has(slot))) slot++;
      slots.set(ev.id, slot);
      for (const ds of dateStrs) {
        if (!slotUsageByDate.has(ds)) slotUsageByDate.set(ds, new Set());
        slotUsageByDate.get(ds)!.add(slot);
      }
    }
    return slots;
  }, [visibleEvents]);

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
      for (let s = 0; s <= maxSlot; s++) {
        const ev = uniqueDayEvents.find((e) => eventSlots.get(e.id) === s);
        if (ev) {
          const isMultiDay = ev.end_date && ev.end_date !== ev.date;
          if (!isMultiDay) {
            eventRows.push({
              label: ev.title,
              color: ev.color,
              id: ev.id,
              event: ev,
              roundLeft: true,
              roundRight: true,
              showLabel: true,
              pending: ev.status === "pending",
            });
          } else {
            const isStart = dateStr === ev.date;
            const isEnd = dateStr === ev.end_date;
            const isSunday = day.date.getDay() === 0;
            const isSaturday = day.date.getDay() === 6;
            eventRows.push({
              label: ev.title,
              color: ev.color,
              id: ev.id,
              event: ev,
              roundLeft: isStart || isSunday,
              roundRight: isEnd || isSaturday,
              showLabel: isStart || (isSunday && !isStart),
              pending: ev.status === "pending",
            });
          }
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
    [eventsByDate, eventSlots, dragRender, onEditEvent],
  );

  return (
    <Calendar
      mode="single"
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
  );
}
