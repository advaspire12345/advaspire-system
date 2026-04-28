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
  Users,
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

export interface StudentSelectOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  schoolName: string | null;
  photo: string | null;
  coverPhoto: string | null;
  branchId: string;
  level: number;
  adcoinBalance: number;
  studentId: string | null;
  enrolledCourseIds: string[];
  parentId: string | null;
  parentRelationship: string | null;
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
  username: string | null;
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
  portalPassword: string | null;
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

  // Existing student (when enrolling in new program)
  existingStudentId: string | null;

  // Sibling Sharing
  shareWithSibling: boolean;
  existingPoolId: string | null;

  // Enrollment Status (edit only)
  enrollmentStatus: string | null;

  // Notes
  notes: string | null;
}

// Sibling pool info from API
export interface SiblingPoolCheckResult {
  hasPool: boolean;
  hasSiblingInCourse?: boolean;
  poolInfo?: {
    poolId: string;
    poolName: string | null;
    courseId: string;
    courseName: string;
    sessionsRemaining: number;
    totalSessions: number;
    packageId: string | null;
    packageType: "monthly" | "session" | null;
    packageDuration: number | null;
    siblings: { studentId: string; studentName: string }[];
  } | null;
  siblings?: { studentId: string; studentName: string; enrollmentId: string }[];
  siblingPackageInfo?: {
    packageId: string | null;
    packageType: string | null;
    packageDuration: number | null;
  } | null;
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
  students: StudentSelectOption[];
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

const ENROLLMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Pending" },
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
  students,
  onAdd,
  onEdit,
  onDelete,
}: StudentModalProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["id"]>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sibling pool state
  const [siblingPoolCheck, setSiblingPoolCheck] = useState<SiblingPoolCheckResult | null>(null);
  const [isCheckingPool, setIsCheckingPool] = useState(false);
  const [poolSiblings, setPoolSiblings] = useState<string[]>([]);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Track whether user is adding a new student or editing existing
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Store sibling's package info for restoring when switching package types
  const [siblingPackage, setSiblingPackage] = useState<{
    packageId: string | null;
    packageType: "monthly" | "session" | null;
    packageDuration: number | null;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    username: "",
    email: "",
    phone: "",
    photoUrl: null,
    coverPhotoUrl: null,
    dateOfBirth: "",
    gender: null,
    schoolName: "",
    studentId: "",
    studentPassword: "",
    portalPassword: "",
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
    existingStudentId: null,
    scheduleEntries: [],
    shareWithSibling: false,
    existingPoolId: null,
    enrollmentStatus: null,
    notes: "",
  });

  // Filter courses for existing students (exclude already enrolled programs) - add mode only
  const availableCourses = useMemo(() => {
    if (mode !== "add" || !selectedStudentId || selectedStudentId === "new") return courses;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return courses;
    return courses.filter((c) => !student.enrolledCourseIds.includes(c.id));
  }, [courses, students, selectedStudentId, mode]);

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

  // Check for sibling pools when parent and course are selected
  const isPooled = record?.isPooled ?? false;
  const recordId = record?.id ?? null;

  useEffect(() => {
    // Must include `open` in deps so re-opening the modal for the same student re-triggers the check
    if (!open) return;

    const controller = new AbortController();

    const checkSiblingPool = async () => {
      // Skip if already pooled in edit mode (button shows via record.isPooled)
      // Skip if missing parent or course
      if (
        (mode === "edit" && isPooled) ||
        !formData.parentId ||
        formData.parentId === "new" ||
        !formData.courseId
      ) {
        setSiblingPoolCheck(null);
        return;
      }

      setIsCheckingPool(true);
      try {
        const excludeParam = mode === "edit" && recordId ? `&excludeStudentId=${recordId}` : "";
        const response = await fetch(
          `/api/pools/check-sibling?parentId=${formData.parentId}&courseId=${formData.courseId}${excludeParam}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok) {
          // Core check: does this parent have enough children for sharing?
          // Edit mode: current student is counted, so need > 1 (has siblings)
          // Add mode: new student not in DB yet, so need >= 1 (existing child to share with)
          const parentChildCount = data.parentChildCount ?? 0;
          const minChildren = mode === "edit" ? 2 : 1;
          if (parentChildCount < minChildren) {
            setSiblingPoolCheck(null);
            setSiblingPackage(null);
            return;
          }

          setSiblingPoolCheck(data);

          // Store sibling package info for the shared button
          const pkgInfo = data.hasPool ? data.poolInfo : data.hasSiblingInCourse ? data.siblingPackageInfo : null;
          if (pkgInfo) {
            const pkgType = pkgInfo.packageType || "session";
            const pkgDuration = pkgInfo.packageDuration || null;
            const pkgId = pkgInfo.packageId || null;

            setSiblingPackage({
              packageId: pkgId,
              packageType: pkgType as "monthly" | "session",
              packageDuration: pkgDuration,
            });

            // Only auto-set shareWithSibling in ADD mode (not edit — user may have deliberately unshared)
            if (mode === "add") {
              setFormData((prev) => ({
                ...prev,
                shareWithSibling: true,
                existingPoolId: data.hasPool ? data.poolInfo.poolId : null,
                packageType: pkgType,
                packageId: pkgId,
                numberOfMonths: pkgType === "monthly" ? pkgDuration : null,
                numberOfSessions: pkgType === "session" ? pkgDuration : null,
              }));
            }
          }
        } else {
          setSiblingPoolCheck(null);
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSiblingPoolCheck(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingPool(false);
        }
      }
    };

    checkSiblingPool();
    return () => controller.abort();
  }, [open, mode, formData.parentId, formData.courseId, isPooled, recordId]);

  // Auto-generate student ID when add modal opens, "Add New Student" is selected, or branch changes
  useEffect(() => {
    const generateStudentId = async () => {
      if (mode === "add" && open && (!selectedStudentId || selectedStudentId === "new")) {
        setIsGeneratingId(true);
        try {
          const branchParam = formData.branchId ? `?branchId=${formData.branchId}` : '';
          const response = await fetch(`/api/student/generate-id${branchParam}`);
          const data = await response.json();
          if (response.ok && data.studentId) {
            setFormData((prev) => ({
              ...prev,
              studentId: data.studentId,
            }));
          }
        } catch (error) {
          console.error("Error generating student ID:", error);
        } finally {
          setIsGeneratingId(false);
        }
      }
    };

    generateStudentId();
  }, [mode, open, selectedStudentId, formData.branchId]);

  // Fetch pool siblings for edit mode when student is pooled
  useEffect(() => {
    const fetchPoolSiblings = async () => {
      if (mode === "edit" && record?.isPooled && record?.poolId) {
        try {
          const response = await fetch(
            `/api/pools/check-sibling?poolId=${record.poolId}`
          );
          const data = await response.json();
          if (response.ok && data.poolInfo) {
            // Filter out current student from siblings list
            const siblingNames = data.poolInfo.siblings
              ?.filter((s: { studentId: string }) => s.studentId !== record.id)
              .map((s: { studentName: string }) => s.studentName) || [];
            setPoolSiblings(siblingNames);

            // Store sibling's package info for restoring when switching
            if (data.poolInfo.packageId || data.poolInfo.packageType) {
              setSiblingPackage({
                packageId: data.poolInfo.packageId,
                packageType: data.poolInfo.packageType,
                packageDuration: data.poolInfo.packageDuration,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching pool siblings:", error);
        }
      }
    };

    if (open && mode === "edit" && record?.isPooled) {
      fetchPoolSiblings();
    }
  }, [open, mode, record?.isPooled, record?.poolId, record?.id]);

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      // Reset sibling pool check state — the sibling check useEffect will re-run and populate
      setSiblingPoolCheck(null);
      setIsCheckingPool(true);
      setPoolSiblings([]);
      setSiblingPackage(null);

      if (mode === "add") {
        setSelectedStudentId(null);
      } else if (record) {
        setSelectedStudentId(record.id);
      }

      if (mode === "add") {
        setFormData({
          name: "",
          username: "",
          email: "",
          phone: "",
          photoUrl: null,
          coverPhotoUrl: null,
          dateOfBirth: "",
          gender: null,
          schoolName: "",
          studentId: "",
          studentPassword: "",
          portalPassword: "",
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
          existingStudentId: null,
          scheduleEntries: [],
          shareWithSibling: false,
          existingPoolId: null,
          enrollmentStatus: null,
          notes: "",
        });
        setActiveTab("basic");
      } else if (record) {
        setFormData({
          name: record.name,
          username: record.email ? record.email.split("@")[0] : "",
          email: record.email || "",
          phone: record.phone || "",
          photoUrl: record.photo || null,
          coverPhotoUrl: record.coverPhoto || null,
          dateOfBirth: record.dateOfBirth || "",
          gender: record.gender || null,
          schoolName: record.schoolName || "",
          studentId: record.studentId || "",
          studentPassword: "",
          portalPassword: "",
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
          existingStudentId: null,
          shareWithSibling: record.isPooled || false,
          existingPoolId: record.poolId || null,
          enrollmentStatus: record.enrollmentStatus || null,
          notes: "",
        });
        setActiveTab("basic");
      }
      setError(null);
    }
  }, [open, record, mode]);

  const handleSubmit = async () => {
    // Basic validation — always check name regardless of active tab
    if (activeTab === "basic") {
      if (mode === "add" && selectedStudentId === "new" && !formData.name.trim()) {
        setError("Student name is required");
        return;
      }
      if (mode === "add" && !selectedStudentId) {
        setError("Please select or add a student");
        return;
      }
      if (mode === "edit" && !formData.name.trim()) {
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

    // Final submission — validate basic info even if user navigated directly to enrollment tab
    if (isLastTab && mode !== "delete") {
      if (mode === "add" && selectedStudentId === "new" && !formData.name.trim()) {
        setError("Student name is required. Please go back to Basic Info tab.");
        setActiveTab("basic");
        return;
      }
      if (mode === "add" && !selectedStudentId) {
        setError("Please select or add a student in the Basic Info tab.");
        setActiveTab("basic");
        return;
      }
      if (mode === "edit" && !formData.name.trim()) {
        setError("Student name is required. Please go back to Basic Info tab.");
        setActiveTab("basic");
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
                      {mode === "add" ? (
                        <>
                          {/* Student select + Student ID for existing student */}
                          <div className={selectedStudentId === "new" ? "md:col-span-2" : ""}>
                          <FloatingSelect
                            label={selectedStudentId === "new" ? "Student" : "Student Full Name"}
                            value={selectedStudentId || ""}
                            onChange={(val) => {
                              if (val === "new") {
                                setSelectedStudentId("new");
                                setFormData({
                                  ...formData,
                                  name: "",
                                  username: "",
                                  email: "",
                                  phone: "",
                                  photoUrl: null,
                                  coverPhotoUrl: null,
                                  dateOfBirth: "",
                                  gender: null,
                                  schoolName: "",
                                  studentId: "",
                                  level: 1,
                                  adcoinBalance: 0,
                                  existingStudentId: null,
                                  courseId: "",
                                  parentId: null,
                                  parentName: "",
                                  parentPhone: "",
                                  parentEmail: "",
                                  parentRelationship: null,
                                  parentAddress: "",
                                  parentPostcode: "",
                                  parentCity: "",
                                });
                              } else if (val) {
                                const selected = students.find((s) => s.id === val);
                                if (selected) {
                                  setSelectedStudentId(val);
                                  // Auto-select parent if student has one
                                  const parentUpdate: Partial<StudentFormData> = {};
                                  if (selected.parentId) {
                                    const selectedParent = parents.find((p) => p.id === selected.parentId);
                                    if (selectedParent) {
                                      parentUpdate.parentId = selectedParent.id;
                                      parentUpdate.parentName = selectedParent.name;
                                      parentUpdate.parentPhone = selectedParent.phone || "";
                                      parentUpdate.parentEmail = selectedParent.email || "";
                                      parentUpdate.parentAddress = selectedParent.address || "";
                                      parentUpdate.parentPostcode = selectedParent.postcode || "";
                                      parentUpdate.parentCity = selectedParent.city || "";
                                      parentUpdate.parentRelationship = selected.parentRelationship || null;
                                    }
                                  }
                                  setFormData({
                                    ...formData,
                                    name: selected.name,
                                    username: selected.email ? selected.email.split("@")[0] : "",
                                    email: selected.email || "",
                                    phone: selected.phone || "",
                                    photoUrl: selected.photo || null,
                                    coverPhotoUrl: selected.coverPhoto || null,
                                    dateOfBirth: selected.dateOfBirth || "",
                                    gender: selected.gender || null,
                                    schoolName: selected.schoolName || "",
                                    studentId: selected.studentId || "",
                                    branchId: selected.branchId,
                                    level: selected.level,
                                    adcoinBalance: selected.adcoinBalance,
                                    existingStudentId: val,
                                    courseId: "",
                                    ...parentUpdate,
                                  });
                                }
                              } else {
                                setSelectedStudentId(null);
                              }
                            }}
                            options={[
                              { value: "new", label: "+ Add New Student" },
                              ...students.map((s) => ({
                                value: s.id,
                                label: `${s.name}${s.studentId ? ` (${s.studentId})` : ""}`,
                              })),
                            ]}
                            searchable
                          />
                          </div>
                          {/* Student ID - shown next to select for initial state and existing student */}
                          {selectedStudentId !== "new" && (
                            <FloatingInput
                              label="Student ID"
                              value={isGeneratingId ? "Generating..." : (formData.studentId || "")}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  studentId: e.target.value,
                                })
                              }
                              disabled={isGeneratingId || (!!selectedStudentId && selectedStudentId !== "new")}
                            />
                          )}
                          {/* Full Name + Student ID row - only when adding new */}
                          {selectedStudentId === "new" && (
                            <>
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
                                value={isGeneratingId ? "Generating..." : (formData.studentId || "")}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    studentId: e.target.value,
                                  })
                                }
                                disabled={isGeneratingId}
                              />
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Edit mode - plain inputs, no selection */}
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
                        </>
                      )}
                      <FloatingInput
                        label="Username (for student portal login)"
                        value={formData.username || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            username: e.target.value,
                          })
                        }
                      />

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
                            label={mode === "edit" ? "Portal Password (leave blank to keep)" : "Portal Password"}
                            type="password"
                            value={formData.portalPassword || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                portalPassword: e.target.value,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Password for the student game portal login. Username is set above in Basic Info.
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
                            label: `${p.name}${p.phone ? ` (${p.phone})` : ""}${p.email ? ` - ${p.email}` : ""}`,
                          })),
                        ]}
                        searchable
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
                        options={availableCourses.map((c) => ({
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
                        min={0}
                        value={formData.adcoinBalance.toString()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            adcoinBalance: val < 0 ? 0 : val,
                          });
                        }}
                      />
                      {/* Enrollment Status - Edit mode only */}
                      {mode === "edit" && (
                        <FloatingSelect
                          label="Status"
                          value={formData.enrollmentStatus || ""}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              enrollmentStatus: val || null,
                            })
                          }
                          options={ENROLLMENT_STATUS_OPTIONS}
                        />
                      )}
                    </div>

                    {/* Package Type Selection - Only show if program has pricing */}
                    {formData.courseId && (hasMonthlyPricing || hasSessionPricing) ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-bold text-foreground">
                            Package Type
                          </label>
                          {mode === "add" && isCheckingPool && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        {/* Show 3 columns if siblings detected or student is pooled */}
                        <div className={cn(
                          "grid gap-4",
                          (siblingPoolCheck && (
                            (siblingPoolCheck.hasPool && (siblingPoolCheck.poolInfo?.siblings?.length ?? 0) > 0)
                            || (siblingPoolCheck.hasSiblingInCourse && (siblingPoolCheck.siblings?.length ?? 0) > 0)
                          ))
                            || (mode === "edit" && record?.isPooled)
                            ? "grid-cols-3"
                            : "grid-cols-2"
                        )}>
                          {hasMonthlyPricing && (() => {
                            // Disable Monthly when sibling sharing is available (session-based siblings detected)
                            const siblingCanShare = siblingPoolCheck && (
                              (siblingPoolCheck.hasPool && (siblingPoolCheck.poolInfo?.siblings?.length ?? 0) > 0)
                              || (siblingPoolCheck.hasSiblingInCourse && (siblingPoolCheck.siblings?.length ?? 0) > 0)
                            );
                            return (
                            <button
                              type="button"
                              disabled={!!siblingCanShare}
                              onClick={() => {
                                if (siblingCanShare) return;
                                // If sibling has monthly package, restore it
                                if (formData.shareWithSibling && siblingPackage?.packageType === "monthly") {
                                  setFormData({
                                    ...formData,
                                    packageType: "monthly",
                                    numberOfSessions: null,
                                    numberOfMonths: siblingPackage.packageDuration,
                                    packageId: siblingPackage.packageId,
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    packageType: "monthly",
                                    numberOfSessions: null,
                                  });
                                }
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                                siblingCanShare
                                  ? "border-border opacity-40 cursor-not-allowed"
                                  : formData.packageType === "monthly"
                                    ? "border-[#23D2E2] bg-[#23D2E2]/10"
                                    : "border-border hover:border-[#23D2E2]/50",
                              )}
                            >
                              <span className="text-2xl mb-2">📅</span>
                              <span className="font-bold">Monthly</span>
                              <span className="text-xs text-muted-foreground">
                                {siblingCanShare ? "Not available for shared" : "Pay per month"}
                              </span>
                            </button>
                            );
                          })()}
                          {hasSessionPricing && (
                            <button
                              type="button"
                              onClick={() => {
                                // If sibling has session package, restore it
                                if (formData.shareWithSibling && siblingPackage?.packageType === "session") {
                                  setFormData({
                                    ...formData,
                                    packageType: "session",
                                    numberOfMonths: null,
                                    numberOfSessions: siblingPackage.packageDuration,
                                    packageId: siblingPackage.packageId,
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    packageType: "session",
                                    numberOfMonths: null,
                                  });
                                }
                              }}
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
                          {/* Shared button - show when siblings exist in same course, or student is already pooled */}
                          {((siblingPoolCheck && (
                            (siblingPoolCheck.hasPool && (siblingPoolCheck.poolInfo?.siblings?.length ?? 0) > 0)
                            || (siblingPoolCheck.hasSiblingInCourse && (siblingPoolCheck.siblings?.length ?? 0) > 0)
                          ))
                            || (mode === "edit" && record?.isPooled)) && (() => {
                            return (
                            <button
                              type="button"
                              onClick={() => {
                                // Toggle shared off if already active
                                if (formData.shareWithSibling) {
                                  setFormData({
                                    ...formData,
                                    shareWithSibling: false,
                                    existingPoolId: null,
                                  });
                                  return;
                                }

                                // For edit mode with pooled student
                                if (mode === "edit" && record?.isPooled) {
                                  setFormData({
                                    ...formData,
                                    shareWithSibling: true,
                                    existingPoolId: record.poolId,
                                  });
                                  return;
                                }

                                // Get sibling's package info from pool or from siblingPackageInfo
                                const siblingPackageId = siblingPoolCheck?.poolInfo?.packageId
                                  || siblingPoolCheck?.siblingPackageInfo?.packageId
                                  || null;
                                const siblingPackageType = siblingPoolCheck?.poolInfo?.packageType
                                  || siblingPoolCheck?.siblingPackageInfo?.packageType
                                  || "session";
                                const siblingPackageDuration = siblingPoolCheck?.poolInfo?.packageDuration
                                  || siblingPoolCheck?.siblingPackageInfo?.packageDuration
                                  || null;

                                setFormData({
                                  ...formData,
                                  packageType: siblingPackageType as "monthly" | "session",
                                  numberOfMonths: siblingPackageType === "monthly" ? siblingPackageDuration : null,
                                  numberOfSessions: siblingPackageType === "session" ? siblingPackageDuration : null,
                                  packageId: siblingPackageId,
                                  shareWithSibling: true,
                                  existingPoolId: siblingPoolCheck?.poolInfo?.poolId || null,
                                });
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                                formData.shareWithSibling
                                  ? "border-[#615DFA] bg-[#615DFA]/10"
                                  : "border-border hover:border-[#615DFA]/50",
                              )}
                            >
                              <Users className="h-6 w-6 mb-2 text-[#615DFA]" />
                              <span className="font-bold">Shared</span>
                              <span className="text-xs text-muted-foreground text-center truncate max-w-full">
                                ({mode === "edit" && record?.isPooled
                                  ? poolSiblings.join(", ") || "Loading..."
                                  : siblingPoolCheck?.hasPool && siblingPoolCheck?.poolInfo
                                    ? siblingPoolCheck.poolInfo.siblings.map(s => s.studentName).join(", ")
                                    : siblingPoolCheck?.siblings?.map(s => s.studentName).join(", ") || ""})
                              </span>
                            </button>
                            );
                          })()}
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
