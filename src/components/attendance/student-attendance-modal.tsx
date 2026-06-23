"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AttendanceRow } from "@/components/attendance/attendance-table";

interface CurriculumLesson {
  id: string;
  title: string;
  missions: {
    level: number | null;
    url_mission: string | null;
    url_answer: string | null;
  }[];
}

export type ModalMode = "add" | "present" | "absent";

interface InstructorOption {
  id: string;
  name: string;
}

interface StudentAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  allStudents: AttendanceRow[];
  selectedRow?: AttendanceRow | null;
  instructors: InstructorOption[];
  onSubmit: (formData: AttendanceFormData) => Promise<void>;
  /** Function to fetch curriculum lessons for a course */
  fetchCurriculumLessons?: (courseId: string) => Promise<CurriculumLesson[]>;
  /** If set, the instructor name is fixed (instructor role — auto-fill, read-only) */
  currentUserName?: string;
}

export interface AttendanceFormData {
  enrollmentId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  classType: "Physical" | "Online";
  actualDay: string;
  actualStartTime: string;
  notes: string;
  // Flexible array of activities done in this session. Each entry is one
  // {lesson, mission} pair. The first entry is the primary activity.
  activities: { lesson: string; mission: string }[];
  // Trial-specific field
  instructorFeedback?: string;
  isTrial?: boolean;
  // Existing attendance ID for updates (prevents creating duplicates)
  attendanceId?: string;
  // Original slot info from enrollment schedule (never changes)
  slotDay?: string;
  slotTime?: string;
}

const DAYS_OF_WEEK = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];

const CLASS_TYPES = [
  { value: "Physical", label: "Physical" },
  { value: "Online", label: "Online" },
];

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getCurrentDayOfWeek(): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
}

/** Day-of-week name for a 'yyyy-MM-dd' string, computed in local time. */
function dayNameFromDateStr(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(y, m - 1, d).getDay()];
}

/**
 * Calculate the date for a given day name within the current week (Mon-Sun).
 * Returns the date in YYYY-MM-DD format.
 */
function getDateForDayInCurrentWeek(dayName: string): string {
  try {
    const dayMap: Record<string, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };

    const targetDayIndex = dayMap[dayName];
    if (targetDayIndex === undefined) {
      // If invalid day, return today
      return format(new Date(), "yyyy-MM-dd");
    }

    // Calculate current week's Monday
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + mondayOffset);
    currentWeekMonday.setHours(0, 0, 0, 0);

    // Calculate the date for the target day within this week
    // Sunday is at index 0, but in our week it's at position 6 (end of week)
    const daysFromMonday = targetDayIndex === 0 ? 6 : targetDayIndex - 1;
    const targetDate = new Date(currentWeekMonday);
    targetDate.setDate(currentWeekMonday.getDate() + daysFromMonday);

    return format(targetDate, "yyyy-MM-dd");
  } catch (error) {
    console.error('Error calculating date:', error);
    return format(new Date(), "yyyy-MM-dd");
  }
}

function formatTimeForInput(time: string | null): string {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

interface SlotWindow {
  startTime: string;
  endTime: string;
  label: string;
}

/**
 * Pick the default slot for the current time:
 *  - the window containing now (start <= now < end), else
 *  - the first window starting after now (next slot), else
 *  - the last window.
 * Returns "" if there are no windows.
 */
function pickDefaultSlotStart(windows: SlotWindow[], now: string): string {
  if (windows.length === 0) return "";
  const containing = windows.find((w) => now >= w.startTime && now < w.endTime);
  if (containing) return containing.startTime;
  const next = windows.find((w) => w.startTime > now);
  if (next) return next.startTime;
  return windows[windows.length - 1].startTime;
}

export function StudentAttendanceModal({
  open,
  onOpenChange,
  mode,
  allStudents,
  selectedRow,
  instructors,
  onSubmit,
  fetchCurriculumLessons,
  currentUserName,
}: StudentAttendanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [classType, setClassType] = useState<"Physical" | "Online">("Physical");
  const [actualDay, setActualDay] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  // Add-mode slot selection: the scheduled slot windows for the chosen course,
  // and the start time ("HH:MM") of the slot the user selected.
  const [slotWindows, setSlotWindows] = useState<SlotWindow[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState("");
  // One-off manual slot timing (when the chosen day has no scheduled slot).
  const [manualSlot, setManualSlot] = useState(false);
  const [manualSlotStart, setManualSlotStart] = useState("");
  // True once the user has picked a slot for the current windows — prevents a
  // late-resolving fetch from overwriting their choice with the default.
  const slotPickedRef = useRef(false);
  const [reason, setReason] = useState("");
  const [instructorFeedback, setInstructorFeedback] = useState("");

  // Activities done in this session. Flexible array; teacher can `+ / −` rows
  // to record multiple lesson + mission pairs in one attendance. First entry
  // is the primary; the exam-handoff fires if any entry's lesson === "Exam".
  const [activities, setActivities] = useState<{ lesson: string; mission: string }[]>([
    { lesson: "", mission: "" },
  ]);
  const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLesson[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  // Active activity events for this student — feed the "ACTIVITY" section of
  // the Lesson dropdown so the teacher can record participation in things like
  // "Spring Showcase" or a 4-week tournament. Cleared when the student changes.
  const [activeActivities, setActiveActivities] = useState<
    { id: string; title: string; expiresLabel: string | null }[]
  >([]);

  // Async student search results — populated lazily as the user types in
  // the student dropdown's search box (mode === "add"). Replaces the old
  // bulk pre-load of every active enrollment in the system.
  const [searchedStudents, setSearchedStudents] = useState<AttendanceRow[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const studentSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentSearchSeqRef = useRef(0);

  const handleStudentSearchChange = useCallback((term: string) => {
    if (studentSearchTimerRef.current) clearTimeout(studentSearchTimerRef.current);
    const trimmed = term.trim();
    // A blank term fetches the branch's default student list (empty q) instead
    // of clearing — so opening "Take Attendance" shows students without typing.
    setIsSearchingStudents(true);
    studentSearchTimerRef.current = setTimeout(async () => {
      const seq = ++studentSearchSeqRef.current;
      try {
        const res = await fetch(`/api/attendance/student-search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { rows: AttendanceRow[] };
        if (seq !== studentSearchSeqRef.current) return; // stale
        setSearchedStudents(json.rows ?? []);
      } finally {
        if (seq === studentSearchSeqRef.current) setIsSearchingStudents(false);
      }
    }, 250);
  }, []);

  // In add mode, the student dropdown operates over fetched results.
  // In present/absent/edit modes, it operates over the current page's data
  // (already loaded). Same shape so downstream memos don't care which one.
  const effectiveAllStudents = mode === "add" ? searchedStudents : allStudents;

  // Check if the selected row is a trial
  const isTrial = selectedRow?.type === 'trial';

  // Get unique students for dropdown
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return effectiveAllStudents.filter((row) => {
      if (seen.has(row.studentId)) return false;
      seen.add(row.studentId);
      return true;
    });
  }, [effectiveAllStudents]);

  // Get enrollments for selected student
  const studentEnrollments = useMemo(() => {
    if (!selectedStudentId) return [];
    return effectiveAllStudents.filter((row) => row.studentId === selectedStudentId);
  }, [effectiveAllStudents, selectedStudentId]);

  // Get selected enrollment details - find by course name for selected student
  const selectedEnrollment = useMemo(() => {
    // In add mode, selectedEnrollmentId is the courseName
    // Find the enrollment for the selected student with this course
    if (mode === "add" && selectedStudentId && selectedEnrollmentId) {
      return studentEnrollments.find((row) => row.courseName === selectedEnrollmentId);
    }
    // For present/absent mode, find by enrollment id
    return effectiveAllStudents.find((row) => row.enrollmentId === selectedEnrollmentId);
  }, [effectiveAllStudents, studentEnrollments, selectedEnrollmentId, selectedStudentId, mode]);

  // Reset form when modal opens or mode/selectedRow changes
  useEffect(() => {
    if (open) {
      setDuplicateError("");
      if (mode === "add") {
        // Take Attendance mode - start fresh
        setSelectedStudentId("");
        setSelectedEnrollmentId("");
        setClassType("Physical");
        // Default to TODAY and NOW (user picks an actual date + time, not a weekday).
        setActualDate(format(new Date(), "yyyy-MM-dd"));
        setActualDay(getCurrentDayOfWeek());
        setActualStartTime(getCurrentTime());
        setReason("");
        setInstructorFeedback("");
        setActivities([{ lesson: "", mission: "" }]);
        setCurriculumLessons([]);
        setSlotWindows([]);
        setSelectedSlotStart("");
        slotPickedRef.current = false;
        setManualSlot(false);
        setManualSlotStart("");
        // Load the branch's default student list so the dropdown is populated
        // immediately (typing then filters via the same handler).
        handleStudentSearchChange("");
      } else if (selectedRow) {
        // Present or Absent mode - pre-fill with selected row
        setSelectedStudentId(selectedRow.studentId);
        setSelectedEnrollmentId(selectedRow.enrollmentId);

        // If there's existing attendance data, use it; otherwise use defaults
        const existing = selectedRow.existingAttendance;
        if (existing) {
          // Editing existing current week attendance — show saved data
          setClassType(existing.classType || "Physical");
          setActualDay(existing.actualDay || selectedRow.slotDay || selectedRow.dayOfWeek || getCurrentDayOfWeek());
          setActualStartTime(formatTimeForInput(existing.actualStartTime || selectedRow.slotTime || selectedRow.startTime));
          setReason(existing.notes || "");
          // Pre-fill existing activities, or start with one empty row.
          setActivities(
            existing.activities && existing.activities.length > 0
              ? existing.activities.map((a) => ({ lesson: a.lesson, mission: a.mission }))
              : [{ lesson: "", mission: "" }],
          );
        } else {
          // New attendance — default to current day and current time
          setClassType("Physical");
          setActualDay(getCurrentDayOfWeek());
          setActualStartTime(getCurrentTime());
          setReason("");
          setInstructorFeedback("");
          setActivities([{ lesson: "", mission: "" }]);
        }
      }
    }
  }, [open, mode, selectedRow, handleStudentSearchChange]);

  // Fetch curriculum when the course changes
  useEffect(() => {
    const fetchCurriculum = async () => {
      // For present/absent mode, use selectedRow.courseId directly
      // For add mode, use selectedEnrollment.courseId
      let courseId: string | undefined;

      if (mode === "add") {
        courseId = selectedEnrollment?.courseId;
      } else {
        // present/absent mode - use selectedRow directly (more reliable)
        courseId = selectedRow?.courseId;
      }

      if (!courseId) {
        setCurriculumLessons([]);
        return;
      }

      setIsLoadingCurriculum(true);
      try {
        // Use provided fetch function or fallback to API
        if (fetchCurriculumLessons) {
          const lessons = await fetchCurriculumLessons(courseId);
          setCurriculumLessons(lessons);
        } else {
          // Fetch from API (no-store: always reflect the live lesson catalog,
          // which syncs from the Hub — codes/titles can change there).
          const response = await fetch(`/api/curriculum?courseId=${courseId}`, {
            cache: "no-store",
          });
          if (response.ok) {
            const data = await response.json();
            setCurriculumLessons(data.lessons || []);
          } else {
            console.error("Failed to fetch curriculum from API");
            setCurriculumLessons([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch curriculum:", error);
        setCurriculumLessons([]);
      } finally {
        setIsLoadingCurriculum(false);
      }
    };

    if (open && (mode !== "add" ? selectedRow : true)) {
      fetchCurriculum();
    }
  }, [open, mode, selectedEnrollment, selectedRow, fetchCurriculumLessons]);

  // Add mode only: fetch the scheduled slot windows for the selected course and
  // auto-select the default slot by the current time. The user picks a slot
  // (not an arbitrary time); actualStartTime stays the exact marking moment.
  useEffect(() => {
    if (!open || mode !== "add") return;
    const courseId = selectedEnrollment?.courseId;
    const branchId = selectedEnrollment?.branchId;
    const day = dayNameFromDateStr(actualDate).toLowerCase();
    if (!courseId || !day) {
      setSlotWindows([]);
      setSelectedSlotStart("");
      return;
    }
    let cancelled = false;
    // New windows context (course/branch/day changed): a fresh default applies.
    slotPickedRef.current = false;
    // Fetch only the slots scheduled on the chosen date's day-of-week AND the
    // student's branch, then default to the slot for the current time.
    const params = new URLSearchParams({ courseId, day });
    if (branchId) params.set("branchId", branchId);
    fetch(`/api/attendance/course-slots?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const windows: SlotWindow[] = data?.windows ?? [];
        setSlotWindows(windows);
        // Don't clobber a slot the user already picked while this was loading.
        if (!slotPickedRef.current) {
          setSelectedSlotStart(pickDefaultSlotStart(windows, getCurrentTime()));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSlotWindows([]);
        if (!slotPickedRef.current) setSelectedSlotStart("");
      });
    return () => { cancelled = true; };
  }, [open, mode, selectedEnrollment?.courseId, selectedEnrollment?.branchId, actualDate]);

  // Per-row helpers: changing a row's lesson resets that row's mission so
  // stale missions from a different lesson never sneak through. Inlined into
  // each row's onChange handler below — no global effect needed.

  // Fetch active activity events for the targeted student. Use selectedRow's
  // studentId when marking present/absent, or selectedStudentId in add mode.
  useEffect(() => {
    const studentId = selectedRow?.studentId ?? selectedStudentId;
    if (!open || !studentId) {
      setActiveActivities([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/events/active-activities?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.activities) return;
        setActiveActivities(data.activities);
      })
      .catch(() => {
        /* non-fatal — dropdown just lacks the ACTIVITY section */
      });
    return () => { cancelled = true; };
  }, [open, selectedRow?.studentId, selectedStudentId]);

  // Update fields when student changes (for add mode)
  useEffect(() => {
    if (mode === "add" && selectedStudentId && studentEnrollments.length > 0) {
      // Auto-select first enrollment's course name (since dropdown uses courseName as value)
      const firstEnrollment = studentEnrollments[0];
      setSelectedEnrollmentId(firstEnrollment.courseName);
      // Date/time stay at the today/now defaults the user chose — don't overwrite from the slot.
    }
  }, [mode, selectedStudentId, studentEnrollments]);

  // Update times when enrollment changes (only in "add" mode — in present/absent mode
  // the main open-effect already sets day/time from existing attendance data)
  // (In add mode the date/time stay at the today/now defaults; the slot no longer
  // overrides them — the user records the actual attendance date + time.)

  const handleSubmit = async () => {
    // Use selectedEnrollment to get the actual enrollment ID
    const enrollmentId = selectedEnrollment?.enrollmentId || selectedRow?.enrollmentId;
    if (!enrollmentId) return;

    // Block only the SAME slot (day + slot start) within the week — a student may
    // attend multiple different slots on the same day, so we compare the chosen
    // SLOT, not the exact marking time.
    const studentId = selectedRow?.studentId || (mode === "add" ? selectedStudentId : undefined);
    const newSlotTime = mode === "add" ? (manualSlot ? manualSlotStart : selectedSlotStart) : (selectedRow?.slotTime || "");
    if (studentId && actualDay && newSlotTime) {
      const currentAttendanceId = selectedRow?.existingAttendance?.id;
      const normalizeTime = (t: string) => t.split(':').slice(0, 2).join(':');

      const duplicate = effectiveAllStudents.find(row => {
        if (row.studentId !== studentId) return false;
        if (!row.existingAttendance) return false;
        // Skip the current record being edited
        if (currentAttendanceId && row.existingAttendance.id === currentAttendanceId) return false;
        // Same slot = same slot day AND same slot start time
        return (
          (row.slotDay || '').toLowerCase() === actualDay.toLowerCase() &&
          normalizeTime(row.slotTime || '') === normalizeTime(newSlotTime)
        );
      });

      if (duplicate) {
        setDuplicateError(
          `This student already has attendance for this slot on ${actualDay} (${duplicate.courseName}). Choose a different slot.`
        );
        return;
      }
    }

    setDuplicateError("");

    // actualStartTime is the EXACT marking moment — refresh it to now at submit.
    const markingTime = getCurrentTime();
    setActualStartTime(markingTime);

    // Use existing attendance date if updating, otherwise calculate from the SLOT's day (not user-changed day).
    // This keeps the date tied to the enrollment slot so it can be matched back after refresh.
    const existingDate = selectedRow?.existingAttendance?.date;
    const attendanceDate = existingDate
      ? (existingDate.includes('T') ? existingDate.split('T')[0] : existingDate)
      : (mode === "add" && actualDate
          ? actualDate
          : getDateForDayInCurrentWeek(selectedRow?.slotDay || actualDay));

    setIsSubmitting(true);
    try {
      await onSubmit({
        enrollmentId: enrollmentId,
        date: attendanceDate,
        status: mode === "absent" ? "absent" : "present",
        classType,
        actualDay,
        actualStartTime: markingTime,
        notes: mode === "absent" ? reason : "",
        activities:
          mode === "absent"
            ? []
            : activities
                .filter((a) => a.lesson)
                .map((a) => ({ lesson: a.lesson, mission: "" })),
        instructorFeedback: isTrial ? instructorFeedback : undefined,
        isTrial: isTrial,
        attendanceId: selectedRow?.existingAttendance?.id || undefined,
        // Slot info — in add mode the slot is derived from the chosen date's
        // day-of-week + the selected slot window; otherwise keep the row's slot.
        slotDay:
          mode === "add"
            ? (dayNameFromDateStr(actualDate) || undefined)
            : (selectedRow?.slotDay || undefined),
        slotTime:
          mode === "add"
            ? ((manualSlot ? manualSlotStart : selectedSlotStart) || undefined)
            : (selectedRow?.slotTime || selectedRow?.startTime || undefined),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit attendance:", error);
      // Show API error (e.g. duplicate) to the user
      if (error instanceof Error && error.message) {
        setDuplicateError(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentOptions = uniqueStudents.map((s) => ({
    value: s.studentId,
    label: s.studentName,
  }));

  // Get all unique programs/courses from all students
  const allUniquePrograms = useMemo(() => {
    const seen = new Set<string>();
    const programs: { enrollmentId: string; courseName: string }[] = [];
    for (const row of effectiveAllStudents) {
      // Use courseName as key to get unique courses
      if (seen.has(row.courseName)) continue;
      seen.add(row.courseName);
      programs.push({
        enrollmentId: row.enrollmentId,
        courseName: row.courseName,
      });
    }
    return programs;
  }, [effectiveAllStudents]);

  // Get programs for selected student (for filtering after selection)
  const studentPrograms = useMemo(() => {
    const seen = new Set<string>();
    return studentEnrollments.filter((e) => {
      if (seen.has(e.enrollmentId)) return false;
      seen.add(e.enrollmentId);
      return true;
    });
  }, [studentEnrollments]);

  // Show only the selected student's enrolled programs, or all programs if no student selected
  const programOptions = (selectedStudentId ? studentPrograms : allUniquePrograms).map((p) => ({
    value: p.courseName,
    label: p.courseName,
  }));

  // Activity entries are prefixed so a downstream check can distinguish them
  // from curriculum lessons by value alone (which decides whether Mission is
  // disabled for that row).
  const ACTIVITY_PREFIX = "Activity: ";

  // Lesson options grouped by category. Categories rendered as disabled
  // header rows so the dropdown is visually grouped without needing a new
  // grouping component. ACTIVITY rows disable Mission when chosen.
  const lessonOptions = useMemo(() => {
    const opts: { value: string; label: string; disabled?: boolean }[] = [];
    opts.push({ value: "__hdr_curriculum", label: "— CURRICULUM —", disabled: true });
    for (const l of curriculumLessons) {
      opts.push({ value: l.title, label: l.title });
    }
    opts.push({ value: "__hdr_special", label: "— SPECIAL —", disabled: true });
    opts.push({ value: "Competition", label: "Competition" });
    if (activeActivities.length > 0) {
      opts.push({ value: "__hdr_activity", label: "— ACTIVITY —", disabled: true });
      for (const a of activeActivities) {
        opts.push({
          value: `${ACTIVITY_PREFIX}${a.title}`,
          label: a.expiresLabel ? `${a.title} (until ${a.expiresLabel})` : a.title,
        });
      }
    }
    return opts;
  }, [curriculumLessons, activeActivities]);

  // Determine what's editable based on mode
  const isStudentEditable = mode === "add";
  const isFieldsEditable = mode !== "absent";
  const showActivityFields = mode !== "absent";

  // Get display values for readonly fields
  const displayStudent = selectedEnrollment || selectedRow;

  const getModalTitle = () => {
    switch (mode) {
      case "add":
        return "Take Attendance";
      case "present":
        return "Mark Present";
      case "absent":
        return "Mark Absent";
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return "Saving...";
    return mode === "absent" ? "Save & Mark Absent" : "Save & Mark Present";
  };

  // Readonly field styles
  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {getModalTitle()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-8">
            {/* Student Selection / Display */}
            {isStudentEditable ? (
              <FloatingSelect
                id="select-student"
                label="Student"
                placeholder={mode === "add" ? (isSearchingStudents ? "Searching…" : "Type to search students…") : "Choose a student..."}
                searchable
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                options={studentOptions}
                onSearchChange={mode === "add" ? handleStudentSearchChange : undefined}
                disableClientFilter={mode === "add"}
              />
            ) : (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={displayStudent?.studentName ?? ""}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass,
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Student
                </label>
              </div>
            )}

            {/* Program Selection - only show dropdown in "add" mode */}
            {mode === "add" ? (
              <FloatingSelect
                id="select-program"
                label="Program"
                placeholder={selectedStudentId ? "Select a program..." : "Select a student first..."}
                value={selectedEnrollmentId}
                onChange={setSelectedEnrollmentId}
                options={programOptions}
                disabled={!selectedStudentId}
              />
            ) : (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={selectedRow?.courseName ?? "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                    readonlyFieldClass,
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Program
                </label>
              </div>
            )}

            {/* Type and Sessions Remaining */}
            <div className="grid grid-cols-2 gap-4">
              {isFieldsEditable ? (
                <FloatingSelect
                  id="select-class-type"
                  label="Type"
                  placeholder="Select type..."
                  value={classType}
                  onChange={(val) =>
                    setClassType(val as "Physical" | "Online")
                  }
                  options={CLASS_TYPES}
                />
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={classType}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass,
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Type
                  </label>
                </div>
              )}

              <div className="relative">
                <div
                  className={cn(
                    "flex h-[58px] items-center justify-center rounded-[10px] border border-[#ADAFCA] text-2xl font-bold text-[#23d2e2]",
                    readonlyFieldClass,
                  )}
                >
                  {selectedEnrollment?.sessionsRemaining ?? 0}
                </div>
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Sessions Remaining
                </label>
              </div>
            </div>

            {/* Day and Time */}
            <div className="grid grid-cols-2 gap-4">
              {isFieldsEditable ? (
                mode === "add" ? (
                  <div className="relative">
                    <input
                      type="date"
                      id="select-date"
                      value={actualDate}
                      onChange={(e) => {
                        setActualDate(e.target.value);
                        setActualDay(dayNameFromDateStr(e.target.value));
                        setDuplicateError("");
                      }}
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Date
                    </label>
                  </div>
                ) : (
                  <FloatingSelect
                    id="select-day"
                    label="Day"
                    placeholder="Select day..."
                    value={actualDay}
                    onChange={(val) => { setActualDay(val); setDuplicateError(""); }}
                    options={DAYS_OF_WEEK}
                  />
                )
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={actualDay || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass,
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Day
                  </label>
                </div>
              )}

              {isFieldsEditable ? (
                mode === "add" ? (
                  manualSlot ? (
                    <div className="relative">
                      <input
                        type="time"
                        id="manual-slot"
                        value={manualSlotStart}
                        onChange={(e) => { setManualSlotStart(e.target.value); setDuplicateError(""); }}
                        className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none"
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Slot (manual)
                      </label>
                    </div>
                  ) : (
                    <FloatingSelect
                      id="select-slot"
                      label="Slot"
                      placeholder={slotWindows.length ? "Select slot..." : `No slots on ${actualDay || "this day"}`}
                      value={selectedSlotStart}
                      onChange={(val) => { slotPickedRef.current = true; setSelectedSlotStart(val); setDuplicateError(""); }}
                      options={slotWindows.map((w) => ({ value: w.startTime, label: w.label }))}
                      disabled={slotWindows.length === 0}
                    />
                  )
                ) : (
                  <div className="relative">
                    <input
                      type="time"
                      id="start-time"
                      value={actualStartTime}
                      onChange={(e) => { setActualStartTime(e.target.value); setDuplicateError(""); }}
                      className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none"
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Time
                    </label>
                  </div>
                )
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={actualStartTime || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass,
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Time
                  </label>
                </div>
              )}
            </div>

            {/* Manual slot toggle — one-off timing when the chosen day has no scheduled slot */}
            {mode === "add" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualSlot}
                  onChange={(e) => { setManualSlot(e.target.checked); setDuplicateError(""); }}
                  className="h-4 w-4"
                />
                Enter slot timing manually (one-off)
              </label>
            )}

            {/* Duplicate day+time error */}
            {duplicateError && (
              <p className="text-sm font-medium text-red-500">{duplicateError}</p>
            )}

            {/* Activity Fields - Only for add/present modes */}
            {showActivityFields && (
              <>
                {/* Activities — one row per lesson. `+` on the first row adds
                    a new lesson; `−` on any subsequent row removes it. */}
                {activities.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <FloatingSelect
                        id={`select-lesson-${idx}`}
                        label="Lesson"
                        placeholder={isLoadingCurriculum ? "Loading..." : "Select lesson..."}
                        value={row.lesson}
                        onChange={(v) =>
                          setActivities((prev) =>
                            prev.map((a, i) =>
                              i === idx ? { lesson: v, mission: "" } : a,
                            ),
                          )
                        }
                        options={lessonOptions}
                        disabled={isLoadingCurriculum}
                        searchable
                      />
                    </div>
                    {/* Matches the DynamicFieldList pattern (program-modal):
                        first row carries the + (add another lesson); every
                        subsequent row carries a − (remove this row). */}
                    {idx === 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActivities((prev) => [...prev, { lesson: "", mission: "" }])
                        }
                        className="p-0.5 rounded-full border-2 border-[#23D2E2] hover:shadow-sm transition-all duration-200 flex items-center justify-center"
                        title="Add another lesson"
                        aria-label="Add another lesson"
                      >
                        <Plus size={9} className="text-[#23D2E2]" strokeWidth={5} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActivities((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-0.5 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                        title="Remove this lesson"
                        aria-label="Remove this lesson"
                      >
                        <Minus size={9} className="text-[#fd434f]" strokeWidth={5} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Instructor feedback — trial sessions only */}
                {isTrial && (
                  <FloatingInput
                    id="instructor-feedback"
                    label="Instructor Feedback"
                    value={instructorFeedback}
                    onChange={(e) => setInstructorFeedback(e.target.value)}
                  />
                )}
              </>
            )}

            {/* Reason Field - Only for absent mode */}
            {mode === "absent" && (
              <div className="relative w-full">
                <textarea
                  id="reason"
                  placeholder="Reason for Absence"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="peer w-full py-4 px-4 rounded-[10px] border border-[#ADAFCA] text-base font-bold text-foreground placeholder-transparent resize-none focus:outline-none focus:border-[#23D2E2]"
                />
                <label
                  htmlFor="reason"
                  className={cn(
                    "pointer-events-none absolute left-3 px-1 font-bold bg-white transition-all text-[#ADAFCA]",
                    reason
                      ? "-top-2.5 text-xs"
                      : "top-4 text-base",
                    "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#23D2E2]"
                  )}
                >
                  Reason for Absence
                </label>
              </div>
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedEnrollmentId}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "absent"
                  ? "bg-[#fd434f] hover:bg-[#e03a45]"
                  : "bg-[#23D2E2] hover:bg-[#18a9b8]"
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              Update student attendance, activities, and photos
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
