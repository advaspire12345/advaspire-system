"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Mail,
  CheckCircle,
  AlertTriangle,
  Upload,
  Plus,
  Minus,
  Loader2,
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

export interface InstructorOption {
  id: string;
  name: string;
  branchId: string | null;
}

export interface CoursePricingOption {
  id: string;
  courseId: string;
  packageType: "monthly" | "session";
  price: number;
  duration: number;
  description: string | null;
  isDefault: boolean;
}

export interface CourseSlotOption {
  id: string;
  courseId: string;
  branchId: string;
  day: string;
  time: string;
  duration: number;
  limitStudent: number;
}

export interface ParentOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
}

import { HexagonAvatar } from "@/components/ui/hexagon-avatar";

// Upload Image Field Component with immediate upload
const UploadImageField = ({
  label,
  uploadedUrl,
  onUploadComplete,
  id,
  uploadType,
}: {
  label: string;
  uploadedUrl: string | null;
  onUploadComplete: (url: string | null) => void;
  id: string;
  uploadType: "avatar" | "cover";
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const response = await fetch("/api/student/upload-photo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      onUploadComplete(result.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setFileName(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className={cn(
        "group flex flex-1 items-start justify-center rounded-xl bg-white border border-border",
        "transition-all duration-300 hover:-translate-y-0.5",
        "hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)] hover:border-[#23D2E2]/50",
        "min-h-[100px] py-4 px-3",
        isUploading && "opacity-70 pointer-events-none",
        error && "border-red-300",
      )}
    >
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center"
      >
        {isUploading ? (
          <Loader2
            size={24}
            className="text-[#23D2E2] mb-1.5 animate-spin"
          />
        ) : (
          <Upload
            size={24}
            className={cn(
              "text-[#ADAFCA] mb-1.5 transition-all duration-300",
              "group-hover:text-[#23D2E2]",
              uploadedUrl && "text-[#23D2E2]",
            )}
          />
        )}
        <span className="text-sm font-bold text-foreground">{label}</span>
        {isUploading && (
          <span className="text-xs text-[#23D2E2] mt-1 font-medium">
            Uploading...
          </span>
        )}
        {!isUploading && uploadedUrl && (
          <span className="text-xs text-[#23D2E2] mt-1 font-medium">
            ✓ {fileName || "Uploaded"}
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500 mt-1 font-medium">
            {error}
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          id={id}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export type StudentModalMode = "add" | "edit" | "delete";

export interface StudentFormData {
  // Basic Info
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  schoolName: string | null;

  // Student Account
  studentId: string | null;
  studentPassword: string | null;
  level: number | null;
  adcoinBalance: number;

  // Parent Info
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentRelationship: string | null;
  parentAddress: string | null;
  parentPostcode: string | null;
  parentCity: string | null;
  parentPassword: string | null;

  // Enrollment
  branchId: string;
  courseId: string | null;
  instructorId: string | null;
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
  coursePricing: CoursePricingOption[];
  courseSlots: CourseSlotOption[];
  parents: ParentOption[];
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

const RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
];


export function StudentModal({
  open,
  onOpenChange,
  mode,
  record,
  branches,
  courses,
  coursePricing,
  courseSlots,
  parents,
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
    photoUrl: null,
    coverPhotoUrl: null,
    dateOfBirth: "",
    gender: null,
    schoolName: "",
    studentId: "",
    studentPassword: "",
    level: 1,
    adcoinBalance: 0,
    parentId: null,
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentRelationship: null,
    parentAddress: "",
    parentPostcode: "",
    parentCity: "",
    parentPassword: "",
    branchId: "",
    courseId: "",
    instructorId: null,
    packageId: null,
    packageType: null,
    numberOfMonths: null,
    numberOfSessions: null,
    scheduleEntries: [],
    notes: "",
  });

  // Filter pricing options based on selected course
  const availablePricing = useMemo(() => {
    if (!formData.courseId) return [];
    return coursePricing.filter((p) => p.courseId === formData.courseId);
  }, [coursePricing, formData.courseId]);

  // Check if program has monthly or session pricing
  const hasMonthlyPricing = useMemo(() => {
    return availablePricing.some((p) => p.packageType === "monthly");
  }, [availablePricing]);

  const hasSessionPricing = useMemo(() => {
    return availablePricing.some((p) => p.packageType === "session");
  }, [availablePricing]);

  // Get monthly pricing options for the selected course
  const monthlyPricingOptions = useMemo(() => {
    return availablePricing
      .filter((p) => p.packageType === "monthly")
      .map((p) => ({
        value: p.duration.toString(),
        label: `${p.duration} Month${p.duration > 1 ? "s" : ""} - RM ${p.price.toLocaleString()}`,
        pricingId: p.id,
      }));
  }, [availablePricing]);

  // Get session pricing options for the selected course
  const sessionPricingOptions = useMemo(() => {
    return availablePricing
      .filter((p) => p.packageType === "session")
      .map((p) => ({
        value: p.duration.toString(),
        label: `${p.duration} Session${p.duration > 1 ? "s" : ""} - RM ${p.price.toLocaleString()}`,
        pricingId: p.id,
      }));
  }, [availablePricing]);

  // Filter slots based on selected course AND branch
  const availableSlots = useMemo(() => {
    if (!formData.courseId || !formData.branchId) return [];
    return courseSlots.filter(
      (s) => s.courseId === formData.courseId && s.branchId === formData.branchId
    );
  }, [courseSlots, formData.courseId, formData.branchId]);

  // Get unique available days from slots
  const availableDays = useMemo(() => {
    const days = [...new Set(availableSlots.map((s) => s.day))];
    return days.map((day) => ({
      value: day,
      label: day,
    }));
  }, [availableSlots]);

  // Function to get available times for a specific day
  const getTimesForDay = (day: string) => {
    return availableSlots
      .filter((s) => s.day === day)
      .map((s) => ({
        value: s.time,
        label: `${s.time} (${s.duration} min)`,
      }));
  };

  // Get the selected course's number of levels
  const selectedCourse = useMemo(() => {
    if (!formData.courseId) return null;
    return courses.find((c) => c.id === formData.courseId) || null;
  }, [courses, formData.courseId]);

  // Generate level options based on selected program's number of levels
  const levelOptions = useMemo(() => {
    const maxLevels = selectedCourse?.numberOfLevels || 10;
    return Array.from({ length: maxLevels }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Level ${i + 1}`,
    }));
  }, [selectedCourse]);

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        setFormData({
          name: "",
          email: "",
          phone: "",
          photoUrl: null,
          coverPhotoUrl: null,
          dateOfBirth: "",
          gender: null,
          schoolName: "",
          studentId: "",
          studentPassword: "",
          level: 1,
          adcoinBalance: 0,
          parentId: null,
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          parentRelationship: null,
          parentAddress: "",
          parentPostcode: "",
          parentCity: "",
          parentPassword: "",
          branchId: "",
          courseId: "",
          instructorId: null,
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
          phone: record.phone || "",
          photoUrl: record.photo || null,
          coverPhotoUrl: record.coverPhoto || null,
          dateOfBirth: record.dateOfBirth || "",
          gender: record.gender || null,
          schoolName: record.schoolName || "",
          studentId: record.studentId || "",
          studentPassword: "",
          level: record.level ?? 1,
          adcoinBalance: record.adcoinBalance ?? 0,
          // Load existing parent info if available
          parentId: record.parentId || null,
          parentName: record.parentName || "",
          parentPhone: record.parentPhone || "",
          parentEmail: record.parentEmail || "",
          parentRelationship: record.parentRelationship || null,
          parentAddress: record.parentAddress || "",
          parentPostcode: record.parentPostcode || "",
          parentCity: record.parentCity || "",
          parentPassword: "",
          branchId: record.branchId || "",
          courseId: record.courseId || "",
          instructorId: record.instructorId || null,
          packageId: record.packageId || null,
          packageType: record.packageType || null,
          numberOfMonths: record.packageType === "monthly" ? record.packageDuration : null,
          numberOfSessions: record.packageType === "session" ? record.packageDuration : null,
          scheduleEntries: record.scheduleDays?.length
            ? (() => {
                // Parse times from scheduleTime (comma-separated like "17:00:00, 09:00:00")
                const times = record.scheduleTime
                  ? record.scheduleTime.split(',').map((t) => t.trim())
                  : [];
                return record.scheduleDays.map((day, index) => ({
                  day,
                  time: times[index] || "",
                }));
              })()
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
      console.error("Error in handleSubmit:", err);
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

  // Preview URLs - use uploaded URL or existing record URL
  const previewPhoto = formData.photoUrl || record?.photo || undefined;
  const previewCover = formData.coverPhotoUrl || record?.coverPhoto || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:rounded-xl border-0 sm:max-w-4xl"
        floatingCloseButton
      >
        <DialogTitle className="sr-only">
          {mode === "delete"
            ? "Delete Student"
            : mode === "edit"
              ? "Edit Student"
              : "Add New Student"}
        </DialogTitle>
        <div className="flex flex-col lg:grid lg:grid-cols-12 h-[90vh] sm:h-[80vh] lg:h-[75vh] min-h-[450px] overflow-hidden rounded-xl">
          {/* LEFT PANEL - PREVIEW & NAVIGATION (hidden on mobile, shown on lg+) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col border-r border-border">
            {/* Cover Banner */}
            <div className="relative h-20 w-full bg-gradient-to-r from-primary/80 to-primary overflow-hidden">
              {previewCover ? (
                <img
                  src={previewCover}
                  alt="Cover preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[url('/cover-pattern.png')] opacity-20" />
              )}
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
            <div className="px-6 xl:px-14 pb-5 border-b border-border">
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

            {/* Navigation Tabs - Desktop */}
            <div className="px-6 xl:px-10 py-3 border-b border-border bg-[#f8fafc]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !isReadOnly && setActiveTab(tab.id)}
                  disabled={isReadOnly}
                  className={cn(
                    "w-full flex items-center gap-1 px-4 py-1.5 text-left text-sm rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "text-[#615DFA] font-bold translate-x-1"
                      : "text-muted-foreground hover:translate-x-1 hover:text-[#615DFA]",
                    isReadOnly && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons - Desktop */}
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

          {/* MOBILE HEADER - Tab Navigation (visible on mobile only) */}
          <div className="lg:hidden border-b border-border bg-[#f8fafc]">
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !isReadOnly && setActiveTab(tab.id)}
                  disabled={isReadOnly}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 text-sm rounded-full transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-[#615DFA] text-white font-bold"
                      : "bg-white text-muted-foreground border border-border hover:border-[#615DFA]/50",
                    isReadOnly && "cursor-not-allowed opacity-50",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - FORM CONTENT */}
          <div className="flex-1 lg:col-span-8 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
                        label="Student ID"
                        value={formData.studentId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            studentId: e.target.value,
                          })
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
                            uploadType="avatar"
                            uploadedUrl={formData.photoUrl}
                            onUploadComplete={(url) =>
                              setFormData({ ...formData, photoUrl: url })
                            }
                          />
                          <UploadImageField
                            id="student-cover-upload"
                            label="Upload Cover"
                            uploadType="cover"
                            uploadedUrl={formData.coverPhotoUrl}
                            onUploadComplete={(url) =>
                              setFormData({ ...formData, coverPhotoUrl: url })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Accepted formats: JPG, PNG, WebP. Max size: 5MB each.
                        </p>
                      </div>
                    </div>

                    {/* Student Account Section */}
                    <div className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <FloatingInput
                            label="Password (First-time Login)"
                            type="password"
                            value={formData.studentPassword || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                studentPassword: e.target.value,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Set a temporary password for the student&apos;s first login. They can change it later.
                          </p>
                        </div>
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
                      {/* Parent Selection Dropdown */}
                      <FloatingSelect
                        label="Select Parent"
                        value={formData.parentId || ""}
                        onChange={(val) => {
                          if (val === "new") {
                            // Clear parent fields for new parent entry
                            setFormData({
                              ...formData,
                              parentId: "new",
                              parentName: "",
                              parentPhone: "",
                              parentEmail: "",
                              parentRelationship: null,
                              parentAddress: "",
                              parentPostcode: "",
                              parentCity: "",
                            });
                          } else if (val) {
                            // Load selected parent's info including address, postcode, city
                            const selectedParent = parents.find((p) => p.id === val);
                            if (selectedParent) {
                              setFormData({
                                ...formData,
                                parentId: val,
                                parentName: selectedParent.name,
                                parentPhone: selectedParent.phone || "",
                                parentEmail: selectedParent.email || "",
                                parentRelationship: null, // Will be set by user
                                parentAddress: selectedParent.address || "",
                                parentPostcode: selectedParent.postcode || "",
                                parentCity: selectedParent.city || "",
                              });
                            }
                          } else {
                            setFormData({ ...formData, parentId: null, parentRelationship: null });
                          }
                        }}
                        options={[
                          { value: "new", label: "+ Add New Parent" },
                          ...parents.map((p) => ({
                            value: p.id,
                            label: `${p.name}${p.email ? ` (${p.email})` : ""}`,
                          })),
                        ]}
                      />

                      {/* Show existing parent info if selected */}
                      {formData.parentId && formData.parentId !== "new" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-700 font-medium flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            Parent linked to this student. You can update their details below.
                          </p>
                        </div>
                      )}

                      {/* Show parent form when: new parent selected or editing existing parent */}
                      {(formData.parentId === "new" || formData.parentId) && (
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
                            <FloatingSelect
                              label="Relationship"
                              value={formData.parentRelationship || ""}
                              onChange={(val) =>
                                setFormData({
                                  ...formData,
                                  parentRelationship: val || null,
                                })
                              }
                              options={RELATIONSHIP_OPTIONS}
                            />

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

                            {/* Parent Password - Only show for new parent */}
                            {formData.parentId === "new" && (
                              <div className="md:col-span-2">
                                <FloatingInput
                                  label="Password (First-time Login)"
                                  type="password"
                                  value={formData.parentPassword || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      parentPassword: e.target.value,
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                  Set a temporary password for the parent&apos;s first login.
                                </p>
                              </div>
                            )}
                          </div>

                          {formData.parentId === "new" && (
                            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                              <p className="text-sm text-info font-medium flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                Parent account will be created automatically with
                                student enrollment
                              </p>
                            </div>
                          )}
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

                    {/* Branch, Program, Instructor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FloatingSelect
                        label="Branch"
                        value={formData.branchId}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            branchId: val,
                            instructorId: null,
                            scheduleEntries: [], // Reset schedule when branch changes
                          })
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
                          setFormData({
                            ...formData,
                            courseId: val,
                            packageType: null, // Reset package type when course changes
                            packageId: null,
                            numberOfMonths: null,
                            numberOfSessions: null,
                            scheduleEntries: [], // Reset schedule when course changes
                          })
                        }
                        options={courses.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                      />
                      {/* Level and Adcoin Balance */}
                      <FloatingSelect
                        label="Level"
                        value={formData.level?.toString() || "1"}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            level: val ? parseInt(val) : 1,
                          })
                        }
                        options={levelOptions}
                        disabled={!formData.courseId}
                      />
                      <FloatingInput
                        label="Adcoin Balance"
                        type="number"
                        value={formData.adcoinBalance.toString()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            adcoinBalance: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    {/* Package Type Selection - Only show if program has pricing */}
                    {formData.courseId && (hasMonthlyPricing || hasSessionPricing) ? (
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-foreground">
                          Package Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {hasMonthlyPricing && (
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
                          )}
                          {hasSessionPricing && (
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
                          )}
                        </div>
                      </div>
                    ) : formData.courseId ? (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <p className="text-sm text-muted-foreground text-center">
                          No pricing packages available for this program
                        </p>
                      </div>
                    ) : null}

                    {/* Monthly Package Options */}
                    {formData.packageType === "monthly" && monthlyPricingOptions.length > 0 && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <FloatingSelect
                          label="Monthly Package"
                          value={formData.numberOfMonths?.toString() || ""}
                          onChange={(val) => {
                            const selectedPricing = monthlyPricingOptions.find(
                              (p) => p.value === val
                            );
                            setFormData({
                              ...formData,
                              numberOfMonths: val ? parseInt(val) : null,
                              packageId: selectedPricing?.pricingId || null,
                            });
                          }}
                          options={monthlyPricingOptions}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Select the duration for this monthly subscription
                        </p>
                      </div>
                    )}

                    {/* Session Package Options */}
                    {formData.packageType === "session" && sessionPricingOptions.length > 0 && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border">
                        <FloatingSelect
                          label="Session Package"
                          value={formData.numberOfSessions?.toString() || ""}
                          onChange={(val) => {
                            const selectedPricing = sessionPricingOptions.find(
                              (p) => p.value === val
                            );
                            setFormData({
                              ...formData,
                              numberOfSessions: val ? parseInt(val) : null,
                              packageId: selectedPricing?.pricingId || null,
                            });
                          }}
                          options={sessionPricingOptions}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Select total sessions for this enrollment package
                        </p>
                      </div>
                    )}

                    {/* Class Schedule - Based on available slots */}
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-foreground">
                        Class Schedule
                      </label>

                      {formData.courseId && formData.branchId ? (
                        availableDays.length > 0 ? (
                          <div className="space-y-4">
                            {/* Schedule entry rows - matching pricing pattern */}
                            {formData.scheduleEntries.map((entry, index) => {
                              const timesForDay = entry.day ? getTimesForDay(entry.day) : [];
                              return (
                                <div
                                  key={index}
                                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full bg-muted/30 rounded-xl p-3 sm:p-0 sm:bg-transparent border border-border sm:border-0"
                                >
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Day dropdown */}
                                    <FloatingSelect
                                      label="Day"
                                      value={entry.day}
                                      onChange={(val) => {
                                        const newEntries = [...formData.scheduleEntries];
                                        newEntries[index] = { day: val, time: "" };
                                        setFormData({
                                          ...formData,
                                          scheduleEntries: newEntries,
                                        });
                                      }}
                                      options={availableDays}
                                    />

                                    {/* Time dropdown */}
                                    <FloatingSelect
                                      label="Time"
                                      value={entry.time}
                                      onChange={(val) => {
                                        const newEntries = [...formData.scheduleEntries];
                                        newEntries[index] = { ...entry, time: val };
                                        setFormData({
                                          ...formData,
                                          scheduleEntries: newEntries,
                                        });
                                      }}
                                      options={timesForDay}
                                      disabled={!entry.day}
                                    />
                                  </div>

                                  {/* Add/Remove button */}
                                  <div className="flex justify-end sm:justify-start">
                                    {index === 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            scheduleEntries: [
                                              ...formData.scheduleEntries,
                                              { day: "", time: "" },
                                            ],
                                          });
                                        }}
                                        className="p-1 sm:p-0.5 rounded-full border-2 border-[#23D2E2]
                                          transition-all duration-200 flex items-center justify-center
                                          hover:bg-[#23D2E2]/10 hover:shadow-md"
                                        title="Add schedule"
                                      >
                                        <Plus size={12} className="text-[#23D2E2] sm:w-[9px] sm:h-[9px]" strokeWidth={5} />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newEntries = formData.scheduleEntries.filter(
                                            (_, i) => i !== index
                                          );
                                          setFormData({
                                            ...formData,
                                            scheduleEntries: newEntries,
                                          });
                                        }}
                                        className="p-1 sm:p-0.5 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10
                                          transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                                        title="Remove schedule"
                                      >
                                        <Minus size={12} className="text-[#fd434f] sm:w-[9px] sm:h-[9px]" strokeWidth={5} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Initial state - show first entry automatically */}
                            {formData.scheduleEntries.length === 0 && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full bg-muted/30 rounded-xl p-3 sm:p-0 sm:bg-transparent border border-border sm:border-0">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <FloatingSelect
                                    label="Day"
                                    value=""
                                    onChange={(val) => {
                                      setFormData({
                                        ...formData,
                                        scheduleEntries: [{ day: val, time: "" }],
                                      });
                                    }}
                                    options={availableDays}
                                  />
                                  <FloatingSelect
                                    label="Time"
                                    value=""
                                    onChange={() => {}}
                                    options={[]}
                                    disabled
                                  />
                                </div>
                                <div className="flex justify-end sm:justify-start">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        scheduleEntries: [{ day: "", time: "" }],
                                      });
                                    }}
                                    className="p-1 sm:p-0.5 rounded-full border-2 border-[#23D2E2]
                                      transition-all duration-200 flex items-center justify-center
                                      hover:bg-[#23D2E2]/10 hover:shadow-md"
                                    title="Add schedule"
                                  >
                                    <Plus size={12} className="text-[#23D2E2] sm:w-[9px] sm:h-[9px]" strokeWidth={5} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-muted/30 p-4 rounded-xl border border-border">
                            <p className="text-sm text-muted-foreground text-center">
                              No class slots available for this program at the selected branch
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                          <p className="text-sm text-muted-foreground text-center">
                            Please select both a program and branch to see available class schedules
                          </p>
                        </div>
                      )}
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

          {/* MOBILE ACTION BUTTONS - Fixed at bottom (visible on mobile only) */}
          <div className="lg:hidden border-t border-border bg-white px-4 py-3 space-y-2">
            {error && (
              <p className="text-center text-sm text-red-500 font-medium">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1 h-11 rounded-xl font-bold border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 h-11 text-white font-bold rounded-xl",
                  mode === "delete"
                    ? "bg-[#fd434f] hover:bg-[#e03a45]"
                    : "bg-[#23D2E2] hover:bg-[#18a9b8] shadow-md",
                )}
              >
                {submitButtonText}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
