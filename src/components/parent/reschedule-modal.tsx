"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  fetchAvailableSlotsAction,
  rescheduleSessionAction,
} from "@/app/(parent)/parent/reschedule-actions";
import type { UpcomingSession, AvailableSlot } from "@/data/reschedules";

interface Props {
  open: boolean;
  session: UpcomingSession | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function dayLabel(day: string): string {
  return day ? day[0].toUpperCase() + day.slice(1) : day;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function formatDate(d: string): string {
  try {
    return format(new Date(d + "T00:00:00"), "EEE, d MMM yyyy");
  } catch {
    return d;
  }
}

export function RescheduleModal({ open, session, onClose, onSuccess }: Props) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !session) return;
    setSelectedSlot(null);
    setError(null);
    setLoadingSlots(true);
    fetchAvailableSlotsAction(session.enrollmentId, session.originalDate)
      .then((res) => {
        if (res.ok) setSlots(res.slots);
        else setError(res.error ?? "Failed to load slots.");
      })
      .catch(() => setError("Failed to load slots."))
      .finally(() => setLoadingSlots(false));
  }, [open, session]);

  if (!open || !session) return null;

  const canConfirm = !!selectedSlot && session.canReschedule;

  const handleConfirm = () => {
    if (!selectedSlot || !session) return;
    setError(null);
    startTransition(async () => {
      const res = await rescheduleSessionAction({
        enrollmentId: session.enrollmentId,
        originalDate: session.originalDate,
        newSlotId: selectedSlot,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess?.();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-visible rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-50 bg-gray-400 hover:bg-gray-600 text-white rounded-lg p-2.5 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#615DFA]/10">
            <CalendarIcon className="h-4 w-4 text-[#615DFA]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#3e3f5e]">Reschedule session</h3>
            <p className="text-xs text-[#8f91ac]">
              {session.studentName} &middot; {session.courseName}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-[#8f91ac] uppercase mb-1">
            Currently scheduled
          </p>
          <p className="text-sm font-semibold text-[#3e3f5e]">
            {formatDate(session.currentDate)}
          </p>
          <p className="text-xs text-[#8f91ac]">
            {dayLabel(session.currentSlotDay)} &middot; {formatTime(session.currentSlotTime)}
          </p>
        </div>

        {!session.canReschedule && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            This session is less than 24 hours away — it cannot be rescheduled.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mb-2">
          <p className="text-[11px] font-semibold text-[#8f91ac] uppercase">
            Pick a new timeslot
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 -mx-1 px-1">
          {loadingSlots ? (
            <p className="text-xs text-[#8f91ac] py-4 text-center">Loading slots…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-[#8f91ac] py-4 text-center">
              No other slots have capacity at least 24 hours from now.
            </p>
          ) : (
            slots.map((s) => {
              const isSelected = selectedSlot === s.slotId;
              return (
                <button
                  type="button"
                  key={s.slotId}
                  onClick={() => setSelectedSlot(s.slotId)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2 transition",
                    isSelected
                      ? "border-[#615DFA] bg-[#615DFA]/5 ring-2 ring-[#615DFA]/20"
                      : "border-gray-200 hover:border-[#615DFA]/40 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#3e3f5e]">
                        {formatDate(s.nextDate)}
                      </p>
                      <p className="text-xs text-[#8f91ac] flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {dayLabel(s.day)} &middot; {formatTime(s.time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-[#8f91ac] flex items-center gap-1 justify-end">
                        <Users className="h-3 w-3" />
                        {s.seatsRemaining} left
                      </p>
                      <p className="text-[10px] text-[#8f91ac]">of {s.limit}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 rounded-xl font-bold border-border hover:bg-muted"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
            className="flex-1 h-11 text-white font-bold rounded-xl bg-[#615DFA] hover:bg-[#4f4ad8] shadow-md"
          >
            {isPending ? "Rescheduling…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
