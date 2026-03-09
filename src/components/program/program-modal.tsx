"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen,
  AlertTriangle,
  Plus,
  Minus,
  Upload,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingTextarea } from "@/components/ui/floating-textarea";
import { FloatingSelect } from "@/components/ui/floating-select";
import { FloatingMultiSelect } from "@/components/ui/floating-multiselect";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DynamicFieldList } from "@/components/program/dynamic-field-list";
import { DynamicFaqList, type FaqItem } from "@/components/program/dynamic-faq-list";
import { CurriculumBuilder, type CurriculumSection } from "@/components/program/curriculum-builder";
import type { ProgramTableRow, PricingPackageType, ProgramFull } from "@/db/schema";
import type { ProgramFormPayload } from "@/app/(dashboard)/program/actions";
import {
  LANGUAGE_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants/program";

export type ProgramModalMode = "add" | "edit" | "delete";

interface BranchOption {
  id: string;
  name: string;
}

interface InstructorOption {
  id: string;
  name: string;
  branch_id: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface PricingItem {
  id: string;
  package_type: PricingPackageType;
  price: number;
  duration: number;
  description: string;
  is_default: boolean;
}

interface SlotItem {
  id: string;
  branch_id: string;
  teacher_ids: string[];
  day: string;
  time: string;
  duration: number;
  limit_student: number;
}

interface ProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ProgramModalMode;
  record: ProgramTableRow | null;
  branches: BranchOption[];
  instructors: InstructorOption[];
  categories: CategoryOption[];
  onAdd: (payload: ProgramFormPayload) => Promise<void>;
  onEdit: (payload: ProgramFormPayload) => Promise<void>;
  onDelete: () => Promise<void>;
  onCreateCategory: (name: string) => Promise<{ success: boolean; categoryId?: string; error?: string }>;
  onFetchProgram: (programId: string) => Promise<{ success: boolean; data?: ProgramFull; error?: string }>;
  onUploadCoverImage: (formData: FormData) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const TABS = [
  { id: "basic" as const, label: "Basic" },
  { id: "info" as const, label: "Info" },
  { id: "curriculum" as const, label: "Curriculum" },
  { id: "pricing" as const, label: "Pricing" },
  { id: "slot" as const, label: "Slot" },
  { id: "media" as const, label: "Media" },
] as const;

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

type TabId = (typeof TABS)[number]["id"];

function generateTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface PricingFieldListProps {
  items: PricingItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<PricingItem>) => void;
  onRemove: (id: string) => void;
}

function PricingFieldList({ items, onAdd, onUpdate, onRemove }: PricingFieldListProps) {
  return (
    <>
      <h6 className="text-base font-bold">Pricing Plans</h6>

      <div className="space-y-4">
        {items.map((plan, index) => (
          <div key={plan.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full bg-muted/30 rounded-xl p-3 sm:p-0 sm:bg-transparent border border-border sm:border-0">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FloatingSelect
                label="Package Type"
                value={plan.package_type}
                onChange={(val) => onUpdate(plan.id, { package_type: val as PricingPackageType })}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "session", label: "Per Session" },
                ]}
              />

              <FloatingInput
                label="Price"
                type="number"
                value={plan.price.toString()}
                onChange={(e) => onUpdate(plan.id, { price: parseFloat(e.target.value) || 0 })}
              />

              <FloatingInput
                label={
                  plan.package_type === "monthly"
                    ? "Duration (months)"
                    : "Number of Sessions"
                }
                type="number"
                value={plan.duration.toString()}
                onChange={(e) => onUpdate(plan.id, { duration: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Add/Remove button */}
            <div className="flex justify-end sm:justify-start">
              {index === 0 ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="p-1 sm:p-0.5 rounded-full border-2 border-[#23D2E2]
                    transition-all duration-200 flex items-center justify-center
                    hover:bg-[#23D2E2]/10 hover:shadow-md"
                  title="Add pricing plan"
                >
                  <Plus size={12} className="text-[#23D2E2] sm:w-[9px] sm:h-[9px]" strokeWidth={5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemove(plan.id)}
                  className="p-1 sm:p-0.5 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10
                    transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                  title="Remove pricing plan"
                >
                  <Minus size={12} className="text-[#fd434f] sm:w-[9px] sm:h-[9px]" strokeWidth={5} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

interface SlotFieldListProps {
  branchId: string;
  branchName: string;
  items: SlotItem[];
  instructors: { id: string; name: string }[];
  onAdd: (branchId: string) => void;
  onUpdate: (id: string, updates: Partial<SlotItem>) => void;
  onRemove: (id: string) => void;
}

function SlotFieldList({ branchId, branchName, items, instructors, onAdd, onUpdate, onRemove }: SlotFieldListProps) {
  const branchSlots = items.filter((s) => s.branch_id === branchId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h6 className="text-sm font-bold text-foreground">{branchName}</h6>
        <span className="text-xs text-muted-foreground">{branchSlots.length} slot(s)</span>
      </div>

      <div className="space-y-3">
        {branchSlots.map((slot, index) => (
          <div key={slot.id} className="flex flex-col gap-3 w-full bg-muted/30 rounded-xl p-3 border border-border">
            <div className="flex-1 space-y-3">
              {/* Row 1: Teacher + Student Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FloatingMultiSelect
                    label="Teacher"
                    value={slot.teacher_ids}
                    onChange={(val) => onUpdate(slot.id, { teacher_ids: val })}
                    options={instructors.map((i) => ({
                      value: i.id,
                      label: i.name,
                    }))}
                  />
                </div>

                <FloatingInput
                  label="Student Limit"
                  type="number"
                  value={slot.limit_student.toString()}
                  onChange={(e) => onUpdate(slot.id, { limit_student: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Row 2: Day + Time + Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FloatingSelect
                  label="Day"
                  value={slot.day}
                  onChange={(val) => onUpdate(slot.id, { day: val })}
                  options={DAY_OPTIONS}
                />

                <FloatingInput
                  label="Time"
                  type="time"
                  value={slot.time}
                  onChange={(e) => onUpdate(slot.id, { time: e.target.value })}
                />

                <div className="col-span-2 sm:col-span-1">
                  <FloatingInput
                    label="Duration (mins)"
                    type="number"
                    value={slot.duration.toString()}
                    onChange={(e) => onUpdate(slot.id, { duration: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Add/Remove button */}
            <div className="flex justify-end">
              {index === 0 ? (
                <button
                  type="button"
                  onClick={() => onAdd(branchId)}
                  className="p-1 rounded-full border-2 border-[#23D2E2]
                    transition-all duration-200 flex items-center justify-center
                    hover:bg-[#23D2E2]/10 hover:shadow-md"
                  title="Add slot"
                >
                  <Plus size={12} className="text-[#23D2E2]" strokeWidth={5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemove(slot.id)}
                  className="p-1 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10
                    transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                  title="Remove slot"
                >
                  <Minus size={12} className="text-[#fd434f]" strokeWidth={5} />
                </button>
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}

export function ProgramModal({
  open,
  onOpenChange,
  mode,
  record,
  branches,
  instructors,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onCreateCategory,
  onFetchProgram,
  onUploadCoverImage,
}: ProgramModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const isLoadingDataRef = useRef(false);

  // Basic tab state
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [numberOfLevels, setNumberOfLevels] = useState("");
  const [sessionsToLevelUp, setSessionsToLevelUp] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [programType, setProgramType] = useState("");
  const [status, setStatus] = useState("active");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImagePreview, setCoverImagePreview] = useState("");
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  // New category creation state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Info tab state
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [outcomes, setOutcomes] = useState<string[]>([""]);
  const [faqs, setFaqs] = useState<FaqItem[]>([{ question: "", answer: "" }]);

  // Curriculum tab state
  const [sections, setSections] = useState<CurriculumSection[]>([]);

  // Pricing tab state
  const [pricing, setPricing] = useState<PricingItem[]>(() => [{
    id: generateTempId(),
    package_type: "monthly",
    price: 0,
    duration: 1,
    description: "",
    is_default: true,
  }]);

  // Slot tab state
  const [slots, setSlots] = useState<SlotItem[]>([]);

  // Sync slots with branches - ensure each branch has at least one slot
  useEffect(() => {
    // Skip slot sync while loading data from database (editing mode)
    if (isLoadingDataRef.current) {
      return;
    }

    if (branchIds.length > 0) {
      setSlots((prevSlots) => {
        const newSlots = [...prevSlots];
        // Remove slots for branches that are no longer selected
        const filteredSlots = newSlots.filter((s) => branchIds.includes(s.branch_id));
        // Add one slot for each branch that doesn't have any
        branchIds.forEach((branchId) => {
          const hasSlot = filteredSlots.some((s) => s.branch_id === branchId);
          if (!hasSlot) {
            filteredSlots.push({
              id: generateTempId(),
              branch_id: branchId,
              teacher_ids: [],
              day: "monday",
              time: "09:00",
              duration: 60,
              limit_student: 10,
            });
          }
        });
        return filteredSlots;
      });
    } else {
      setSlots([]);
    }
  }, [branchIds]);

  // Media tab state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setLocalCategories(categories);
      if (mode === "add") {
        resetForm();
        setActiveTab("basic");
        setError(null);
      } else if (record && mode === "edit") {
        // Fetch full program data when editing
        setIsLoading(true);
        setError(null);
        onFetchProgram(record.id)
          .then((result) => {
            if (result.success && result.data) {
              populateFormFromFullData(result.data);
            } else {
              setError(result.error || "Failed to load program data");
              // Fallback to basic data
              setName(record.name);
              setShortDescription(record.short_description || "");
              setCategoryId(record.category_id || "");
              setStatus(record.status || "active");
            }
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : "Failed to load program data");
          })
          .finally(() => {
            setIsLoading(false);
          });
        setActiveTab("basic");
      } else if (mode === "delete") {
        setActiveTab("basic");
        setError(null);
      }
    }
  }, [open, record, mode, categories, onFetchProgram]);

  // Function to populate form from full program data
  const populateFormFromFullData = (data: ProgramFull) => {
    // Set flag to prevent branchIds useEffect from overwriting slots
    isLoadingDataRef.current = true;

    // Basic tab
    setName(data.name);
    setShortDescription(data.short_description || "");
    setDescription(data.description || "");
    setCategoryId(data.category_id || "");
    setNumberOfLevels(data.number_of_levels?.toString() || "");
    setSessionsToLevelUp(data.sessions_to_level_up?.toString() || "");
    setLanguages(data.languages || []);
    setInstructorIds(data.instructors?.map((i) => i.id) || []);
    setProgramType(data.program_type || "");
    setStatus(data.status || "active");
    setBranchIds(data.branches?.map((b) => b.id) || []);
    setCoverImageUrl(data.cover_image_url || "");
    setCoverImagePreview(data.cover_image_url || "");
    setPendingCoverFile(null);
    setYoutubeUrl(data.youtube_url || "");
    setIsVideoPlaying(false);
    setNewCategoryName("");

    // Info tab
    setRequirements(
      data.requirements?.length > 0
        ? data.requirements.map((r) => r.requirement)
        : [""]
    );
    setOutcomes(
      data.outcomes?.length > 0
        ? data.outcomes.map((o) => o.outcome)
        : [""]
    );
    setFaqs(
      data.faqs?.length > 0
        ? data.faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : [{ question: "", answer: "" }]
    );

    // Curriculum tab
    setSections(
      data.sections?.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description || "",
        lessons: s.lessons?.map((l) => ({
          id: l.id,
          title: l.title,
          thumbnail_url: l.thumbnail_url || null,
          url: l.url || null,
          missions: (l.missions || []).map((m) => ({
            id: generateTempId(),
            level: m.level,
            url_mission: m.url_mission,
            url_answer: m.url_answer,
          })),
        })) || [],
      })) || []
    );

    // Pricing tab
    if (data.pricing && data.pricing.length > 0) {
      setPricing(
        data.pricing.map((p) => ({
          id: p.id,
          package_type: p.package_type,
          price: p.price,
          duration: p.duration,
          description: p.description || "",
          is_default: p.is_default,
        }))
      );
    } else {
      setPricing([{
        id: generateTempId(),
        package_type: "monthly",
        price: 0,
        duration: 1,
        description: "",
        is_default: true,
      }]);
    }

    // Slots tab - populate from database
    if (data.slots && data.slots.length > 0) {
      setSlots(
        data.slots.map((s) => ({
          id: s.id,
          branch_id: s.branch_id,
          teacher_ids: s.teacher_ids || [],
          day: s.day,
          time: s.time,
          duration: s.duration,
          limit_student: s.limit_student,
        }))
      );
    } else {
      // If no slots but have branches, create default slots for each branch
      const defaultSlots = (data.branches || []).map((b) => ({
        id: generateTempId(),
        branch_id: b.id,
        teacher_ids: [],
        day: "monday",
        time: "09:00",
        duration: 60,
        limit_student: 10,
      }));
      setSlots(defaultSlots);
    }

    // Reset the loading flag after state updates are scheduled
    setTimeout(() => {
      isLoadingDataRef.current = false;
    }, 0);
  };

  const resetForm = () => {
    setName("");
    setShortDescription("");
    setDescription("");
    setCategoryId("");
    setNumberOfLevels("");
    setSessionsToLevelUp("");
    setLanguages([]);
    setInstructorIds([]);
    setProgramType("");
    setStatus("active");
    setBranchIds([]);
    setCoverImageUrl("");
    setCoverImagePreview("");
    setPendingCoverFile(null);
    setRequirements([""]);
    setOutcomes([""]);
    setFaqs([{ question: "", answer: "" }]);
    setSections([]);
    setPricing([{
      id: generateTempId(),
      package_type: "monthly",
      price: 0,
      duration: 1,
      description: "",
      is_default: true,
    }]);
    setSlots([]);
    setYoutubeUrl("");
    setIsVideoPlaying(false);
    setNewCategoryName("");
  };

  const handleAddPricing = () => {
    const newPricing: PricingItem = {
      id: generateTempId(),
      package_type: "monthly",
      price: 0,
      duration: 1,
      description: "",
      is_default: pricing.length === 0,
    };
    setPricing([...pricing, newPricing]);
  };

  const handleUpdatePricing = (id: string, updates: Partial<PricingItem>) => {
    setPricing(
      pricing.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleRemovePricing = (id: string) => {
    if (pricing.length > 1) {
      const newPricing = pricing.filter((p) => p.id !== id);
      // If we removed the default, make the first one default
      if (!newPricing.some((p) => p.is_default)) {
        newPricing[0].is_default = true;
      }
      setPricing(newPricing);
    } else {
      // Reset to default empty values if it's the last one
      setPricing([{
        id: generateTempId(),
        package_type: "monthly",
        price: 0,
        duration: 1,
        description: "",
        is_default: true,
      }]);
    }
  };

  // Slot handlers
  const handleAddSlot = (branchId: string) => {
    const newSlot: SlotItem = {
      id: generateTempId(),
      branch_id: branchId,
      teacher_ids: [],
      day: "monday",
      time: "09:00",
      duration: 60,
      limit_student: 10,
    };
    setSlots([...slots, newSlot]);
  };

  const handleUpdateSlot = (id: string, updates: Partial<SlotItem>) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleRemoveSlot = (id: string) => {
    const slotToRemove = slots.find((s) => s.id === id);
    if (!slotToRemove) return;

    const branchId = slotToRemove.branch_id;
    const branchSlots = slots.filter((s) => s.branch_id === branchId);

    if (branchSlots.length > 1) {
      // Remove the slot if there are more than one for this branch
      setSlots(slots.filter((s) => s.id !== id));
    } else {
      // Reset to default empty values if it's the last one for this branch
      setSlots(slots.map((s) =>
        s.id === id
          ? {
              id: generateTempId(),
              branch_id: branchId,
              teacher_ids: [],
              day: "monday",
              time: "09:00",
              duration: 60,
              limit_student: 10,
            }
          : s
      ));
    }
  };

  const buildPayload = (): ProgramFormPayload => {
    return {
      name,
      description: description || null,
      short_description: shortDescription || null,
      category_id: categoryId && categoryId !== "new" ? categoryId : null,
      number_of_levels: numberOfLevels ? parseInt(numberOfLevels) : null,
      sessions_to_level_up: sessionsToLevelUp ? parseInt(sessionsToLevelUp) : null,
      program_type: programType || null,
      status: status || "active",
      branch_id: branchIds[0] || "", // Primary branch
      cover_image_url: coverImageUrl || null,
      youtube_url: youtubeUrl || null,
      assessment_enabled: false,
      levelling_time_minutes: null,
      languages,
      instructor_ids: instructorIds,
      branch_ids: branchIds,
      requirements: requirements.filter((r) => r.trim()),
      outcomes: outcomes.filter((o) => o.trim()),
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      sections: sections
        .filter((s) => s.title.trim())
        .map((s) => ({
          title: s.title,
          description: s.description,
          lessons: s.lessons
            .filter((l) => l.title.trim())
            .map((l) => ({
              title: l.title,
              thumbnail_url: l.thumbnail_url,
              url: l.url,
              missions: l.missions.map((m) => ({
                level: m.level,
                url_mission: m.url_mission,
                url_answer: m.url_answer,
              })),
            })),
        })),
      pricing: pricing.map((p) => ({
        package_type: p.package_type,
        price: p.price,
        duration: p.duration,
        description: p.description || null,
        is_default: p.is_default,
      })),
      slots: slots.map((s) => ({
        branch_id: s.branch_id,
        teacher_ids: s.teacher_ids,
        day: s.day,
        time: s.time,
        duration: s.duration,
        limit_student: s.limit_student,
      })),
    };
  };

  const handleSubmit = async () => {
    // Basic validation
    if (activeTab === "basic" && !name.trim()) {
      setError("Program name is required");
      return;
    }

    if (activeTab === "basic" && branchIds.length === 0) {
      setError("At least one branch must be selected");
      return;
    }

    if (activeTab === "basic" && categoryId === "new" && !newCategoryName.trim()) {
      setError("Please enter a category name");
      return;
    }

    // Navigate to next tab if not on last tab and not deleting
    const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
    const isLastTab = currentTabIndex === TABS.length - 1;

    if (!isLastTab && mode !== "delete") {
      setActiveTab(TABS[currentTabIndex + 1].id);
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload cover image if there's a pending file
      let finalCoverImageUrl = coverImageUrl;
      if (pendingCoverFile && mode !== "delete") {
        const formData = new FormData();
        formData.append("file", pendingCoverFile);
        const uploadResult = await onUploadCoverImage(formData);
        if (uploadResult.success && uploadResult.url) {
          finalCoverImageUrl = uploadResult.url;
          setCoverImageUrl(uploadResult.url);
          setPendingCoverFile(null);
        } else {
          setError(uploadResult.error || "Failed to upload cover image");
          setIsSubmitting(false);
          return;
        }
      }

      // Create new category if needed
      let finalCategoryId = categoryId;
      if (categoryId === "new" && newCategoryName.trim()) {
        const result = await onCreateCategory(newCategoryName.trim());
        if (result.success && result.categoryId) {
          finalCategoryId = result.categoryId;
          // Update local state for UI
          setLocalCategories([
            ...localCategories,
            { id: result.categoryId, name: newCategoryName.trim() },
          ]);
          setCategoryId(result.categoryId);
        } else {
          setError(result.error || "Failed to create category");
          setIsSubmitting(false);
          return;
        }
      }

      if (mode === "delete") {
        await onDelete();
      } else if (mode === "add") {
        const payload = buildPayload();
        // Override with uploaded cover image URL
        payload.cover_image_url = finalCoverImageUrl || null;
        // Override category_id with the newly created one
        if (finalCategoryId && finalCategoryId !== "new") {
          payload.category_id = finalCategoryId;
        }
        await onAdd(payload);
      } else {
        const payload = buildPayload();
        // Override with uploaded cover image URL
        payload.cover_image_url = finalCoverImageUrl || null;
        if (finalCategoryId && finalCategoryId !== "new") {
          payload.category_id = finalCategoryId;
        }
        await onEdit(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === "delete";
  const isLastTab = activeTab === "media" || mode === "delete";
  const submitButtonText = isSubmitting
    ? mode === "delete"
      ? "Deleting..."
      : "Saving..."
    : mode === "delete"
      ? "Confirm Delete"
      : isLastTab
        ? "Save Program"
        : "Next";

  const previewName = name || record?.name || "New Program";

  // Upload handler - store file for later upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the file for upload on submit
      setPendingCoverFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    }
  };

  // YouTube preview
  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const youtubeEmbedUrl = getYoutubeEmbedUrl(youtubeUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:rounded-xl border-0 sm:max-w-4xl"
        floatingCloseButton
      >
        <DialogTitle className="sr-only">
          {mode === "delete"
            ? "Delete Program"
            : mode === "edit"
              ? "Edit Program"
              : "Add New Program"}
        </DialogTitle>
        <div className="flex flex-col lg:grid lg:grid-cols-12 h-[90vh] sm:h-[85vh] lg:h-[80vh] min-h-[500px] overflow-hidden rounded-xl">
          {/* LEFT PANEL - PREVIEW & NAVIGATION (hidden on mobile, shown on lg+) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col border-r border-border">
            {/* Cover Banner */}
            <div className="relative h-24 w-full bg-gradient-to-r from-[#615DFA] to-[#23D2E2]">
              {isVideoPlaying && youtubeEmbedUrl ? (
                <>
                  <iframe
                    src={`${youtubeEmbedUrl}?autoplay=1`}
                    title="YouTube video"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    type="button"
                    onClick={() => setIsVideoPlaying(false)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center z-10 transition-colors"
                    title="Close video"
                  >
                    <span className="text-white text-xs font-bold">✕</span>
                  </button>
                </>
              ) : (
                <>
                  {coverImagePreview && (
                    <img
                      src={coverImagePreview}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {youtubeEmbedUrl && (
                    <button
                      type="button"
                      onClick={() => setIsVideoPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center group"
                      title="Play video"
                    >
                      <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 text-[#615DFA] ml-1" fill="#615DFA" />
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Program Preview */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#615DFA] to-[#23D2E2] flex items-center justify-center text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground truncate">
                    {previewName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {branchIds.length > 0
                      ? `${branchIds.length} branch${branchIds.length > 1 ? "es" : ""}`
                      : "No branch selected"}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 flex gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-[#615DFA]">
                    {sections.reduce((sum, s) => sum + s.lessons.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#23D2E2]">
                    {sections.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {pricing.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Plans</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 py-3 border-b border-border bg-[#f8fafc] flex-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !isReadOnly && setActiveTab(tab.id)}
                  disabled={isReadOnly}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-left text-sm rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "text-[#615DFA] font-bold translate-x-1 bg-[#615DFA]/5"
                      : "text-muted-foreground hover:translate-x-1 hover:text-[#615DFA]",
                    isReadOnly && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className={cn(
                  "w-full h-12 text-white font-bold rounded-xl text-base",
                  mode === "delete"
                    ? "bg-[#fd434f] hover:bg-[#e03a45]"
                    : "bg-[#23D2E2] hover:bg-[#18a9b8] shadow-md"
                )}
              >
                {isLoading ? "Loading..." : submitButtonText}
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
                    isReadOnly && "cursor-not-allowed opacity-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL - FORM CONTENT */}
          <div className="flex-1 lg:col-span-8 overflow-y-auto p-4 sm:p-6">
            {isLoading ? (
              // LOADING STATE
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#615DFA] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="mt-4 text-muted-foreground">Loading program data...</p>
                </div>
              </div>
            ) : mode === "delete" && record ? (
              // DELETE CONFIRMATION VIEW
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-foreground">
                    Delete Program?
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    This action cannot be undone. All curriculum, pricing, and
                    enrollment data will be affected.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#615DFA] to-[#23D2E2] flex items-center justify-center text-white">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{record.name}</h3>
                      <p className="text-muted-foreground">
                        {record.category_name || "No category"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {record.enrolled_count} enrolled
                        </Badge>
                        <Badge variant="secondary">
                          {record.lesson_count} lessons
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // FORM VIEWS BY TAB
              <div className="max-w-3xl mx-auto space-y-6">
                {/* BASIC TAB */}
                {activeTab === "basic" && (
                  <>
                    <h6 className="text-base font-bold">Basic Information</h6>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <FloatingInput
                          label="Program Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FloatingInput
                          label="Short Description"
                          value={shortDescription}
                          onChange={(e) => setShortDescription(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FloatingTextarea
                          label="Full Description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className={categoryId === "new" ? "" : "md:col-span-2"}>
                        <FloatingSelect
                          label="Category"
                          value={categoryId}
                          onChange={setCategoryId}
                          options={[
                            { value: "new", label: "+ Add New Category" },
                            ...localCategories.map((c) => ({
                              value: c.id,
                              label: c.name,
                            })),
                          ]}
                          searchable
                        />
                      </div>

                      {categoryId === "new" && (
                        <FloatingInput
                          label="New Category Name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          required
                        />
                      )}

                      <FloatingInput
                        label="Number of Levels"
                        type="number"
                        value={numberOfLevels}
                        onChange={(e) => setNumberOfLevels(e.target.value)}
                      />

                      <FloatingInput
                        label="Sessions to Level Up"
                        type="number"
                        value={sessionsToLevelUp}
                        onChange={(e) => setSessionsToLevelUp(e.target.value)}
                      />

                      <div className="md:col-span-2">
                        <FloatingMultiSelect
                          label="Languages"
                          value={languages}
                          onChange={setLanguages}
                          options={LANGUAGE_OPTIONS.map((l) => ({
                            value: l.value,
                            label: l.label,
                          }))}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FloatingMultiSelect
                          label="Instructors"
                          value={instructorIds}
                          onChange={setInstructorIds}
                          options={instructors.map((i) => ({
                            value: i.id,
                            label: i.name,
                          }))}
                          searchable
                        />
                      </div>

                      <FloatingSelect
                        label="Program Type"
                        value={programType}
                        onChange={setProgramType}
                        options={PROGRAM_TYPE_OPTIONS.map((p) => ({
                          value: p.value,
                          label: p.label,
                        }))}
                      />

                      <FloatingSelect
                        label="Status"
                        value={status}
                        onChange={setStatus}
                        options={STATUS_OPTIONS.map((s) => ({
                          value: s.value,
                          label: s.label,
                        }))}
                      />

                      <div className="md:col-span-2">
                        <FloatingMultiSelect
                          label="Branches"
                          value={branchIds}
                          onChange={setBranchIds}
                          options={branches.map((b) => ({
                            value: b.id,
                            label: b.name,
                          }))}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* INFO TAB */}
                {activeTab === "info" && (
                  <>
                    <h6 className="text-base font-bold">Program Information</h6>

                    <DynamicFieldList
                      label="Requirements"
                      placeholder="Requirement"
                      items={requirements}
                      onChange={setRequirements}
                    />

                    <DynamicFieldList
                      label="Learning Outcomes"
                      placeholder="Outcome"
                      items={outcomes}
                      onChange={setOutcomes}
                    />

                    <DynamicFaqList items={faqs} onChange={setFaqs} />
                  </>
                )}

                {/* CURRICULUM TAB */}
                {activeTab === "curriculum" && (
                  <>
                    <h6 className="text-base font-bold">Curriculum Builder</h6>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create sections and add lessons. Drag to reorder.
                    </p>

                    <CurriculumBuilder
                      sections={sections}
                      onChange={setSections}
                    />
                  </>
                )}

                {/* PRICING TAB */}
                {activeTab === "pricing" && (
                  <PricingFieldList
                    items={pricing}
                    onAdd={handleAddPricing}
                    onUpdate={handleUpdatePricing}
                    onRemove={handleRemovePricing}
                  />
                )}

                {/* SLOT TAB */}
                {activeTab === "slot" && (
                  <>
                    <h6 className="text-base font-bold">Time Slots</h6>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure time slots for each branch selected in Basic info.
                    </p>

                    {branchIds.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Please select branches in the Basic tab first.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {branchIds.map((branchId) => {
                          const branch = branches.find((b) => b.id === branchId);
                          if (!branch) return null;
                          return (
                            <SlotFieldList
                              key={branchId}
                              branchId={branchId}
                              branchName={branch.name}
                              items={slots}
                              instructors={instructors.filter((i) => i.branch_id === branchId)}
                              onAdd={handleAddSlot}
                              onUpdate={handleUpdateSlot}
                              onRemove={handleRemoveSlot}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* MEDIA TAB */}
                {activeTab === "media" && (
                  <>
                    <h6 className="text-base font-bold">Media & Settings</h6>

                    <div className="space-y-6">
                      {/* YouTube URL */}
                      <div>
                        <FloatingInput
                          label="YouTube Video URL"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                        {youtubeEmbedUrl && (
                          <div className="mt-3 aspect-video rounded-xl overflow-hidden border border-border">
                            <iframe
                              src={youtubeEmbedUrl}
                              title="YouTube video preview"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>

                      {/* Cover Image Upload */}
                      <div>
                        <label className="text-sm font-bold text-foreground block mb-2">
                          Cover Image
                        </label>
                        <div
                          className={cn(
                            "relative rounded-xl border-2 border-dashed border-border",
                            "hover:border-[#23D2E2] transition-colors cursor-pointer",
                            "min-h-[200px] flex items-center justify-center"
                          )}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {coverImagePreview ? (
                            <img
                              src={coverImagePreview}
                              alt="Cover preview"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="text-center p-6">
                              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm font-medium text-foreground">
                                Click to upload cover image
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG up to 5MB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
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
                disabled={isSubmitting || isLoading}
                className={cn(
                  "flex-1 h-11 text-white font-bold rounded-xl",
                  mode === "delete"
                    ? "bg-[#fd434f] hover:bg-[#e03a45]"
                    : "bg-[#23D2E2] hover:bg-[#18a9b8] shadow-md"
                )}
              >
                {isLoading ? "Loading..." : submitButtonText}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
