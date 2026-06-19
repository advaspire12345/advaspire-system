"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ProgressLessonRow,
  ProgressStudentHit,
} from "@/data/student-progress";
import { ProgressGroups } from "@/components/student-progress/progress-groups";

interface AllProgressViewProps {
  students: ProgressStudentHit[];
  selected: { student: ProgressStudentHit; rows: ProgressLessonRow[] } | null;
  q: string;
  canEdit: boolean;
}

export function AllProgressView({
  students,
  selected,
  q,
  canEdit,
}: AllProgressViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [learntOnly, setLearntOnly] = useState(false);
  const [course, setCourse] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const OTHER_LEVEL = "__other__";
  const levelValue = (r: ProgressLessonRow) =>
    r.level == null ? OTHER_LEVEL : String(r.level);

  // Distinct course names (in row order), for the course tabs.
  const courses = useMemo(() => {
    if (!selected) return [] as string[];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const r of selected.rows) {
      if (!seen.has(r.courseName)) {
        seen.add(r.courseName);
        list.push(r.courseName);
      }
    }
    return list;
  }, [selected]);

  // The active course (default: first available).
  const activeCourse = course && courses.includes(course) ? course : courses[0] ?? null;

  // Rows for the active course.
  const courseRows = useMemo(() => {
    if (!selected || !activeCourse) return [] as ProgressLessonRow[];
    return selected.rows.filter((r) => r.courseName === activeCourse);
  }, [selected, activeCourse]);

  // Distinct levels for the active course, ascending; null grouped as "Other".
  const levels = useMemo(() => {
    const set = new Set<string>();
    let hasOther = false;
    for (const r of courseRows) {
      if (r.level == null) hasOther = true;
      else set.add(String(r.level));
    }
    const numeric = [...set].sort((a, b) => Number(a) - Number(b));
    return hasOther ? [...numeric, OTHER_LEVEL] : numeric;
  }, [courseRows]);

  // The active level (default: first available for this course).
  const activeLevel = level && levels.includes(level) ? level : levels[0] ?? null;

  // Reset the level selection when the active course changes.
  useEffect(() => {
    setLevel(null);
  }, [activeCourse]);

  const levelLabel = (v: string) => (v === OTHER_LEVEL ? "Other" : `Level ${v}`);

  // Filter to active course + level, then apply the "learnt only" toggle on top.
  const visibleRows = useMemo(() => {
    if (!selected || !activeCourse) return [];
    let list = courseRows;
    if (activeLevel) list = list.filter((r) => levelValue(r) === activeLevel);
    if (learntOnly) list = list.filter((r) => r.learnt === true);
    return list;
  }, [selected, activeCourse, activeLevel, courseRows, learntOnly]);

  // Keep the input in sync if the URL `q` changes externally.
  useEffect(() => {
    setSearch(q);
  }, [q]);

  const pushQuery = (next: string) => {
    const params = new URLSearchParams();
    if (next) params.set("q", next);
    // Changing the search resets the selected student.
    startTransition(() => {
      const qs = params.toString();
      router.replace(`/student-progress/all${qs ? `?${qs}` : ""}`);
    });
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQuery(value), 300);
  };

  const selectStudent = (id: string) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("student", id);
    startTransition(() => {
      router.replace(`/student-progress/all?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/student-progress"
          className="text-sm font-medium text-[#615DFA] underline"
        >
          ← Back to daily view
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Search + results list ── */}
        <Card className="h-fit">
          <CardContent className="space-y-4 p-4">
            <input
              type="text"
              value={search}
              placeholder="Search by name or student ID…"
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  pushQuery(search);
                }
              }}
              className="h-[44px] w-full rounded-lg border border-muted-foreground/30 bg-white px-4 text-sm"
              aria-label="Search students"
            />

            {students.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                No students found
              </p>
            ) : (
              <ul className="max-h-[300px] space-y-1 overflow-y-auto">
                {students.map((s) => {
                  const active = selected?.student.id === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => selectStudent(s.id)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#f0f6ff]",
                          active && "bg-[#f0f6ff] ring-1 ring-[#615DFA]/40",
                        )}
                      >
                        <span className="block text-sm font-semibold text-foreground">
                          {s.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {s.studentCode ?? "-"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Selected student's full progress ── */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 rounded-lg bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selected.student.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.student.studentCode ?? "-"}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[#615DFA]"
                    checked={learntOnly}
                    onChange={(e) => setLearntOnly(e.target.checked)}
                  />
                  Show learnt only
                </label>
              </div>

              {/* Course tabs */}
              {courses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {courses.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourse(c)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                        c === activeCourse
                          ? "bg-[#615DFA] text-white"
                          : "bg-white text-muted-foreground hover:bg-[#f0f6ff]",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Level tabs (for the active course) */}
              {levels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        l === activeLevel
                          ? "bg-[#615DFA] text-white"
                          : "bg-white text-muted-foreground hover:bg-[#f0f6ff]",
                      )}
                    >
                      {levelLabel(l)}
                    </button>
                  ))}
                </div>
              )}

              <ProgressGroups
                rows={visibleRows}
                canEdit={canEdit}
                hideStudent
                emptyMessage="No lessons found for this student's enrolled courses."
              />
            </>
          ) : (
            <div className="rounded-lg bg-white px-6 py-16 text-center text-muted-foreground">
              Select a student to see all their progress.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
