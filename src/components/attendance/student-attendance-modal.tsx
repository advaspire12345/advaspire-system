"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { PhotoUpload } from "@/components/ui/photo-upload";
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
  instructorName: string;
  lastActivity: string;
  adcoin: number;
  projectPhotos: string[];
  notes: string;
  // Lesson and mission fields
  lesson: string;
  mission: string;
  // Trial-specific field
  instructorFeedback?: string;
  isTrial?: boolean;
  // Existing attendance ID for updates (prevents creating duplicates)
  attendanceId?: string;
  // Original slot info from enrollment schedule (never changes)
  slotDay?: string;
  slotTime?: string;
  // Password for adcoin transfer verification
  adcoinPassword?: string;
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

// Competition missions constants
const COMPETITION_MISSIONS = [
  { value: "Preparation", label: "Preparation" },
  { value: "Showcase", label: "Showcase" },
];

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
  const [actualStartTime, setActualStartTime] = useState("");
  const [instructorName, setInstructorName] = useState(currentUserName ?? "");
  const [lastActivity, setLastActivity] = useState("");
  const [adcoin, setAdcoin] = useState<number>(0);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [instructorFeedback, setInstructorFeedback] = useState("");
  const [adcoinPassword, setAdcoinPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Track whether the adcoin field was touched by the user
  const [adcoinTouched, setAdcoinTouched] = useState(false);
  const originalAdcoinRef = useRef<number>(0);

  // Lesson and mission state
  const [lesson, setLesson] = useState("");
  const [mission, setMission] = useState("");
  const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLesson[]>([]);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);
  // Ref to skip mission reset when lesson is pre-filled on modal open
  const skipMissionResetRef = useRef(false);

  // Check if the selected row is a trial
  const isTrial = selectedRow?.type === 'trial';

  // Get unique students for dropdown
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return allStudents.filter((row) => {
      if (seen.has(row.studentId)) return false;
      seen.add(row.studentId);
      return true;
    });
  }, [allStudents]);

  // Get enrollments for selected student
  const studentEnrollments = useMemo(() => {
    if (!selectedStudentId) return [];
    return allStudents.filter((row) => row.studentId === selectedStudentId);
  }, [allStudents, selectedStudentId]);

  // Get selected enrollment details - find by course name for selected student
  const selectedEnrollment = useMemo(() => {
    // In add mode, selectedEnrollmentId is the courseName
    // Find the enrollment for the selected student with this course
    if (mode === "add" && selectedStudentId && selectedEnrollmentId) {
      return studentEnrollments.find((row) => row.courseName === selectedEnrollmentId);
    }
    // For present/absent mode, find by enrollment id
    return allStudents.find((row) => row.enrollmentId === selectedEnrollmentId);
  }, [allStudents, studentEnrollments, selectedEnrollmentId, selectedStudentId, mode]);

  // Reset form when modal opens or mode/selectedRow changes
  useEffect(() => {
    if (open) {
      setDuplicateError("");
      setAdcoinPassword("");
      setPasswordError("");
      setAdcoinTouched(false);
      if (mode === "add") {
        // Take Attendance mode - start fresh
        setSelectedStudentId("");
        setSelectedEnrollmentId("");
        setClassType("Physical");
        setActualDay(getCurrentDayOfWeek());
        setActualStartTime("");
        setInstructorName(currentUserName ?? "");
        setLastActivity("");
        setAdcoin(0);
        originalAdcoinRef.current = 0;
        setProjectPhotos([]);
        setReason("");
        setInstructorFeedback("");
        setLesson("");
        setMission("");
        setCurriculumLessons([]);
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
          setInstructorName(existing.instructorName || currentUserName || "");
          setLastActivity(existing.lastActivity || "");
          setAdcoin(existing.adcoin ?? 0);
          originalAdcoinRef.current = existing.adcoin ?? 0;
          setProjectPhotos(existing.projectPhotos || []);
          setReason(existing.notes || "");
          const initialLesson = existing.lesson || "";
          const initialMission = existing.mission || "";
          if (initialMission) skipMissionResetRef.current = true;
          setLesson(initialLesson);
          setMission(initialMission);
        } else {
          // New attendance — default to current day and current time
          setClassType("Physical");
          setActualDay(getCurrentDayOfWeek());
          setActualStartTime(getCurrentTime());
          setInstructorName(currentUserName ?? "");
          setLastActivity("");
          setAdcoin(0);
          originalAdcoinRef.current = 0;
          setProjectPhotos([]);
          setReason("");
          setInstructorFeedback("");
          setLesson("");
          setMission("");
        }
      }
    }
  }, [open, mode, selectedRow]);

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
          // Fetch from API
          const response = await fetch(`/api/curriculum?courseId=${courseId}`);
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

  // Reset mission when lesson changes (but skip on initial pre-fill)
  useEffect(() => {
    if (skipMissionResetRef.current) {
      skipMissionResetRef.current = false;
      return;
    }
    setMission("");
  }, [lesson]);

  // Update fields when student changes (for add mode)
  useEffect(() => {
    if (mode === "add" && selectedStudentId && studentEnrollments.length > 0) {
      // Auto-select first enrollment's course name (since dropdown uses courseName as value)
      const firstEnrollment = studentEnrollments[0];
      setSelectedEnrollmentId(firstEnrollment.courseName);
      setActualDay(firstEnrollment.slotDay || firstEnrollment.dayOfWeek || getCurrentDayOfWeek());
      setActualStartTime(formatTimeForInput(firstEnrollment.slotTime || firstEnrollment.startTime));
    }
  }, [mode, selectedStudentId, studentEnrollments]);

  // Update times when enrollment changes (only in "add" mode — in present/absent mode
  // the main open-effect already sets day/time from existing attendance data)
  useEffect(() => {
    if (selectedEnrollment && mode === "add") {
      setActualDay(selectedEnrollment.slotDay || selectedEnrollment.dayOfWeek || getCurrentDayOfWeek());
      setActualStartTime(formatTimeForInput(selectedEnrollment.slotTime || selectedEnrollment.startTime));
    }
  }, [selectedEnrollmentId, selectedEnrollment, mode]);

  const handleSubmit = async () => {
    // Use selectedEnrollment to get the actual enrollment ID
    const enrollmentId = selectedEnrollment?.enrollmentId || selectedRow?.enrollmentId;
    if (!enrollmentId) return;

    // Check for duplicate day + time within the same week for the same student
    const studentId = selectedRow?.studentId || (mode === "add" ? selectedStudentId : undefined);
    if (studentId && actualDay && actualStartTime) {
      const currentAttendanceId = selectedRow?.existingAttendance?.id;
      const normalizeTime = (t: string) => t.split(':').slice(0, 2).join(':');

      const duplicate = allStudents.find(row => {
        if (row.studentId !== studentId) return false;
        if (!row.existingAttendance) return false;
        // Skip the current record being edited
        if (currentAttendanceId && row.existingAttendance.id === currentAttendanceId) return false;
        // Check if same day AND same time
        return (
          row.existingAttendance.actualDay?.toLowerCase() === actualDay.toLowerCase() &&
          normalizeTime(row.existingAttendance.actualStartTime || '') === normalizeTime(actualStartTime)
        );
      });

      if (duplicate) {
        setDuplicateError(
          `This student already has attendance on ${actualDay} at ${actualStartTime} (${duplicate.courseName}). Please choose a different day or time.`
        );
        return;
      }
    }

    setDuplicateError("");
    setPasswordError("");

    // Require password only when adcoin was changed by the user and the new value differs
    const adcoinRequiresPassword = mode !== "absent" && !isTrial && adcoinTouched && adcoin !== originalAdcoinRef.current;
    if (adcoinRequiresPassword && !adcoinPassword.trim()) {
      setPasswordError("Please enter your password to transfer adcoin.");
      return;
    }

    // Use existing attendance date if updating, otherwise calculate from the SLOT's day (not user-changed day).
    // This keeps the date tied to the enrollment slot so it can be matched back after refresh.
    const existingDate = selectedRow?.existingAttendance?.date;
    const attendanceDate = existingDate
      ? (existingDate.includes('T') ? existingDate.split('T')[0] : existingDate)
      : getDateForDayInCurrentWeek(selectedRow?.slotDay || actualDay);

    setIsSubmitting(true);
    try {
      await onSubmit({
        enrollmentId: enrollmentId,
        date: attendanceDate,
        status: mode === "absent" ? "absent" : "present",
        classType,
        actualDay,
        actualStartTime,
        instructorName: mode === "absent" ? "" : instructorName,
        lastActivity: mode === "absent" ? "" : lastActivity,
        adcoin: mode === "absent" ? 0 : (isTrial ? 0 : adcoin),
        projectPhotos: mode === "absent" ? [] : projectPhotos,
        notes: mode === "absent" ? reason : "",
        lesson: mode === "absent" ? "" : lesson,
        mission: mode === "absent" ? "" : mission,
        instructorFeedback: isTrial ? instructorFeedback : undefined,
        isTrial: isTrial,
        attendanceId: selectedRow?.existingAttendance?.id || undefined,
        // Original slot info — used for permanent slot matching
        slotDay: selectedRow?.slotDay || undefined,
        slotTime: selectedRow?.slotTime || selectedRow?.startTime || undefined,
        // Password for adcoin transfer verification
        adcoinPassword: adcoinRequiresPassword ? adcoinPassword : undefined,
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
    for (const row of allStudents) {
      // Use courseName as key to get unique courses
      if (seen.has(row.courseName)) continue;
      seen.add(row.courseName);
      programs.push({
        enrollmentId: row.enrollmentId,
        courseName: row.courseName,
      });
    }
    return programs;
  }, [allStudents]);

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

  const instructorOptions = instructors.map((i) => ({
    value: i.name,
    label: i.name,
  }));

  // Lesson options: curriculum lessons + Competition
  const lessonOptions = useMemo(() => {
    const options = curriculumLessons.map((l) => ({
      value: l.title,
      label: l.title,
    }));
    // Add Competition option at the end
    options.push({ value: "Competition", label: "Competition" });
    return options;
  }, [curriculumLessons]);

  // Mission options: depends on selected lesson
  const missionOptions = useMemo(() => {
    if (!lesson) return [];

    // If Competition is selected, show Preparation and Showcase
    if (lesson === "Competition") {
      return COMPETITION_MISSIONS;
    }

    // Find the selected lesson in curriculum
    const selectedLesson = curriculumLessons.find((l) => l.title === lesson);
    if (!selectedLesson || !selectedLesson.missions || selectedLesson.missions.length === 0) {
      // Even if no missions defined, show Build Only option
      return [{ value: "Build Only", label: "Build Only" }];
    }

    // Start with "Build Only" option for curriculum lessons
    const options = [{ value: "Build Only", label: "Build Only" }];

    // Map missions to options - use level as the display text if no other identifier
    selectedLesson.missions.forEach((m, index) => {
      const label = m.level !== null ? `Level ${m.level}` : `Mission ${index + 1}`;
      options.push({
        value: label,
        label: label,
      });
    });

    return options;
  }, [lesson, curriculumLessons]);

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
                placeholder="Choose a student..."
                searchable
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                options={studentOptions}
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
                <FloatingSelect
                  id="select-day"
                  label="Day"
                  placeholder="Select day..."
                  value={actualDay}
                  onChange={(val) => { setActualDay(val); setDuplicateError(""); }}
                  options={DAYS_OF_WEEK}
                />
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

            {/* Duplicate day+time error */}
            {duplicateError && (
              <p className="text-sm font-medium text-red-500">{duplicateError}</p>
            )}

            {/* Activity Fields - Only for add/present modes */}
            {showActivityFields && (
              <>
                {/* Lesson and Mission Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <FloatingSelect
                    id="select-lesson"
                    label="Lesson"
                    placeholder={isLoadingCurriculum ? "Loading..." : "Select lesson..."}
                    value={lesson}
                    onChange={setLesson}
                    options={lessonOptions}
                    disabled={isLoadingCurriculum}
                    searchable
                  />

                  <FloatingSelect
                    id="select-mission"
                    label="Mission"
                    placeholder={lesson ? "Select mission..." : "Select lesson first..."}
                    value={mission}
                    onChange={setMission}
                    options={missionOptions}
                    disabled={!lesson || missionOptions.length === 0}
                    searchable
                  />
                </div>

                <FloatingInput
                  id="activity-completed"
                  label="Activity Completed"
                  value={lastActivity}
                  onChange={(e) => setLastActivity(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  {isTrial ? (
                    <FloatingInput
                      id="instructor-feedback"
                      label="Instructor Feedback"
                      value={instructorFeedback}
                      onChange={(e) => setInstructorFeedback(e.target.value)}
                    />
                  ) : (
                    <FloatingInput
                      id="adcoin"
                      label="Adcoin"
                      type="number"
                      min={0}
                      value={adcoin === 0 ? "" : adcoin.toString()}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdcoin(val < 0 ? 0 : val || 0);
                        setAdcoinTouched(true);
                      }}
                    />
                  )}

                  {currentUserName ? (
                    <FloatingInput
                      id="instructor-name"
                      label="Instructor Name"
                      value={currentUserName}
                      readOnly
                      className="bg-muted"
                    />
                  ) : (
                    <FloatingSelect
                      id="select-instructor"
                      label="Instructor Name"
                      placeholder="Select instructor..."
                      value={instructorName}
                      onChange={setInstructorName}
                      options={instructorOptions}
                      searchable
                    />
                  )}
                </div>

                {/* Password field — shown only when adcoin value was changed */}
                {!isTrial && adcoinTouched && adcoin !== originalAdcoinRef.current && (
                  <>
                    <FloatingInput
                      id="adcoin-password"
                      label="Password to Transfer Adcoin"
                      type="password"
                      value={adcoinPassword}
                      onChange={(e) => { setAdcoinPassword(e.target.value); setPasswordError(""); }}
                    />
                    {passwordError && (
                      <p className="text-sm font-medium text-red-500 -mt-3">{passwordError}</p>
                    )}
                  </>
                )}

                <PhotoUpload
                  value={projectPhotos}
                  onChange={setProjectPhotos}
                  maxFiles={5}
                  label="Project Photos (max 5)"
                />
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
