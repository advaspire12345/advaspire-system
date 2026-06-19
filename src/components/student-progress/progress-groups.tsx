"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ProgressLessonRow } from "@/data/student-progress";
import {
  saveLessonUploadLinks,
  uploadLessonImage,
  saveProgressBatch,
} from "@/app/(dashboard)/student-progress/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProgressField =
  | "learnt"
  | "mission1"
  | "mission2"
  | "mission3"
  | "challenge"
  | "homework";

const fieldKey = (studentId: string, coord: string, field: ProgressField) =>
  `${studentId}|${coord}|${field}`;
const remarkKey = (studentId: string, coord: string) => `${studentId}|${coord}`;

/**
 * Shared grouped-progress renderer. Takes a flat `ProgressLessonRow[]`, groups
 * them by course, and renders one course-appropriate table per group with
 * editable checkbox / Remark / Upload cells. Used by both the date/slot view
 * (`ProgressDateTable`) and the "All Progresses" view (`AllProgressView`).
 *
 * Checkbox toggles and remark edits are **batched**: they update local state
 * and are marked dirty, then committed all at once via the "Save Progress"
 * button. Image upload / upload-link saves remain immediate (file actions).
 */
export function ProgressGroups({
  rows,
  canEdit,
  emptyMessage = "No progress to show.",
  toolbarLeft,
  hideStudent = false,
}: {
  rows: ProgressLessonRow[];
  canEdit: boolean;
  emptyMessage?: string;
  toolbarLeft?: React.ReactNode;
  hideStudent?: boolean;
}) {
  // Optimistic checkbox state keyed by `${studentId}|${coord}|${field}`.
  const buildChecks = (data: ProgressLessonRow[]) => {
    const map: Record<string, boolean> = {};
    for (const r of data) {
      map[fieldKey(r.studentId, r.lessonCoordinate, "learnt")] = r.learnt;
      map[fieldKey(r.studentId, r.lessonCoordinate, "mission1")] = r.mission1;
      map[fieldKey(r.studentId, r.lessonCoordinate, "mission2")] = r.mission2;
      map[fieldKey(r.studentId, r.lessonCoordinate, "mission3")] = r.mission3;
      map[fieldKey(r.studentId, r.lessonCoordinate, "challenge")] = r.challenge;
      map[fieldKey(r.studentId, r.lessonCoordinate, "homework")] = r.homework;
    }
    return map;
  };

  // Local remark values keyed by `${studentId}|${coord}`.
  const buildRemarks = (data: ProgressLessonRow[]) => {
    const map: Record<string, string> = {};
    for (const r of data) {
      map[remarkKey(r.studentId, r.lessonCoordinate)] = r.remark ?? "";
    }
    return map;
  };

  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    buildChecks(rows),
  );
  const [remarks, setRemarks] = useState<Record<string, string>>(() =>
    buildRemarks(rows),
  );
  // Dirty tracking: checkbox keys and remark keys with uncommitted changes.
  const [dirtyChecks, setDirtyChecks] = useState<Set<string>>(new Set());
  const [dirtyRemarks, setDirtyRemarks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startTransition] = useTransition();

  // Re-sync local state when the server sends fresh rows, and reset dirty state.
  useEffect(() => {
    setChecks(buildChecks(rows));
    setRemarks(buildRemarks(rows));
    setDirtyChecks(new Set());
    setDirtyRemarks(new Set());
  }, [rows]);

  // Lookup maps so we can resolve a key back to a row (for the save payload).
  const { checkRowByKey, remarkRowByKey } = useMemo(() => {
    const checkRowByKey = new Map<
      string,
      { studentId: string; lessonCoordinate: string; field: ProgressField }
    >();
    const remarkRowByKey = new Map<
      string,
      { studentId: string; lessonCoordinate: string }
    >();
    const FIELDS: ProgressField[] = [
      "learnt",
      "mission1",
      "mission2",
      "mission3",
      "challenge",
      "homework",
    ];
    for (const r of rows) {
      for (const f of FIELDS) {
        checkRowByKey.set(fieldKey(r.studentId, r.lessonCoordinate, f), {
          studentId: r.studentId,
          lessonCoordinate: r.lessonCoordinate,
          field: f,
        });
      }
      remarkRowByKey.set(remarkKey(r.studentId, r.lessonCoordinate), {
        studentId: r.studentId,
        lessonCoordinate: r.lessonCoordinate,
      });
    }
    return { checkRowByKey, remarkRowByKey };
  }, [rows]);

  const groups = useMemo(() => {
    const byCourse = new Map<string, ProgressLessonRow[]>();
    for (const r of rows) {
      const list = byCourse.get(r.courseName);
      if (list) list.push(r);
      else byCourse.set(r.courseName, [r]);
    }
    return [...byCourse.entries()]
      .map(([courseName, courseRows]) => ({
        courseName,
        rows: courseRows,
        isRobotics: courseRows.some((r) => r.isRobotics),
      }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [rows]);

  // ── Toggle a checkbox: local-only update + mark dirty (no server call). ──
  const handleToggle = (row: ProgressLessonRow, field: ProgressField) => {
    if (!canEdit) return;
    const key = fieldKey(row.studentId, row.lessonCoordinate, field);
    setError(null);
    setSaved(false);
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirtyChecks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // ── Edit a remark: local-only update + mark dirty (no save on blur). ──
  const handleRemarkChange = (row: ProgressLessonRow, value: string) => {
    if (!canEdit) return;
    const key = remarkKey(row.studentId, row.lessonCoordinate);
    setError(null);
    setSaved(false);
    setRemarks((prev) => ({ ...prev, [key]: value }));
    setDirtyRemarks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const dirtyCount = dirtyChecks.size + dirtyRemarks.size;
  const hasDirty = dirtyCount > 0;

  const handleSave = () => {
    if (!hasDirty || isSaving) return;
    setError(null);
    setSaved(false);

    const checksPayload = [...dirtyChecks].flatMap((key) => {
      const meta = checkRowByKey.get(key);
      if (!meta) return [];
      return [
        {
          studentId: meta.studentId,
          lessonCoordinate: meta.lessonCoordinate,
          field: meta.field,
          checked: !!checks[key],
        },
      ];
    });
    const remarksPayload = [...dirtyRemarks].flatMap((key) => {
      const meta = remarkRowByKey.get(key);
      if (!meta) return [];
      return [
        {
          studentId: meta.studentId,
          lessonCoordinate: meta.lessonCoordinate,
          note: remarks[key] ?? "",
        },
      ];
    });

    startTransition(async () => {
      const res = await saveProgressBatch({
        checks: checksPayload,
        remarks: remarksPayload,
      });
      if (res.success) {
        setDirtyChecks(new Set());
        setDirtyRemarks(new Set());
        setSaved(true);
      } else {
        setError(res.error ?? "Failed to save progress.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {(toolbarLeft || canEdit) && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 rounded-lg bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">{toolbarLeft}</div>
          {canEdit && (
            <div className="flex items-center gap-3">
              {hasDirty ? (
                <span className="text-sm font-medium text-[#615DFA]">
                  {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
                </span>
              ) : saved ? (
                <span className="text-sm font-medium text-emerald-600">
                  Saved ✓
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasDirty || isSaving}
                className="inline-flex h-[40px] items-center justify-center rounded-lg bg-[#615DFA] px-5 text-sm font-semibold text-white transition hover:bg-[#504bdb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Progress"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-[#fd434f]/10 px-6 py-3 text-sm font-medium text-[#fd434f]">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg bg-white px-6 py-16 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        groups.map((group) => (
          <CourseSection
            key={group.courseName}
            courseName={group.courseName}
            rows={group.rows}
            isRobotics={group.isRobotics}
            canEdit={canEdit}
            checks={checks}
            remarks={remarks}
            hideStudent={hideStudent}
            onToggle={handleToggle}
            onRemarkChange={handleRemarkChange}
            onError={setError}
          />
        ))
      )}
    </div>
  );
}

// ── A single course's section: heading + course-appropriate table ──
function CourseSection({
  courseName,
  rows,
  isRobotics,
  canEdit,
  checks,
  remarks,
  hideStudent,
  onToggle,
  onRemarkChange,
  onError,
}: {
  courseName: string;
  rows: ProgressLessonRow[];
  isRobotics: boolean;
  canEdit: boolean;
  checks: Record<string, boolean>;
  remarks: Record<string, string>;
  hideStudent: boolean;
  onToggle: (row: ProgressLessonRow, field: ProgressField) => void;
  onRemarkChange: (row: ProgressLessonRow, value: string) => void;
  onError: (msg: string | null) => void;
}) {
  // Per-field columns that exist only at md+ (hidden on mobile).
  const fieldCols = isRobotics
    ? ["Learnt", "Mission 1", "Mission 2", "Mission 3", "Upload", "Remark"]
    : ["Learnt", "Mini-Challenge", "Homework"];
  // Leading columns that show at every breakpoint.
  const leadCols = (
    hideStudent ? ["Lesson Title"] : ["Student", "Student ID", "Lesson Title"]
  );
  // Total column count at md+ (lead + per-field). Used for over-spanning empty rows.
  const totalCols = leadCols.length + fieldCols.length + 1;

  return (
    <div className="space-y-2">
      <h2 className="px-1 text-lg font-bold text-foreground">{courseName}</h2>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full border-separate border-spacing-0 bg-white text-sm",
            isRobotics ? "md:min-w-[1100px]" : "md:min-w-[760px]",
          )}
        >
          <thead>
            <tr>
              {leadCols.map((label, idx) => (
                <th
                  key={label}
                  className={cn(
                    "bg-[#f7f8fc] px-4 py-3 text-left text-sm font-bold text-foreground",
                    idx === 0 && "rounded-tl-lg",
                  )}
                >
                  {label}
                </th>
              ))}

              {/* Mobile-only "Update" column (right after Lesson Title). */}
              <th className="rounded-tr-lg bg-[#f7f8fc] px-4 py-3 text-left text-sm font-bold text-foreground md:hidden">
                Update
              </th>

              {/* Per-field columns: md+ only. */}
              {fieldCols.map((label, idx) => (
                <th
                  key={label}
                  className={cn(
                    "hidden bg-[#f7f8fc] px-4 py-3 text-left text-sm font-bold text-foreground md:table-cell",
                    idx === fieldCols.length - 1 && "md:rounded-tr-lg",
                    label !== "Upload" && label !== "Remark" && "text-center",
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No lessons.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.studentId}|${row.lessonCoordinate}`}
                  className="transition hover:bg-[#f0f6ff]"
                >
                  {!hideStudent && (
                    <>
                      <td className="px-4 py-3 font-bold text-[#23d2e2]">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.studentCode ?? "-"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">{row.lessonTitle}</td>

                  {/* Mobile-only Update cell. */}
                  <td className="px-4 py-3 md:hidden">
                    <UpdateCell
                      row={row}
                      isRobotics={isRobotics}
                      canEdit={canEdit}
                      checks={checks}
                      remarks={remarks}
                      onToggle={onToggle}
                      onRemarkChange={onRemarkChange}
                      onError={onError}
                    />
                  </td>

                  {/* Per-field cells: md+ only. */}
                  <CheckCell
                    checked={
                      checks[fieldKey(row.studentId, row.lessonCoordinate, "learnt")]
                    }
                    disabled={!canEdit}
                    onChange={() => onToggle(row, "learnt")}
                  />

                  {isRobotics ? (
                    <>
                      <CheckCell
                        checked={
                          checks[
                            fieldKey(row.studentId, row.lessonCoordinate, "mission1")
                          ]
                        }
                        disabled={!canEdit}
                        onChange={() => onToggle(row, "mission1")}
                      />
                      <CheckCell
                        checked={
                          checks[
                            fieldKey(row.studentId, row.lessonCoordinate, "mission2")
                          ]
                        }
                        disabled={!canEdit}
                        onChange={() => onToggle(row, "mission2")}
                      />
                      <CheckCell
                        checked={
                          checks[
                            fieldKey(row.studentId, row.lessonCoordinate, "mission3")
                          ]
                        }
                        disabled={!canEdit}
                        onChange={() => onToggle(row, "mission3")}
                      />
                      <UploadCell
                        studentId={row.studentId}
                        lessonCoordinate={row.lessonCoordinate}
                        initial={row.upload}
                        canEdit={canEdit}
                        onError={onError}
                      />
                      <RemarkCell
                        value={remarks[remarkKey(row.studentId, row.lessonCoordinate)] ?? ""}
                        canEdit={canEdit}
                        onChange={(v) => onRemarkChange(row, v)}
                      />
                    </>
                  ) : (
                    <>
                      <CheckCell
                        checked={
                          checks[
                            fieldKey(row.studentId, row.lessonCoordinate, "challenge")
                          ]
                        }
                        disabled={!canEdit}
                        onChange={() => onToggle(row, "challenge")}
                      />
                      <CheckCell
                        checked={
                          checks[
                            fieldKey(row.studentId, row.lessonCoordinate, "homework")
                          ]
                        }
                        disabled={!canEdit}
                        onChange={() => onToggle(row, "homework")}
                      />
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Field metadata: labels + the fields that apply per course type ──
const FIELD_LABELS: Record<ProgressField, string> = {
  learnt: "Learnt",
  mission1: "Mission 1",
  mission2: "Mission 2",
  mission3: "Mission 3",
  challenge: "Mini-Challenge",
  homework: "Homework",
};

const checkFieldsFor = (isRobotics: boolean): ProgressField[] =>
  isRobotics
    ? ["learnt", "mission1", "mission2", "mission3"]
    : ["learnt", "challenge", "homework"];

// ── Mobile "Update" cell: button + dialog with the same bound controls. ──
// Checkbox toggles + remark edits call the SAME onToggle / onRemarkChange and
// read from the SAME checks / remarks state as the inline cells, so they feed
// the existing batched "Save Progress" dirty state. Upload stays immediate.
function UpdateCell({
  row,
  isRobotics,
  canEdit,
  checks,
  remarks,
  onToggle,
  onRemarkChange,
  onError,
}: {
  row: ProgressLessonRow;
  isRobotics: boolean;
  canEdit: boolean;
  checks: Record<string, boolean>;
  remarks: Record<string, string>;
  onToggle: (row: ProgressLessonRow, field: ProgressField) => void;
  onRemarkChange: (row: ProgressLessonRow, value: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploadData, setUploadData] = useState<UploadData>(row.upload);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    setUploadData(row.upload);
  }, [row.upload]);

  const fields = checkFieldsFor(isRobotics);
  const remarkValue =
    remarks[remarkKey(row.studentId, row.lessonCoordinate)] ?? "";

  const uploadHasAny = !!(
    uploadData?.imagePath ||
    uploadData?.videoUrl ||
    uploadData?.projectUrl
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-muted-foreground/30 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-[#f0f6ff]"
      >
        Update
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update — {row.lessonCoordinate}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              {row.lessonTitle}
            </p>

            {/* Checkboxes — bound to shared checks/onToggle. */}
            <div className="space-y-2">
              {fields.map((field) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[#615DFA] disabled:cursor-not-allowed disabled:opacity-50"
                    checked={
                      !!checks[
                        fieldKey(row.studentId, row.lessonCoordinate, field)
                      ]
                    }
                    disabled={!canEdit}
                    onChange={() => onToggle(row, field)}
                  />
                  {FIELD_LABELS[field]}
                </label>
              ))}
            </div>

            {/* Upload — immediate save (reuses UploadDialog). */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">
                Upload
              </label>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-muted-foreground/30 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-[#f0f6ff]"
                >
                  {uploadHasAny ? "Edit upload" : "Add upload"}
                </button>
              ) : uploadHasAny ? (
                <div className="flex items-center gap-2">
                  {uploadData?.imagePath && (
                    <a
                      href={uploadData.imagePath}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadData.imagePath}
                        alt="Upload preview"
                        className="h-10 w-10 rounded-md border border-muted-foreground/20 object-cover"
                      />
                    </a>
                  )}
                  {uploadData?.videoUrl && (
                    <a
                      href={uploadData.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#615DFA] underline"
                    >
                      Video
                    </a>
                  )}
                  {uploadData?.projectUrl && (
                    <a
                      href={uploadData.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#615DFA] underline"
                    >
                      Project
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>

            {/* Remark — bound to shared remarks/onRemarkChange. */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">
                Remark
              </label>
              <input
                type="text"
                value={remarkValue}
                disabled={!canEdit}
                placeholder={canEdit ? "Add remark..." : ""}
                onChange={(e) => onRemarkChange(row, e.target.value)}
                className="w-full rounded-md border border-muted-foreground/30 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-70"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          studentId={row.studentId}
          lessonCoordinate={row.lessonCoordinate}
          data={uploadData}
          onSaved={(next) => setUploadData(next)}
          onError={onError}
        />
      )}
    </>
  );
}

function CheckCell({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <td className="hidden px-4 py-3 text-center md:table-cell">
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-[#615DFA] disabled:cursor-not-allowed disabled:opacity-50"
        checked={!!checked}
        disabled={disabled}
        onChange={onChange}
      />
    </td>
  );
}

type UploadData = ProgressLessonRow["upload"];

// ── Upload cell: action button that opens a 3-input upload dialog ──
function UploadCell({
  studentId,
  lessonCoordinate,
  initial,
  canEdit,
  onError,
}: {
  studentId: string;
  lessonCoordinate: string;
  initial: UploadData;
  canEdit: boolean;
  onError: (msg: string | null) => void;
}) {
  const [data, setData] = useState<UploadData>(initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const imagePath = data?.imagePath ?? null;
  const videoUrl = data?.videoUrl ?? null;
  const projectUrl = data?.projectUrl ?? null;
  const hasAny = !!(imagePath || videoUrl || projectUrl);

  // Small indicator: thumbnail if there's an image, else a "set" chip, else nothing.
  const indicator = imagePath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagePath}
      alt="Upload preview"
      className="h-8 w-8 rounded-md border border-muted-foreground/20 object-cover"
    />
  ) : hasAny ? (
    <span className="text-xs font-medium text-[#615DFA]">📎 set</span>
  ) : null;

  // Read-only view (no edit permission): show links / thumbnail, no button.
  if (!canEdit) {
    if (!hasAny)
      return (
        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
          -
        </td>
      );
    return (
      <td className="hidden px-4 py-3 md:table-cell">
        <div className="flex items-center gap-2">
          {imagePath && (
            <a href={imagePath} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePath}
                alt="Upload preview"
                className="h-10 w-10 rounded-md border border-muted-foreground/20 object-cover"
              />
            </a>
          )}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#615DFA] underline"
            >
              Video
            </a>
          )}
          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#615DFA] underline"
            >
              Project
            </a>
          )}
        </div>
      </td>
    );
  }

  return (
    <td className="hidden px-4 py-3 md:table-cell">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-muted-foreground/30 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-[#f0f6ff]"
      >
        {indicator}
        {hasAny ? "Edit" : "Upload"}
      </button>
      <UploadDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        lessonCoordinate={lessonCoordinate}
        data={data}
        onSaved={(next) => setData(next)}
        onError={onError}
      />
    </td>
  );
}

// ── Upload dialog: image file + video URL + project URL, immediate save ──
function UploadDialog({
  open,
  onOpenChange,
  studentId,
  lessonCoordinate,
  data,
  onSaved,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  lessonCoordinate: string;
  data: UploadData;
  onSaved: (next: UploadData) => void;
  onError: (msg: string | null) => void;
}) {
  const [videoUrl, setVideoUrl] = useState(data?.videoUrl ?? "");
  const [projectUrl, setProjectUrl] = useState(data?.projectUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed the form fields whenever the dialog opens (or the source changes).
  useEffect(() => {
    if (open) {
      setVideoUrl(data?.videoUrl ?? "");
      setProjectUrl(data?.projectUrl ?? "");
      setDialogError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, data]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setDialogError(null);
    onError(null);
    try {
      let imagePath = data?.imagePath ?? null;
      const file = fileInputRef.current?.files?.[0];
      if (file && file.size > 0) {
        const formData = new FormData();
        formData.append("studentId", studentId);
        formData.append("lessonCoordinate", lessonCoordinate);
        formData.append("file", file);
        const up = await uploadLessonImage(formData);
        if (!up.success || !up.url) {
          setDialogError(up.error ?? "Failed to upload image.");
          return;
        }
        imagePath = up.url;
      }

      const res = await saveLessonUploadLinks(
        studentId,
        lessonCoordinate,
        projectUrl.trim(),
        videoUrl.trim(),
      );
      if (!res.success) {
        setDialogError(res.error ?? "Failed to save upload links.");
        return;
      }

      onSaved({
        imagePath,
        videoUrl: videoUrl.trim() || null,
        projectUrl: projectUrl.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lesson upload — {lessonCoordinate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              Image
            </label>
            {data?.imagePath && (
              <a href={data.imagePath} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.imagePath}
                  alt="Current upload"
                  className="mb-2 h-20 w-20 rounded-md border border-muted-foreground/20 object-cover"
                />
              </a>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              Video URL
            </label>
            <input
              type="url"
              value={videoUrl}
              placeholder="https://..."
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-md border border-muted-foreground/30 px-3 py-2 text-sm"
            />
          </div>

          {/* Project URL */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              Project URL
            </label>
            <input
              type="url"
              value={projectUrl}
              placeholder="https://..."
              onChange={(e) => setProjectUrl(e.target.value)}
              className="w-full rounded-md border border-muted-foreground/30 px-3 py-2 text-sm"
            />
          </div>

          {dialogError && (
            <div className="rounded-lg bg-[#fd434f]/10 px-4 py-2 text-sm font-medium text-[#fd434f]">
              {dialogError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-[40px] items-center justify-center rounded-lg border border-muted-foreground/30 px-5 text-sm font-semibold text-foreground transition hover:bg-[#f0f6ff]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-[40px] items-center justify-center rounded-lg bg-[#615DFA] px-5 text-sm font-semibold text-white transition hover:bg-[#504bdb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Remark cell: inline text input. Edits update local state (deferred save). ──
function RemarkCell({
  value,
  canEdit,
  onChange,
}: {
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <td className="hidden px-4 py-3 md:table-cell">
      <input
        type="text"
        value={value}
        disabled={!canEdit}
        placeholder={canEdit ? "Add remark..." : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 rounded-md border border-muted-foreground/30 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-70"
      />
    </td>
  );
}
