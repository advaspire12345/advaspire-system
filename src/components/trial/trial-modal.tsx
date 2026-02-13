"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { cn } from "@/lib/utils";
import type { TrialRow } from "@/data/trial";
import type { TrialSource, TrialStatus } from "@/db/schema";

export type TrialModalMode = "add" | "edit" | "delete";

export interface BranchOption {
  id: string;
  name: string;
}

export interface CourseOption {
  id: string;
  name: string;
}

interface TrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TrialModalMode;
  record: TrialRow | null;
  branches: BranchOption[];
  courses: CourseOption[];
  onAdd: (data: TrialFormData) => Promise<void>;
  onEdit: (data: TrialFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface TrialFormData {
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  childName: string;
  childAge: number;
  branchId: string;
  courseId: string | null;
  source: TrialSource;
  scheduledDate: string;
  scheduledTime: string;
  message: string | null;
  status: TrialStatus;
}

const SOURCE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "online", label: "Online" },
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

export function TrialModal({
  open,
  onOpenChange,
  mode,
  record,
  branches,
  courses,
  onAdd,
  onEdit,
  onDelete,
}: TrialModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [branchId, setBranchId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [source, setSource] = useState<TrialSource>("walk_in");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<TrialStatus>("pending");

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        setParentName("");
        setParentPhone("");
        setParentEmail("");
        setChildName("");
        setChildAge("");
        setBranchId("");
        setCourseId("");
        setSource("walk_in");
        setScheduledDate("");
        setScheduledTime("");
        setMessage("");
        setStatus("pending");
      } else if (record) {
        setParentName(record.parentName);
        setParentPhone(record.parentPhone);
        setParentEmail(record.parentEmail ?? "");
        setChildName(record.childName);
        setChildAge(String(record.childAge));
        setBranchId(record.branchId);
        setCourseId(record.courseId ?? "");
        setSource(record.source as TrialSource);
        setScheduledDate(record.scheduledDate);
        setScheduledTime(record.scheduledTime);
        setMessage(record.message ?? "");
        setStatus(record.status as TrialStatus);
      }
      setError(null);
    }
  }, [open, record, mode]);

  const handleSubmit = async () => {
    // Validation
    if (!parentName.trim()) {
      setError("Please enter parent name");
      return;
    }
    if (!parentPhone.trim()) {
      setError("Please enter parent phone");
      return;
    }
    if (!childName.trim()) {
      setError("Please enter child name");
      return;
    }
    if (!childAge || parseInt(childAge) < 1) {
      setError("Please enter a valid child age");
      return;
    }
    if (!branchId) {
      setError("Please select a branch");
      return;
    }
    if (!scheduledDate) {
      setError("Please select a date");
      return;
    }
    if (!scheduledTime) {
      setError("Please select a time");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: TrialFormData = {
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim() || null,
        childName: childName.trim(),
        childAge: parseInt(childAge),
        branchId,
        courseId: courseId || null,
        source,
        scheduledDate,
        scheduledTime,
        message: message.trim() || null,
        status,
      };

      if (mode === "delete") {
        await onDelete();
      } else if (mode === "add") {
        await onAdd(formData);
      } else {
        await onEdit(formData);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadonly = mode === "delete";

  const getModalTitle = () => {
    if (mode === "add") return "Add Trial";
    if (mode === "delete") return "Delete Trial";
    return "Edit Trial";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "add") return "Adding...";
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "add") return "Add Trial";
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "add") return "Create a new trial booking";
    if (mode === "delete") return "This action cannot be undone";
    return "Update trial details";
  };

  // For edit/delete mode, we need a record
  if (mode !== "add" && !record) return null;

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
  }));

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

          {mode === "delete" && (
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this trial booking? This action
              cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Parent Name */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={parentName}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Parent Name
                </label>
              </div>
            ) : (
              <FloatingInput
                id="parent-name"
                label="Parent Name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            )}

            {/* Parent Phone and Email */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={parentPhone}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Phone
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="parent-phone"
                  label="Phone"
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={parentEmail || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Email
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="parent-email"
                  label="Email (Optional)"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                />
              )}
            </div>

            {/* Child Name and Age */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={childName}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Child Name
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="child-name"
                  label="Child Name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={childAge}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Age
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="child-age"
                  label="Age"
                  type="number"
                  min="1"
                  max="99"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                />
              )}
            </div>

            {/* Branch and Course */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      branches.find((b) => b.id === branchId)?.name ?? "-"
                    }
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Branch
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="branch"
                  label="Branch"
                  placeholder="Select branch..."
                  value={branchId}
                  onChange={setBranchId}
                  options={branchOptions}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      courses.find((c) => c.id === courseId)?.name ?? "-"
                    }
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Program
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="course"
                  label="Program (Optional)"
                  placeholder="Select program..."
                  value={courseId}
                  onChange={setCourseId}
                  options={courseOptions}
                />
              )}
            </div>

            {/* Source and Status */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      SOURCE_OPTIONS.find((s) => s.value === source)?.label ??
                      source
                    }
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Source
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="source"
                  label="Source"
                  placeholder="Select source..."
                  value={source}
                  onChange={(val) => setSource(val as TrialSource)}
                  options={SOURCE_OPTIONS}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      STATUS_OPTIONS.find((s) => s.value === status)?.label ??
                      status
                    }
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Status
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="status"
                  label="Status"
                  placeholder="Select status..."
                  value={status}
                  onChange={(val) => setStatus(val as TrialStatus)}
                  options={STATUS_OPTIONS}
                  disabled={mode === "add"}
                />
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={scheduledDate}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Date
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="date"
                    id="scheduled-date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 pr-12 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ADAFCA]" />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Date
                  </label>
                </div>
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={scheduledTime}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Time
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="time"
                    id="scheduled-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 pr-12 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Clock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ADAFCA]" />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Time
                  </label>
                </div>
              )}
            </div>

            {/* Message */}
            {isReadonly ? (
              <div className="relative">
                <textarea
                  readOnly
                  value={message || "-"}
                  rows={3}
                  className={cn(
                    "peer w-full rounded-[10px] border border-[#ADAFCA] px-4 py-3 text-base font-bold text-foreground resize-none",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Message
                </label>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Message"
                  className="peer w-full rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 py-3 text-base font-bold text-foreground placeholder-transparent transition-colors focus:border-[#23D2E2] focus:outline-none resize-none"
                />
                <label
                  htmlFor="message"
                  className={cn(
                    "pointer-events-none absolute left-3 bg-white px-1 font-bold text-[#ADAFCA] transition-all",
                    message
                      ? "-top-2.5 text-xs"
                      : "top-3 text-base",
                    "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#23D2E2]"
                  )}
                >
                  Message (Optional)
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete" && "bg-[#fd434f] hover:bg-[#e03a45]",
                (mode === "add" || mode === "edit") &&
                  "bg-[#23D2E2] hover:bg-[#18a9b8]"
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              {getSubtitleText()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
