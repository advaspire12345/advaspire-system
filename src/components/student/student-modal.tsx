"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Mail,
  X,
  CheckCircle,
  AlertTriangle,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StudentTableRow } from "@/data/students";
import type {
  BranchOption,
  CourseOption,
} from "@/components/trial/trial-modal";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";

export type StudentModalMode = "add" | "edit" | "delete";

export interface StudentFormData {
  // Basic Info
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  schoolName: string | null;
  studentImage: File | null;
  coverImage: File | null;

  // Parent Info
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;

  // Enrollment
  branchId: string;
  courseId: string | null;
  packageId: string | null;
  packageType: "monthly" | "session" | null;
  numberOfMonths: number | null;
  numberOfSessions: number | null;
  scheduleEntries: { day: string; time: string }[];

  // Notes
  notes: string | null;
}

interface StudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StudentModalMode;
  record: StudentTableRow | null;
  branches: BranchOption[];
  courses: CourseOption[];
  onAdd: (data: StudentFormData) => Promise<void>;
  onEdit: (data: StudentFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

const TABS = [
  { id: "basic" as const, label: "Basic Info" },
  { id: "parent" as const, label: "Parent Details" },
  { id: "enrollment" as const, label: "Enrollment" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other/Prefer not to say" },
];

const MONTH_OPTIONS = [
  { value: "1", label: "1 Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
];

const SESSION_OPTIONS = [
  { value: "4", label: "4 Sessions" },
  { value: "8", label: "8 Sessions" },
  { value: "10", label: "10 Sessions" },
  { value: "12", label: "12 Sessions" },
  { value: "16", label: "16 Sessions" },
  { value: "20", label: "20 Sessions" },
  { value: "24", label: "24 Sessions" },
];

export function StudentModal({
  open,
  onOpenChange,
  mode,
  record,
  branches,
  courses,
  onAdd,
  onEdit,
  onDelete,
}: StudentModalProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["id"]>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    email: "",
    phone: "",
    photoUrl: "",
    dateOfBirth: "",
    gender: null,
    schoolName: "",
    studentImage: null,
    coverImage: null,
    parentId: null,
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentAddress: "",
    parentPostcode: "",
    parentCity: "",
    branchId: "",
    courseId: "",
    packageId: null,
    packageType: null,
    numberOfMonths: null,
    numberOfSessions: null,
    scheduleEntries: [],
    notes: "",
  });

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        setFormData({
          name: "",
          email: "",
          phone: "",
          photoUrl: "",
          dateOfBirth: "",
          gender: null,
          schoolName: "",
          studentImage: null,
          coverImage: null,
          parentId: null,
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          parentAddress: "",
          parentPostcode: "",
          parentCity: "",
          branchId: "",
          courseId: "",
          packageId: null,
          packageType: null,
          numberOfMonths: null,
          numberOfSessions: null,
          scheduleEntries: [],
          notes: "",
        });
        setActiveTab("basic");
      } else if (record) {
        setFormData({
          name: record.name,
          email: record.email || "",
          phone: "",
          photoUrl: record.photo || "",
          dateOfBirth: "",
          gender: null,
          schoolName: "",
          studentImage: null,
          coverImage: null,
          parentId: null,
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          parentAddress: "",
          parentPostcode: "",
          parentCity: "",
          branchId: record.branchId || "",
          courseId: record.courseId || "",
          packageId: null,
          packageType: null,
          numberOfMonths: null,
          numberOfSessions: null,
          scheduleEntries: record.scheduleDays?.[0]
            ? [{ day: record.scheduleDays[0], time: record.scheduleTime || "" }]
            : [],
          notes: "",
        });
        setActiveTab("basic");
      }
      setError(null);
    }
  }, [open, record, mode]);

  const handleSubmit = async () => {
    // Basic validation
    if (activeTab === "basic") {
      if (!formData.name.trim()) {
        setError("Student name is required");
        return;
      }
    }

    if (activeTab === "enrollment" && !formData.branchId) {
      setError("Branch selection is required");
      return;
    }

    // If not on last tab, just switch tabs
    const isLastTab = activeTab === "enrollment";
    if (!isLastTab && mode !== "delete") {
      const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
      if (currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
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

  const isReadOnly = mode === "delete";
  const isLastTab = activeTab === "enrollment" || mode === "delete";
  const submitButtonText = isSubmitting
    ? mode === "delete"
      ? "Deleting..."
      : "Saving..."
    : mode === "delete"
      ? "Confirm Delete"
      : isLastTab
        ? "Save Student"
        : "Next";

  // Preview data for left panel
  const previewName = formData.name || (record?.name ?? "New Student");
  const previewBranch =
    branches.find((b) => b.id === formData.branchId)?.name ||
    record?.branchName ||
    "Select Branch";
  const previewPhoto = formData.photoUrl || record?.photo || undefined;

  // Upload Image Field Component
  const UploadImageField = ({
    label,
    value,
    onChange,
    id,
  }: {
    label: string;
    value: File | null;
    onChange: (file: File | null) => void;
    id: string;
  }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      onChange(file);
    };

    return (
      <div
        className={cn(
          "group flex flex-1 items-start justify-center rounded-xl bg-white border border-border",
          "transition-all duration-300 hover:-translate-y-0.5",
          "hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)] hover:border-[#23D2E2]/50",
          "min-h-[100px] py-4 px-3",
        )}
      >
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center"
        >
          <Upload
            size={24}
            className={cn(
              "text-[#ADAFCA] mb-1.5 transition-all duration-300",
              "group-hover:text-[#23D2E2]",
            )}
          />
          <span className="text-sm font-bold text-foreground">{label}</span>
          {value && (
            <span className="text-xs text-[#23D2E2] mt-1 font-medium">
              ✓ {value.name}
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            id={id}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:rounded-xl overflow-hidden border-0"
        style={{ maxWidth: "800px" }}
        floatingCloseButton
      >
        <DialogTitle className="sr-only">
          {mode === "delete"
            ? "Delete Student"
            : mode === "edit"
              ? "Edit Student"
              : "Add New Student"}
        </DialogTitle>
        <div className="grid grid-cols-12 h-[75vh] min-h-[450px]">
          {/* LEFT PANEL - PREVIEW & NAVIGATION */}
          <div className="col-span-12 lg:col-span-4 flex flex-col border-r border-border">
            {/* Cover Banner */}
            <div className="relative h-20 w-full bg-gradient-to-r from-primary/80 to-primary">
              <div className="absolute inset-0 bg-[url('/cover-pattern.png')] opacity-20" />
            </div>

            {/* Hexagon Avatar overlapping cover */}
            <div className="relative -mt-14 flex flex-col items-center px-4 pb-2">
              <div className="relative" aria-label="Student Profile Picture">
                <HexagonAvatar
                  size={120}
                  imageUrl={previewPhoto}
                  percentage={0.85}
                  fallbackInitials={previewName.charAt(0)}
                  cornerRadius={20}
                />
              </div>
            </div>

            {/* Student Details */}
            <div className="px-14 pb-5 border-b border-border">
              <h3 className="text-l font-bold text-foreground text-center">
                {previewName}
              </h3>
              <div className="flex justify-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {formData.email || record?.email || "No email"}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3 w-4 text-muted-foreground" />
                  <span>
                    {formData.branchId ? previewBranch : "Branch not selected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-10 py-3 border-b border-border bg-[#f8fafc]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !isReadOnly && setActiveTab(tab.id)}
                  disabled={isReadOnly}
                  className={cn(
                    "w-full flex items-center gap-1 px-4 py-1.5 text-left text-sm rounded-lg transition-colors",
                    activeTab === tab.id
                      ? "text-[#615DFA] font-bold"
                      : "text-muted-foreground",
                    isReadOnly && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 mt-3 space-y-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "w-full h-12 text-white font-bold rounded-xl text-base",
                  mode === "delete"
                    ? "bg-[#fd434f] hover:bg-[#e03a45]"
                    : "bg-[#23D2E2] hover:bg-[#18a9b8] shadow-md",
                )}
              >
                {submitButtonText}
              </Button>

              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="w-full h-11 rounded-xl font-bold border-border hover:bg-muted"
              >
                Cancel
              </Button>

              {error && (
                <p className="text-center text-sm text-red-500 font-medium mt-1">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - FORM CONTENT */}
          <div className="col-span-12 lg:col-span-8 overflow-y-auto p-8">
            {mode === "delete" && record ? (
              // DELETE CONFIRMATION VIEW
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-foreground">
                    Delete Student Record?
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    This action cannot be undone. All enrollment history and
                    student data will be permanently removed.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={record.photo || undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-[#615DFA] to-[#23D2E2] text-white text-xl">
                        {record.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">{record.name}</h3>
                      <p className="text-muted-foreground">
                        {record.email || "No email"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{record.branchName}</Badge>
                        <Badge>{record.programName || "No Program"}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // FORM VIEWS BY TAB
              <div className="max-w-3xl mx-auto">
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div>
                      <h6 className="text-base font-bold">
                        Student Basic Information
                      </h6>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FloatingInput
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                      <FloatingInput
                        label="Phone Number"
                        type="tel"
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                      <div className="md:col-span-2">
                        <FloatingInput
                          label="Email Address"
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>

                      <FloatingInput
                        label="Date of Birth"
                        type="date"
                        value={formData.dateOfBirth || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dateOfBirth: e.target.value,
                          })
                        }
                      />
                      <FloatingSelect
                        label="Gender"
                        value={formData.gender || ""}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            gender: val as "male" | "female" | "other" | null,
                          })
                        }
                        options={GENDER_OPTIONS}
                      />

                      <div className="md:col-span-2">
                        <FloatingInput
                          label="School Name"
                          value={formData.schoolName || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schoolName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <UploadImageField
                            id="student-avatar-upload"
                            label="Upload Avatar"
                            value={formData.studentImage}
                            onChange={(file) =>
                              setFormData({ ...formData, studentImage: file })
                            }
                          />
                          <UploadImageField
                            id="student-cover-upload"
                            label="Upload Cover"
                            value={formData.coverImage}
                            onChange={(file) =>
                              setFormData({ ...formData, coverImage: file })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Accepted formats: JPG, PNG. Max size: 5MB each.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "parent" && (
                  <div className="space-y-6">
                    <div>
                      <h6 className="text-base font-bold">
                        Parent/Guardian Details
                      </h6>
                    </div>

                    <div className="space-y-5">
                      <FloatingSelect
                        label="Select Parent"
                        value={formData.parentId || ""}
                        onChange={(val) =>
                          setFormData({ ...formData, parentId: val })
                        }
                        options={[{ value: "new", label: "Add New Parent" }]}
                      />

                      {(formData.parentId === "new" || !formData.parentId) && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FloatingInput
                              label="Parent Full Name"
                              value={formData.parentName || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  parentName: e.target.value,
                                })
                              }
                            />
                            <FloatingInput
                              label="Parent Phone"
                              type="tel"
                              value={formData.parentPhone || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  parentPhone: e.target.value,
                                })
                              }
                            />
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="Parent Email"
                                type="email"
                                value={formData.parentEmail || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    parentEmail: e.target.value,
                                  })
                                }
                              />
                            </div>

                            {/* Parent Address */}
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="Address"
                                value={formData.parentAddress || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    parentAddress: e.target.value,
                                  })
                                }
                              />
                            </div>

                            {/* Postcode and City */}
                            <FloatingInput
                              label="Postcode"
                              value={formData.parentPostcode || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  parentPostcode: e.target.value,
                                })
                              }
                            />
                            <FloatingInput
                              label="City"
                              value={formData.parentCity || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  parentCity: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                            <p className="text-sm text-info font-medium flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                              Parent account will be created automatically with
                              student enrollment
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "enrollment" && (
                  <div className="space-y-6">
                    <div>
                      <h6 className="text-base font-bold">
                        Enrollment Details
                      </h6>
                    </div>

                    {/* Branch, Program */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FloatingSelect
                        label="Branch"
                        value={formData.branchId}
                        onChange={(val) =>
                          setFormData({ ...formData, branchId: val })
                        }
                        options={branches.map((b) => ({
                          value: b.id,
                          label: b.name,
                        }))}
                        required
                      />
                      <FloatingSelect
                        label="Program/Course"
                        value={formData.courseId || ""}
                        onChange={(val) =>
                          setFormData({ ...formData, courseId: val })
                        }
                        options={courses.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                      />
                    </div>

                    {/* Package Type Selection */}
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-foreground">
                        Package Type
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              packageType: "monthly",
                              numberOfSessions: null,
                            })
                          }
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                            formData.packageType === "monthly"
                              ? "border-[#23D2E2] bg-[#23D2E2]/10"
                              : "border-border hover:border-[#23D2E2]/50",
                          )}
                        >
                          <span className="text-2xl mb-2">📅</span>
                          <span className="font-bold">Monthly</span>
                          <span className="text-xs text-muted-foreground">
                            Pay per month
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              packageType: "session",
                              numberOfMonths: null,
                            })
                          }
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                            formData.packageType === "session"
                              ? "border-[#23D2E2] bg-[#23D2E2]/10"
                              : "border-border hover:border-[#23D2E2]/50",
                          )}
                        >
                          <span className="text-2xl mb-2">🎫</span>
                          <span className="font-bold">Session</span>
                          <span className="text-xs text-muted-foreground">
                            Pay per session
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Monthly Package Options */}
                    {formData.packageType === "monthly" && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <FloatingSelect
                          label="Number of Months"
                          value={formData.numberOfMonths?.toString() || ""}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              numberOfMonths: val ? parseInt(val) : null,
                            })
                          }
                          options={MONTH_OPTIONS}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Select the duration for this monthly subscription
                        </p>
                      </div>
                    )}

                    {/* Session Package Options */}
                    {formData.packageType === "session" && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <FloatingSelect
                          label="Number of Sessions"
                          value={formData.numberOfSessions?.toString() || ""}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              numberOfSessions: val ? parseInt(val) : null,
                            })
                          }
                          options={SESSION_OPTIONS}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Select total sessions for this enrollment package
                        </p>
                      </div>
                    )}

                    {/* Weekly Schedule */}
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-foreground">
                        Class Schedule
                      </label>

                      <div className="space-y-3">
                        {formData.scheduleEntries.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border"
                          >
                            <div className="flex-1">
                              <FloatingSelect
                                label={index === 0 ? "Day" : ""}
                                value={entry.day}
                                onChange={(val) => {
                                  const newEntries = [
                                    ...formData.scheduleEntries,
                                  ];
                                  newEntries[index] = { ...entry, day: val };
                                  setFormData({
                                    ...formData,
                                    scheduleEntries: newEntries,
                                  });
                                }}
                                options={[
                                  { value: "", label: "Select day..." },
                                  { value: "Mon", label: "Monday" },
                                  { value: "Tue", label: "Tuesday" },
                                  { value: "Wed", label: "Wednesday" },
                                  { value: "Thu", label: "Thursday" },
                                  { value: "Fri", label: "Friday" },
                                  { value: "Sat", label: "Saturday" },
                                  { value: "Sun", label: "Sunday" },
                                ]}
                              />
                            </div>

                            <div className="flex-1">
                              <FloatingInput
                                label={index === 0 ? "Time" : ""}
                                type="time"
                                value={entry.time}
                                onChange={(e) => {
                                  const newEntries = [
                                    ...formData.scheduleEntries,
                                  ];
                                  newEntries[index] = {
                                    ...entry,
                                    time: e.target.value,
                                  };
                                  setFormData({
                                    ...formData,
                                    scheduleEntries: newEntries,
                                  });
                                }}
                              />
                            </div>

                            <div className="pt-6">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (
                                    index ===
                                    formData.scheduleEntries.length - 1
                                  ) {
                                    setFormData({
                                      ...formData,
                                      scheduleEntries: [
                                        ...formData.scheduleEntries,
                                        { day: "", time: "" },
                                      ],
                                    });
                                  } else {
                                    const newEntries =
                                      formData.scheduleEntries.filter(
                                        (_, i) => i !== index,
                                      );
                                    setFormData({
                                      ...formData,
                                      scheduleEntries: newEntries,
                                    });
                                  }
                                }}
                                className={cn(
                                  "h-10 w-10 rounded-lg transition-colors",
                                  index === formData.scheduleEntries.length - 1
                                    ? "text-[#23D2E2] hover:text-[#18a9b8] hover:bg-[#23D2E2]/10"
                                    : "text-red-500 hover:text-red-600 hover:bg-red-50",
                                )}
                              >
                                {index ===
                                formData.scheduleEntries.length - 1 ? (
                                  <Plus className="h-5 w-5" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}

                        {formData.scheduleEntries.length === 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                scheduleEntries: [{ day: "", time: "" }],
                              })
                            }
                            className="w-full h-12 border-dashed border-2 border-[#23D2E2] text-[#23D2E2] hover:bg-[#23D2E2]/10 font-bold"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Class Schedule
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold">Ready to Save</h4>
                          <p className="text-sm mt-1">
                            Review all details above. You can always edit this
                            student record later.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
