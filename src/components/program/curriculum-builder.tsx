"use client";

import { useState } from "react";
import { Plus, Minus, X, GripVertical, ChevronDown, ChevronUp, Image, Link } from "lucide-react";
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

export interface MissionItem {
  id: string;
  level: number | null;
  url_mission: string | null;
  url_answer: string | null;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  thumbnail_url: string | null;
  url: string | null;
  missions: MissionItem[];
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

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface MissionFieldListProps {
  missions: MissionItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<MissionItem>) => void;
  onRemove: (id: string) => void;
}

function MissionFieldList({ missions, onAdd, onUpdate, onRemove }: MissionFieldListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground">Missions</label>
        <span className="text-xs text-muted-foreground">{missions.length} mission(s)</span>
      </div>
      {missions.map((mission, index) => (
        <div key={mission.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <FloatingSelect
              label="Level"
              value={mission.level?.toString() || ""}
              onChange={(val) => onUpdate(mission.id, { level: val ? parseInt(val) : null })}
              options={Array.from({ length: 20 }, (_, i) => ({
                value: (i + 1).toString(),
                label: `Level ${i + 1}`,
              }))}
            />
            <FloatingInput
              label="Mission URL"
              value={mission.url_mission || ""}
              onChange={(e) => onUpdate(mission.id, { url_mission: e.target.value || null })}
            />
            <FloatingInput
              label="Answer URL"
              value={mission.url_answer || ""}
              onChange={(e) => onUpdate(mission.id, { url_answer: e.target.value || null })}
            />
          </div>
          {index === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="p-1 rounded-full border-2 border-[#23D2E2] transition-all duration-200 flex items-center justify-center hover:bg-[#23D2E2]/10 hover:shadow-md flex-shrink-0"
              title="Add mission"
            >
              <Plus size={12} className="text-[#23D2E2]" strokeWidth={5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRemove(mission.id)}
              className="p-1 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center flex-shrink-0"
              title="Remove mission"
            >
              <Minus size={12} className="text-[#fd434f]" strokeWidth={5} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
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
          {lesson.thumbnail_url && (
            <span className="text-muted-foreground">
              <Image className="h-4 w-4" />
            </span>
          )}
          <span className="text-sm font-medium truncate">
            {lesson.title || "Untitled Lesson"}
          </span>
          {lesson.url && (
            <span className="text-muted-foreground">
              <Link className="h-3 w-3" />
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
            <FloatingInput
              label="Thumbnail URL"
              value={lesson.thumbnail_url || ""}
              onChange={(e) => onUpdate(sectionId, lesson.id, { thumbnail_url: e.target.value || null })}
            />
            <FloatingInput
              label="Lesson URL"
              value={lesson.url || ""}
              onChange={(e) => onUpdate(sectionId, lesson.id, { url: e.target.value || null })}
            />
          </div>
          <MissionFieldList
            missions={lesson.missions}
            onAdd={() => {
              const newMission: MissionItem = {
                id: generateId(),
                level: null,
                url_mission: null,
                url_answer: null,
              };
              onUpdate(sectionId, lesson.id, { missions: [...lesson.missions, newMission] });
            }}
            onUpdate={(missionId, updates) => {
              onUpdate(sectionId, lesson.id, {
                missions: lesson.missions.map((m) =>
                  m.id === missionId ? { ...m, ...updates } : m
                ),
              });
            }}
            onRemove={(missionId) => {
              if (lesson.missions.length > 1) {
                onUpdate(sectionId, lesson.id, {
                  missions: lesson.missions.filter((m) => m.id !== missionId),
                });
              }
            }}
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
      thumbnail_url: null,
      url: null,
      missions: [{
        id: generateId(),
        level: null,
        url_mission: null,
        url_answer: null,
      }],
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-foreground">Curriculum</label>
        <span className="text-xs text-muted-foreground">
          {sections.length} sections • {totalLessons} lessons
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
