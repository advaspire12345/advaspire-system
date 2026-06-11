"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import type { TransferableStudent } from "@/data/session-transfers";

interface SessionTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: TransferableStudent[];
  onCreated: () => void;
}

export function SessionTransferModal({ open, onOpenChange, students, onCreated }: SessionTransferModalProps) {
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [sessions, setSessions] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromOptions = useMemo(
    () =>
      students
        .filter((s) => s.sessionsAvailable > 0)
        .map((s) => ({
          value: `${s.id}__${s.courseId}`,
          label: `${s.name} — ${s.courseName} (${s.sessionsAvailable} left)`,
        })),
    [students],
  );

  const fromSelected = useMemo(
    () => students.find((s) => `${s.id}__${s.courseId}` === fromKey),
    [fromKey, students],
  );

  const toOptions = useMemo(() => {
    if (!fromSelected) return [];
    return students
      .filter(
        (s) =>
          s.courseId === fromSelected.courseId &&
          s.id !== fromSelected.id,
      )
      .map((s) => ({
        value: `${s.id}__${s.courseId}`,
        label: `${s.name}${s.parentName ? ` (${s.parentName})` : ""}`,
      }));
  }, [fromSelected, students]);

  const reset = () => {
    setFromKey("");
    setToKey("");
    setSessions("");
    setNotes("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const toSelected = students.find((s) => `${s.id}__${s.courseId}` === toKey);
    if (!fromSelected || !toSelected) {
      setError("Select both From and To students.");
      return;
    }
    if (fromSelected.courseId !== toSelected.courseId) {
      setError("Both students must share the same course.");
      return;
    }
    const n = Number(sessions);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Sessions must be greater than zero.");
      return;
    }
    if (n > fromSelected.sessionsAvailable) {
      setError(`Only ${fromSelected.sessionsAvailable} sessions available to transfer.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/session-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_student_id: fromSelected.id,
          to_student_id: toSelected.id,
          course_id: fromSelected.courseId,
          sessions: n,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to create transfer.");
        setIsSubmitting(false);
        return;
      }
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Session Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingSelect
            label="From student"
            value={fromKey}
            onChange={(v) => {
              setFromKey(v);
              setToKey("");
            }}
            options={fromOptions}
            placeholder="Select sender"
          />

          <FloatingSelect
            label="To student"
            value={toKey}
            onChange={setToKey}
            options={toOptions}
            placeholder={fromSelected ? "Select receiver" : "Pick From first"}
            disabled={!fromSelected}
          />

          <FloatingInput
            label="Sessions"
            type="number"
            min={1}
            max={fromSelected?.sessionsAvailable ?? undefined}
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
          />

          <FloatingInput
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
