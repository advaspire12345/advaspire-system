"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type {
  ExaminationTableRow,
  EligibleStudent,
  ExaminationStatus,
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
  eligibleStudents: EligibleStudent[];
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

export function ExaminationModal({
  open,
  onOpenChange,
  mode,
  record,
  eligibleStudents,
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
        setExamName(record.examName);
        setExamLevel(record.examLevel);
        setExamDate(record.examDate);
        setExaminerId(record.examinerId || "");
        setMark(record.mark !== null ? String(record.mark) : "");
        setNotes(record.notes || "");
        setStatus(record.status);
      } else if (mode === "add") {
        setSelectedStudentId("");
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
    if (mode === "edit" && record) {
      return {
        studentId: record.studentId,
        studentName: record.studentName,
        enrollmentId: null,
        courseId: record.courseId,
        courseName: record.courseName,
        currentLevel: record.currentLevel,
      };
    }
    return eligibleStudents.find((s) => s.studentId === selectedStudentId);
  }, [selectedStudentId, eligibleStudents, mode, record]);

  // Auto-generate exam name when student is selected
  useEffect(() => {
    if (mode === "add" && selectedStudent) {
      const level = selectedStudent.currentLevel + 1;
      setExamLevel(level);
      setExamName(`Level ${level} Assessment`);
    }
  }, [selectedStudent, mode]);

  // Get course info for max levels
  const courseInfo = useMemo(() => {
    if (!selectedStudent) return null;
    return courses.find((c) => c.id === selectedStudent.courseId);
  }, [selectedStudent, courses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: ExaminationFormPayload = {
        studentId: selectedStudentId || record?.studentId || "",
        enrollmentId:
          mode === "add" && selectedStudent
            ? (selectedStudent as EligibleStudent).enrollmentId
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

  // Student options for add mode
  const studentOptions = useMemo(() => {
    return eligibleStudents.map((s) => ({
      value: s.studentId,
      label: `${s.studentName} - ${s.courseName} (Level ${s.currentLevel})`,
    }));
  }, [eligibleStudents]);

  // Examiner options
  const examinerOptions = useMemo(() => {
    return [
      { value: "", label: "Select examiner" },
      ...examiners.map((e) => ({
        value: e.id,
        label: e.name,
      })),
    ];
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
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl font-bold">
            Delete Examination
          </DialogTitle>

          {success ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-medium">
                Examination deleted successfully
              </p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p className="text-muted-foreground">
                  Are you sure you want to delete the examination for{" "}
                  <span className="font-bold text-foreground">
                    {record?.studentName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Exam: {record?.examName} (Level {record?.examLevel})
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Add/Edit form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold">
          {mode === "add" ? "Add Examination" : "Edit Examination"}
        </DialogTitle>

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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Selection (Add mode only) */}
            {mode === "add" && (
              <div className="space-y-2">
                <FloatingSelect
                  id="student"
                  label="Select Student"
                  value={selectedStudentId}
                  onChange={(value) => setSelectedStudentId(value)}
                  options={[
                    { value: "", label: "Select eligible student..." },
                    ...studentOptions,
                  ]}
                  required
                  searchable
                />
                {eligibleStudents.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No students are currently eligible for examination. Students
                    become eligible when their attendance meets the required
                    sessions for level up.
                  </p>
                )}
              </div>
            )}

            {/* Student Info (Edit mode) */}
            {mode === "edit" && record && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={record.studentPhoto || undefined} />
                  <AvatarFallback className="bg-gradient-to-r from-[#615DFA] to-[#23D2E2] text-white">
                    {record.studentName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{record.studentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.courseName} - Current Level: {record.currentLevel}
                  </p>
                </div>
              </div>
            )}

            {/* Selected student info (Add mode) */}
            {mode === "add" && selectedStudent && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">
                    {selectedStudent.studentName}
                  </span>{" "}
                  is eligible for Level {selectedStudent.currentLevel + 1} exam
                  in{" "}
                  <span className="font-medium">
                    {selectedStudent.courseName}
                  </span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Sessions attended:{" "}
                  {(selectedStudent as EligibleStudent).sessionsAttended} /{" "}
                  {(selectedStudent as EligibleStudent).sessionsRequired}{" "}
                  required
                </p>
              </div>
            )}

            {/* Exam Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                id="examName"
                label="Exam Name"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
              />

              <FloatingSelect
                id="examLevel"
                label="Exam Level"
                value={String(examLevel)}
                onChange={(value) => setExamLevel(parseInt(value, 10))}
                options={levelOptions}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                value={examinerId}
                onChange={(value) => setExaminerId(value)}
                options={examinerOptions}
                searchable
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes / Detail
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#615DFA] resize-none"
                rows={3}
                placeholder="Add any notes about the examination..."
              />
            </div>

            {/* Pass warning */}
            {status === "pass" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Note:</span> Setting status to
                  &quot;Pass&quot; will automatically:
                </p>
                <ul className="list-disc list-inside text-sm text-green-600 mt-1">
                  <li>Increase the student&apos;s level</li>
                  <li>Generate a certificate</li>
                </ul>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Form actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#615DFA] hover:bg-[#615DFA]/90 text-white"
                disabled={isLoading || (mode === "add" && !selectedStudentId)}
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
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
