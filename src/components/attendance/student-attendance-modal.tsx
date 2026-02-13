"use client";

import { useState, useEffect, useMemo } from "react";
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

function formatTimeForInput(time: string | null): string {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

export function StudentAttendanceModal({
  open,
  onOpenChange,
  mode,
  allStudents,
  selectedRow,
  instructors,
  onSubmit,
}: StudentAttendanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [classType, setClassType] = useState<"Physical" | "Online">("Physical");
  const [actualDay, setActualDay] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [lastActivity, setLastActivity] = useState("");
  const [adcoin, setAdcoin] = useState<number>(0);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [reason, setReason] = useState("");

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

  // Get selected enrollment details
  const selectedEnrollment = useMemo(() => {
    return allStudents.find((row) => row.enrollmentId === selectedEnrollmentId);
  }, [allStudents, selectedEnrollmentId]);

  // Reset form when modal opens or mode/selectedRow changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        // Take Attendance mode - start fresh
        setSelectedStudentId("");
        setSelectedEnrollmentId("");
        setClassType("Physical");
        setActualDay(getCurrentDayOfWeek());
        setActualStartTime("");
        setInstructorName("");
        setLastActivity("");
        setAdcoin(0);
        setProjectPhotos([]);
        setReason("");
      } else if (selectedRow) {
        // Present or Absent mode - pre-fill with selected row
        setSelectedStudentId(selectedRow.studentId);
        setSelectedEnrollmentId(selectedRow.enrollmentId);
        setClassType("Physical");
        setActualDay(selectedRow.dayOfWeek || getCurrentDayOfWeek());
        setActualStartTime(formatTimeForInput(selectedRow.startTime));
        setInstructorName("");
        setLastActivity("");
        setAdcoin(0);
        setProjectPhotos([]);
        setReason("");
      }
    }
  }, [open, mode, selectedRow]);

  // Update fields when student changes (for add mode)
  useEffect(() => {
    if (mode === "add" && selectedStudentId && studentEnrollments.length > 0) {
      // Auto-select first enrollment
      const firstEnrollment = studentEnrollments[0];
      setSelectedEnrollmentId(firstEnrollment.enrollmentId);
      setActualDay(firstEnrollment.dayOfWeek || getCurrentDayOfWeek());
      setActualStartTime(formatTimeForInput(firstEnrollment.startTime));
    }
  }, [mode, selectedStudentId, studentEnrollments]);

  // Update times when enrollment changes
  useEffect(() => {
    if (selectedEnrollment && mode !== "absent") {
      setActualDay(selectedEnrollment.dayOfWeek || getCurrentDayOfWeek());
      setActualStartTime(formatTimeForInput(selectedEnrollment.startTime));
    }
  }, [selectedEnrollmentId, selectedEnrollment, mode]);

  const handleSubmit = async () => {
    if (!selectedEnrollmentId) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        enrollmentId: selectedEnrollmentId,
        date: format(new Date(), "yyyy-MM-dd"),
        status: mode === "absent" ? "absent" : "present",
        classType,
        actualDay,
        actualStartTime,
        instructorName: mode === "absent" ? "" : instructorName,
        lastActivity: mode === "absent" ? "" : lastActivity,
        adcoin: mode === "absent" ? 0 : adcoin,
        projectPhotos: mode === "absent" ? [] : projectPhotos,
        notes: mode === "absent" ? reason : "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit attendance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentOptions = uniqueStudents.map((s) => ({
    value: s.studentId,
    label: s.studentName,
  }));

  const programOptions = studentEnrollments.map((e) => ({
    value: e.enrollmentId,
    label: e.courseName,
  }));

  const instructorOptions = instructors.map((i) => ({
    value: i.name,
    label: i.name,
  }));

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

            {/* Program Selection */}
            {isFieldsEditable ? (
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
                  value={selectedEnrollment?.courseName ?? "-"}
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
                  onChange={setActualDay}
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
                    onChange={(e) => setActualStartTime(e.target.value)}
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

            {/* Activity Fields - Only for add/present modes */}
            {showActivityFields && (
              <>
                <FloatingInput
                  id="activity-completed"
                  label="Activity Completed"
                  value={lastActivity}
                  onChange={(e) => setLastActivity(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FloatingInput
                    id="adcoin"
                    label="Adcoin"
                    type="number"
                    value={adcoin === 0 ? "" : adcoin.toString()}
                    onChange={(e) => setAdcoin(Number(e.target.value) || 0)}
                  />

                  <FloatingSelect
                    id="select-instructor"
                    label="Instructor Name"
                    placeholder="Select instructor..."
                    value={instructorName}
                    onChange={setInstructorName}
                    options={instructorOptions}
                    searchable
                  />
                </div>

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
