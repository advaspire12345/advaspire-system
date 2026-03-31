"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { cn } from "@/lib/utils";
import type {
  ExaminationTableRow,
  ExaminationStatus,
  StudentExamOption,
} from "@/db/schema";
import type { ExaminationFormPayload } from "@/app/(dashboard)/examination/actions";

export interface CourseOption {
  id: string;
  name: string;
  numberOfLevels: number | null;
}

export interface ExaminerOption {
  id: string;
  name: string;
  photo: string | null;
}

export type ExaminationModalMode = "add" | "edit" | "delete";

interface ExaminationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ExaminationModalMode;
  record: ExaminationTableRow | null;
  allStudents: StudentExamOption[];
  examiners: ExaminerOption[];
  courses: CourseOption[];
  onAdd: (payload: ExaminationFormPayload) => Promise<void>;
  onEdit: (payload: ExaminationFormPayload) => Promise<void>;
  onDelete: () => Promise<void>;
}

const STATUS_OPTIONS: { value: ExaminationStatus; label: string }[] = [
  { value: "eligible", label: "Eligible" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "absent", label: "Absent" },
];

const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

export function ExaminationModal({
  open,
  onOpenChange,
  mode,
  record,
  allStudents,
  examiners,
  courses,
  onAdd,
  onEdit,
  onDelete,
}: ExaminationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [examName, setExamName] = useState("");
  const [examLevel, setExamLevel] = useState<number>(1);
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [examinerId, setExaminerId] = useState<string>("");
  const [mark, setMark] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ExaminationStatus>("scheduled");

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);

      if (mode === "edit" && record) {
        setSelectedStudentId(record.studentId);
        setSelectedEnrollmentId("");
        setExamName(record.examName);
        setExamLevel(record.examLevel);
        setExamDate(record.examDate);
        setExaminerId(record.examinerId || "");
        setMark(record.mark !== null ? String(record.mark) : "");
        setNotes(record.notes || "");
        setStatus(record.status);
      } else if (mode === "add") {
        setSelectedStudentId("");
        setSelectedEnrollmentId("");
        setExamName("");
        setExamLevel(1);
        setExamDate(new Date().toISOString().split("T")[0]);
        setExaminerId("");
        setMark("");
        setNotes("");
        setStatus("scheduled");
      }
    }
  }, [open, mode, record]);

  // Get selected student info
  const selectedStudent = useMemo(() => {
    return allStudents.find((s) => s.studentId === selectedStudentId);
  }, [selectedStudentId, allStudents]);

  // Get selected enrollment info
  const selectedEnrollment = useMemo(() => {
    if (!selectedStudent) return null;
    return selectedStudent.enrollments.find(
      (e) => e.enrollmentId === selectedEnrollmentId
    );
  }, [selectedStudent, selectedEnrollmentId]);

  // Auto-select first enrollment when student changes
  useEffect(() => {
    if (mode === "add" && selectedStudent && selectedStudent.enrollments.length > 0) {
      setSelectedEnrollmentId(selectedStudent.enrollments[0].enrollmentId);
    }
  }, [mode, selectedStudent]);

  // Auto-generate exam name and level when enrollment is selected
  useEffect(() => {
    if (mode === "add" && selectedEnrollment) {
      const level = selectedEnrollment.currentLevel;
      setExamLevel(level);
      setExamName(`${selectedEnrollment.courseName} Level ${level}`);
    }
  }, [selectedEnrollment, mode]);

  // Keep exam name in sync with level changes
  useEffect(() => {
    if (mode === "add" && selectedEnrollment) {
      setExamName(`${selectedEnrollment.courseName} Level ${examLevel}`);
    }
  }, [examLevel, selectedEnrollment, mode]);

  // Get course info for max levels
  const courseInfo = useMemo(() => {
    if (mode === "edit" && record) {
      return courses.find((c) => c.id === record.courseId);
    }
    if (!selectedEnrollment) return null;
    return courses.find((c) => c.id === selectedEnrollment.courseId);
  }, [selectedEnrollment, courses, mode, record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: ExaminationFormPayload = {
        studentId: selectedStudentId || record?.studentId || "",
        enrollmentId: selectedEnrollment
          ? selectedEnrollment.enrollmentId
          : null,
        examName,
        examLevel,
        examDate,
        examinerId: examinerId || null,
        mark: mark ? parseInt(mark, 10) : null,
        notes: notes || null,
        status,
      };

      if (mode === "add") {
        await onAdd(payload);
      } else if (mode === "edit") {
        await onEdit(payload);
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onDelete();
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Student options for dropdown - all students
  const studentOptions = useMemo(() => {
    return allStudents.map((s) => {
      const hasEligible = s.enrollments.some((e) => e.isEligible);
      return {
        value: s.studentId,
        label: `${s.studentName} - ${s.branchName}${hasEligible ? " ★" : ""}`,
      };
    });
  }, [allStudents]);

  // Program options for selected student
  const programOptions = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.enrollments.map((e) => ({
      value: e.enrollmentId,
      label: `${e.courseName}${e.isEligible ? " ★ Eligible" : ""}`,
    }));
  }, [selectedStudent]);

  // Examiner options
  const examinerOptions = useMemo(() => {
    return examiners.map((e) => ({
      value: e.id,
      label: e.name,
    }));
  }, [examiners]);

  // Level options (1 to max levels of course)
  const levelOptions = useMemo(() => {
    const maxLevel = courseInfo?.numberOfLevels || 10;
    return Array.from({ length: maxLevel }, (_, i) => ({
      value: String(i + 1),
      label: `Level ${i + 1}`,
    }));
  }, [courseInfo]);

  // Delete confirmation dialog
  if (mode === "delete") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0" floatingCloseButton>
          <div className="max-h-[90vh] overflow-y-auto p-10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Delete Examination
              </DialogTitle>
            </DialogHeader>

            {success ? (
              <div className="flex flex-col items-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-lg font-medium">
                  Examination deleted successfully
                </p>
              </div>
            ) : (
              <div className="space-y-5 mt-8">
                <p className="text-muted-foreground">
                  Are you sure you want to delete the examination for{" "}
                  <span className="font-bold text-foreground">
                    {record?.studentName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-muted-foreground">
                  Exam: {record?.examName} (Level {record?.examLevel})
                </p>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="mt-12">
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-full h-[50px] bg-[#fd434f] hover:bg-[#e03a45] text-white font-bold rounded-[10px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Examination"
                    )}
                  </Button>
                  <span className="text-center block mt-2 text-xs text-muted-foreground">
                    This action cannot be undone
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Add/Edit form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {mode === "add" ? "Add Examination" : "Edit Examination"}
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-medium">
                {mode === "add"
                  ? "Examination created successfully"
                  : "Examination updated successfully"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 mt-8">
              {/* Student Selection / Display */}
              {mode === "add" ? (
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
                    value={record?.studentName ?? ""}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Student
                  </label>
                </div>
              )}

              {/* Program + Exam Level (one row) */}
              <div className="grid grid-cols-2 gap-4">
                {mode === "add" ? (
                  <FloatingSelect
                    id="select-program"
                    label="Program"
                    placeholder={
                      selectedStudentId
                        ? "Select a program..."
                        : "Select a student first..."
                    }
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
                      value={record?.courseName ?? "-"}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Program
                    </label>
                  </div>
                )}

                <FloatingSelect
                  id="examLevel"
                  label="Exam Level"
                  value={String(examLevel)}
                  onChange={(value) => setExamLevel(parseInt(value, 10))}
                  options={levelOptions}
                  required
                />
              </div>

              {/* Eligibility info */}
              {mode === "add" && selectedEnrollment && (
                <div
                  className={cn(
                    "p-3 rounded-[10px] text-sm",
                    selectedEnrollment.isEligible
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  <p>
                    Sessions: {selectedEnrollment.sessionsAttended} /{" "}
                    {selectedEnrollment.sessionsRequired} required
                    {selectedEnrollment.isEligible
                      ? " — Eligible for exam"
                      : " — Not yet eligible"}
                  </p>
                </div>
              )}

              {/* Exam Date and Examiner */}
              <div className="grid grid-cols-2 gap-4">
                <FloatingInput
                  id="examDate"
                  label="Exam Date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />

                <FloatingSelect
                  id="examiner"
                  label="Examiner (PIC)"
                  placeholder="Select examiner..."
                  value={examinerId}
                  onChange={setExaminerId}
                  options={examinerOptions}
                  searchable
                />
              </div>

              {/* Mark and Status */}
              <div className="grid grid-cols-2 gap-4">
                <FloatingInput
                  id="mark"
                  label="Mark (0-100)"
                  type="number"
                  min="0"
                  max="100"
                  value={mark}
                  onChange={(e) => setMark(e.target.value)}
                />

                <FloatingSelect
                  id="status"
                  label="Status"
                  value={status}
                  onChange={(value) => setStatus(value as ExaminationStatus)}
                  options={STATUS_OPTIONS.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                  required
                />
              </div>

              {/* Notes */}
              <div className="relative w-full">
                <textarea
                  id="notes"
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={cn(
                    "peer w-full py-4 px-4 rounded-[10px] border border-[#ADAFCA] text-base font-bold text-foreground placeholder-transparent resize-none focus:outline-none focus:border-[#23D2E2]"
                  )}
                />
                <label
                  htmlFor="notes"
                  className={cn(
                    "pointer-events-none absolute left-3 px-1 font-bold bg-white transition-all text-[#ADAFCA]",
                    notes ? "-top-2.5 text-xs" : "top-4 text-base",
                    "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#23D2E2]"
                  )}
                >
                  Notes / Detail
                </label>
              </div>

              {/* Pass warning */}
              {status === "pass" && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-[10px] text-sm text-green-700">
                  <p className="font-medium">Setting status to &quot;Pass&quot; will:</p>
                  <ul className="list-disc list-inside text-green-600 mt-1">
                    <li>Increase the student&apos;s level</li>
                    <li>Generate a certificate</li>
                  </ul>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-[10px]">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="mt-12">
                <Button
                  type="submit"
                  disabled={
                    isLoading || (mode === "add" && !selectedStudentId)
                  }
                  className="w-full h-[50px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold rounded-[10px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {mode === "add" ? "Creating..." : "Saving..."}
                    </>
                  ) : mode === "add" ? (
                    "Create Examination"
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <span className="text-center block mt-2 text-xs text-muted-foreground">
                  {mode === "add"
                    ? "Create a new examination record for the student"
                    : "Update the examination details"}
                </span>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
