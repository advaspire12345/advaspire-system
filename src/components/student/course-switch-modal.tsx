"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingSelect } from "@/components/ui/floating-select";
import { FloatingInput } from "@/components/ui/floating-input";

interface CourseOption {
  id: string;
  name: string;
}

interface CourseSwitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  currentCourseId: string;
  currentCourseName?: string | null;
  sessionsRemaining: number;
  courses: CourseOption[];
  onSwitched: () => void;
}

export function CourseSwitchModal({
  open,
  onOpenChange,
  enrollmentId,
  currentCourseId,
  currentCourseName,
  sessionsRemaining,
  courses,
  onSwitched,
}: CourseSwitchModalProps) {
  const router = useRouter();
  const [newCourseId, setNewCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(
    () =>
      courses
        .filter((c) => c.id !== currentCourseId)
        .map((c) => ({ value: c.id, label: c.name })),
    [courses, currentCourseId],
  );

  const reset = () => {
    setNewCourseId("");
    setNotes("");
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newCourseId) {
      setError("Pick a target course.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/switch-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_course_id: newCourseId, notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to switch course.");
        setSubmitting(false);
        return;
      }
      reset();
      onOpenChange(false);
      onSwitched();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setSubmitting(false);
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
          <DialogTitle>Move to another course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
            From: <span className="font-semibold">{currentCourseName ?? "Current course"}</span>
            <br />
            Sessions to carry over: <span className="font-semibold">{sessionsRemaining}</span>
          </div>

          <FloatingSelect
            label="Target course"
            value={newCourseId}
            onChange={setNewCourseId}
            options={options}
            placeholder="Pick the new course"
          />

          <FloatingInput
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <p className="text-xs text-muted-foreground">
            Sessions transfer 1:1. If you need to refund or top up the price difference, use the
            payment-edit modal afterward.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Moving..." : "Move student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
