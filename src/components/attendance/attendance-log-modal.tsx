"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import type { AttendanceLogRow } from "@/data/attendance";
import type { AttendanceStatus } from "@/db/schema";

export type LogModalMode = "edit" | "delete";

interface InstructorOption {
  id: string;
  name: string;
}

interface AttendanceLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LogModalMode;
  record: AttendanceLogRow | null;
  instructors: InstructorOption[];
  onSubmit: (data: AttendanceLogFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface AttendanceLogFormData {
  status: AttendanceStatus;
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

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function formatTimeForInput(time: string | null): string {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

export function AttendanceLogModal({
  open,
  onOpenChange,
  mode,
  record,
  instructors,
  onSubmit,
  onDelete,
}: AttendanceLogModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [classType, setClassType] = useState<"Physical" | "Online">("Physical");
  const [actualDay, setActualDay] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [lastActivity, setLastActivity] = useState("");
  const [adcoin, setAdcoin] = useState<number>(0);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open && record) {
      setStatus(record.status);
      setClassType(record.classType ?? "Physical");
      setActualDay(record.dayOfWeek ?? "");
      setActualStartTime(formatTimeForInput(record.actualStartTime));
      setInstructorName(record.instructorName ?? "");
      setLastActivity(record.lastActivity ?? "");
      setAdcoin(0);
      setProjectPhotos(record.projectPhotos ?? []);
      setReason(record.notes ?? "");
    }
  }, [open, record]);

  const handleSubmit = async () => {
    if (!record) return;

    setIsSubmitting(true);
    try {
      if (mode === "delete") {
        await onDelete();
      } else {
        await onSubmit({
          status,
          classType,
          actualDay,
          actualStartTime,
          instructorName: status === "absent" ? "" : instructorName,
          lastActivity: status === "absent" ? "" : lastActivity,
          adcoin: status === "absent" ? 0 : adcoin,
          projectPhotos: status === "absent" ? [] : projectPhotos,
          notes: status === "absent" ? reason : "",
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const instructorOptions = instructors.map((i) => ({
    value: i.name,
    label: i.name,
  }));

  const isReadonly = mode === "delete";
  const isAbsent = status === "absent";
  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  const getModalTitle = () => {
    return mode === "delete" ? "Delete Attendance Record" : "Edit Attendance";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return mode === "delete" ? "Deleting..." : "Saving...";
    return mode === "delete" ? "Confirm Delete" : "Save Changes";
  };

  if (!record) return null;

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
              Are you sure you want to delete this attendance record? This
              action cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Student (readonly) */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value={record.studentName}
                className={cn(
                  "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                  readonlyFieldClass
                )}
              />
              <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                Student
              </label>
            </div>

            {/* Program (readonly) */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value={record.courseName}
                className={cn(
                  "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                  readonlyFieldClass
                )}
              />
              <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                Program
              </label>
            </div>

            {/* Type and Sessions Remaining */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={classType}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Type
                  </label>
                </div>
              ) : (
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
              )}

              <div className="relative">
                <div
                  className={cn(
                    "flex h-[58px] items-center justify-center rounded-[10px] border border-[#ADAFCA] text-2xl font-bold text-[#23d2e2]",
                    readonlyFieldClass
                  )}
                >
                  {record.sessionsRemaining}
                </div>
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Sessions Remaining
                </label>
              </div>
            </div>

            {/* Day and Time */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={actualDay || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Day
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="select-day"
                  label="Day"
                  placeholder="Select day..."
                  value={actualDay}
                  onChange={setActualDay}
                  options={DAYS_OF_WEEK}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={actualStartTime || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
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
                    id="start-time"
                    value={actualStartTime}
                    onChange={(e) => setActualStartTime(e.target.value)}
                    className="peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 text-base font-bold text-foreground transition-colors focus:border-[#23D2E2] focus:outline-none"
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Time
                  </label>
                </div>
              )}
            </div>

            {/* Attendance Status - under Day row */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={status.charAt(0).toUpperCase() + status.slice(1)}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center capitalize",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Attendance Status
                </label>
              </div>
            ) : (
              <FloatingSelect
                id="select-status"
                label="Attendance Status"
                placeholder="Select status..."
                value={status}
                onChange={(val) => setStatus(val as AttendanceStatus)}
                options={STATUS_OPTIONS}
              />
            )}

            {/* Conditional fields based on status */}
            {isAbsent ? (
              /* Reason of Absence - only shown when absent */
              isReadonly ? (
                <div className="relative">
                  <textarea
                    readOnly
                    value={reason || "-"}
                    rows={4}
                    className={cn(
                      "peer w-full py-4 px-4 rounded-[10px] border border-[#ADAFCA] text-base font-bold text-foreground resize-none",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Reason of Absence
                  </label>
                </div>
              ) : (
                <div className="relative w-full">
                  <textarea
                    id="reason"
                    placeholder="Reason of Absence"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="peer w-full py-4 px-4 rounded-[10px] border border-[#ADAFCA] text-base font-bold text-foreground placeholder-transparent resize-none focus:outline-none focus:border-[#23D2E2]"
                  />
                  <label
                    htmlFor="reason"
                    className={cn(
                      "pointer-events-none absolute left-3 px-1 font-bold bg-white transition-all text-[#ADAFCA]",
                      reason ? "-top-2.5 text-xs" : "top-4 text-base",
                      "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#23D2E2]"
                    )}
                  >
                    Reason of Absence
                  </label>
                </div>
              )
            ) : (
              /* Activity fields - shown when present/late/excused */
              <>
                {/* Activity Completed */}
                {isReadonly ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={lastActivity || "-"}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Activity Completed
                    </label>
                  </div>
                ) : (
                  <FloatingInput
                    id="activity-completed"
                    label="Activity Completed"
                    value={lastActivity}
                    onChange={(e) => setLastActivity(e.target.value)}
                  />
                )}

                {/* Adcoin and Instructor */}
                <div className="grid grid-cols-2 gap-4">
                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={adcoin.toString()}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Adcoin
                      </label>
                    </div>
                  ) : (
                    <FloatingInput
                      id="adcoin"
                      label="Adcoin"
                      type="number"
                      value={adcoin === 0 ? "" : adcoin.toString()}
                      onChange={(e) => setAdcoin(Number(e.target.value) || 0)}
                    />
                  )}

                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={instructorName || "-"}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground flex items-center",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Instructor Name
                      </label>
                    </div>
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

                {/* Project Photos */}
                {isReadonly ? (
                  projectPhotos.length > 0 && (
                    <div>
                      <label className="block text-[#ADAFCA] font-bold text-xs mb-2">
                        Project Photos
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {projectPhotos.map((photo, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                            <Image
                              src={photo}
                              alt={`Project ${idx + 1}`}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <PhotoUpload
                    value={projectPhotos}
                    onChange={setProjectPhotos}
                    maxFiles={5}
                    label="Project Photos (max 5)"
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete"
                  ? "bg-[#fd434f] hover:bg-[#e03a45]"
                  : "bg-[#23D2E2] hover:bg-[#18a9b8]"
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              {mode === "delete"
                ? "This action cannot be undone"
                : "Update attendance record details"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
