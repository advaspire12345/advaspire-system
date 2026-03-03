"use client";

import { useState } from "react";
import { Plus, X, GripVertical, ChevronDown, ChevronUp, Video, FileText, HelpCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingTextarea } from "@/components/ui/floating-textarea";
import { FloatingSelect } from "@/components/ui/floating-select";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LessonContentType } from "@/db/schema";

export interface CurriculumLesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number | null;
  content_type: LessonContentType | null;
}

export interface CurriculumSection {
  id: string;
  title: string;
  description: string;
  lessons: CurriculumLesson[];
}

interface CurriculumBuilderProps {
  sections: CurriculumSection[];
  onChange: (sections: CurriculumSection[]) => void;
}

const CONTENT_TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text/Article" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
];

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  text: <FileText className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  assignment: <ClipboardList className="h-4 w-4" />,
};

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface SortableLessonProps {
  lesson: CurriculumLesson;
  sectionId: string;
  onUpdate: (sectionId: string, lessonId: string, updates: Partial<CurriculumLesson>) => void;
  onRemove: (sectionId: string, lessonId: string) => void;
}

function SortableLesson({ lesson, sectionId, onUpdate, onRemove }: SortableLessonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg border border-border ml-6",
        isDragging && "shadow-lg opacity-90 z-50"
      )}
    >
      {/* Lesson Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {lesson.content_type && CONTENT_TYPE_ICONS[lesson.content_type] && (
            <span className="text-muted-foreground">
              {CONTENT_TYPE_ICONS[lesson.content_type]}
            </span>
          )}
          <span className="text-sm font-medium truncate">
            {lesson.title || "Untitled Lesson"}
          </span>
          {lesson.duration_minutes && (
            <span className="text-xs text-muted-foreground">
              ({lesson.duration_minutes} min)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onRemove(sectionId, lesson.id)}
          className="p-1 hover:bg-red-50 rounded transition-colors text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Lesson Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <FloatingInput
            label="Lesson Title"
            value={lesson.title}
            onChange={(e) => onUpdate(sectionId, lesson.id, { title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FloatingSelect
              label="Content Type"
              value={lesson.content_type || ""}
              onChange={(val) => onUpdate(sectionId, lesson.id, { content_type: val as LessonContentType })}
              options={CONTENT_TYPE_OPTIONS}
            />
            <FloatingInput
              label="Duration (minutes)"
              type="number"
              value={lesson.duration_minutes?.toString() || ""}
              onChange={(e) => onUpdate(sectionId, lesson.id, {
                duration_minutes: e.target.value ? parseInt(e.target.value) : null
              })}
            />
          </div>
          <FloatingTextarea
            label="Lesson Description"
            value={lesson.description}
            onChange={(e) => onUpdate(sectionId, lesson.id, { description: e.target.value })}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

interface SortableSectionProps {
  section: CurriculumSection;
  onUpdate: (sectionId: string, updates: Partial<CurriculumSection>) => void;
  onRemove: (sectionId: string) => void;
  onAddLesson: (sectionId: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string, updates: Partial<CurriculumLesson>) => void;
  onRemoveLesson: (sectionId: string, lessonId: string) => void;
  onReorderLessons: (sectionId: string, lessons: CurriculumLesson[]) => void;
}

function SortableSection({
  section,
  onUpdate,
  onRemove,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
  onReorderLessons,
}: SortableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const lessonSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.lessons.findIndex((l) => l.id === active.id);
      const newIndex = section.lessons.findIndex((l) => l.id === over.id);
      onReorderLessons(section.id, arrayMove(section.lessons, oldIndex, newIndex));
    }
  };

  const totalDuration = section.lessons.reduce(
    (sum, l) => sum + (l.duration_minutes || 0),
    0
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-muted/30 rounded-xl border border-border overflow-hidden",
        isDragging && "shadow-lg opacity-90 z-50"
      )}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdate(section.id, { title: e.target.value })}
            placeholder="Section Title"
            className="w-full bg-transparent text-base font-bold focus:outline-none"
          />
        </div>

        <span className="text-xs text-muted-foreground px-2">
          {section.lessons.length} lessons
          {totalDuration > 0 && ` • ${totalDuration} min`}
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-muted rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onRemove(section.id)}
          className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          <FloatingTextarea
            label="Section Description"
            value={section.description}
            onChange={(e) => onUpdate(section.id, { description: e.target.value })}
            rows={2}
          />

          {/* Lessons */}
          <DndContext
            sensors={lessonSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLessonDragEnd}
          >
            <SortableContext
              items={section.lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {section.lessons.map((lesson) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    sectionId={section.id}
                    onUpdate={onUpdateLesson}
                    onRemove={onRemoveLesson}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onAddLesson(section.id)}
            className="w-full h-10 border border-dashed border-border text-muted-foreground hover:text-[#23D2E2] hover:border-[#23D2E2] font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      )}
    </div>
  );
}

export function CurriculumBuilder({ sections, onChange }: CurriculumBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddSection = () => {
    const newSection: CurriculumSection = {
      id: generateId(),
      title: "",
      description: "",
      lessons: [],
    };
    onChange([...sections, newSection]);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<CurriculumSection>) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveSection = (sectionId: string) => {
    onChange(sections.filter((s) => s.id !== sectionId));
  };

  const handleAddLesson = (sectionId: string) => {
    const newLesson: CurriculumLesson = {
      id: generateId(),
      title: "",
      description: "",
      duration_minutes: null,
      content_type: null,
    };
    onChange(
      sections.map((s) =>
        s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
      )
    );
  };

  const handleUpdateLesson = (
    sectionId: string,
    lessonId: string,
    updates: Partial<CurriculumLesson>
  ) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lessonId ? { ...l, ...updates } : l
              ),
            }
          : s
      )
    );
  };

  const handleRemoveLesson = (sectionId: string, lessonId: string) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
          : s
      )
    );
  };

  const handleReorderLessons = (sectionId: string, lessons: CurriculumLesson[]) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, lessons } : s))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(sections, oldIndex, newIndex));
      }
    }
  };

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const totalDuration = sections.reduce(
    (sum, s) =>
      sum + s.lessons.reduce((lSum, l) => lSum + (l.duration_minutes || 0), 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-foreground">Curriculum</label>
        <span className="text-xs text-muted-foreground">
          {sections.length} sections • {totalLessons} lessons
          {totalDuration > 0 && ` • ${totalDuration} min total`}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                onUpdate={handleUpdateSection}
                onRemove={handleRemoveSection}
                onAddLesson={handleAddLesson}
                onUpdateLesson={handleUpdateLesson}
                onRemoveLesson={handleRemoveLesson}
                onReorderLessons={handleReorderLessons}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddSection}
        className="w-full h-12 border-dashed border-2 border-[#23D2E2] text-[#23D2E2] hover:bg-[#23D2E2]/10 font-bold"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
}
