"use client";

import Image from "next/image";
import type { Event } from "@/data/landing-mock";

interface UpcomingEventsListProps {
  events: Event[];
}

export function UpcomingEventsList({ events }: UpcomingEventsListProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Upcoming Events
        </h4>
        <span className="text-xs font-bold text-[#adafca]">{events.length}</span>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <div className="space-y-6">
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface EventItemProps {
  event: Event;
}

function EventItem({ event }: EventItemProps) {
  const date = new Date(event.date);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Event Photo */}
      <div className="relative h-[140px] w-full overflow-hidden rounded-xl">
        <Image
          src={event.imageUrl}
          alt={event.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Event Details */}
      <div className="flex gap-4">
        {/* Date Rectangle */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#615dfa]">
          <span className="text-lg font-bold leading-tight text-white">{day}</span>
          <span className="text-[10px] font-bold uppercase text-white/80">
            {month}
          </span>
        </div>

        {/* Event Info */}
        <div className="flex-1">
          <h5 className="text-sm font-bold text-[#3e3f5e]">{event.name}</h5>
          <p className="mt-1 text-xs font-medium text-[#adafca]">{event.time}</p>
          <p className="mt-1 line-clamp-2 text-xs text-[#8f91ac]">
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
}
