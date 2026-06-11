"use client";

import { useState, useCallback } from "react";
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface BranchOption {
  name: string;
  code: string | null;
}
interface PackageOption {
  package_type: string;
  duration: number;
  price: number;
}
interface ProgramPackages {
  program: string;
  packages: PackageOption[];
}
interface SlotOption {
  day: string;
  time: string;
  limit_student: number;
  /** Branch name shown next to the slot row when the importer can see more
   *  than one branch (group_admin / super_admin). NULL for company_admin and
   *  other single-branch users — the branch label would be redundant noise. */
  branch?: string | null;
}
interface ProgramSlots {
  program: string;
  slots: SlotOption[];
}
interface InstructorOption {
  name: string;
  email: string;
  /** Branch label shown when the importer sees more than one branch
   *  (group_admin / super_admin). NULL for single-branch users — the label
   *  would be redundant noise in that case. */
  branch?: string | null;
}

interface ImportPageProps {
  canImport?: boolean;
  branchOptions?: BranchOption[];
  programOptions?: string[];
  programPackages?: ProgramPackages[];
  programSlots?: ProgramSlots[];
  instructorOptions?: InstructorOption[];
  /** When true (company_admin / single-branch importer), the Students CSV
   *  drops the `branch_name` column — the server fills in the importer's own
   *  branch automatically. group_admin / super_admin keep the column so they
   *  can target a specific branch per row. */
  hideStudentBranchColumn?: boolean;
}

type ImportType = "students" | "attendance" | "payments" | "transactions" | "trials" | "examinations";

interface ImportSection {
  id: ImportType;
  title: string;
  description: string;
  templateColumns: string[];
  /** Sample data rows shipped with the template. Auto-skipped server-side by
   *  the EXAMPLE marker prefix on each row's id field — the user can delete
   *  them or leave them. Multiple rows can demo different features (e.g. one
   *  individual + one sibling auto-pooled for the Students template). */
  exampleRows?: string[][];
}

const STUDENT_COLUMNS = [
  "student_id",
  "student_name", "date_of_birth", "gender", "school_name",
  "parent_name", "parent_email", "parent_phone", "parent_address", "parent_city",
  "branch_name",
  "program_name", "package_type", "package_duration",
  "schedule_day", "schedule_time",
  "enrollment_status", "sessions_remaining",
  "level",
];

// Example rows shipped with each template. They're a live format hint right
// at the top of the file. Any row whose first-id field starts with "EXAMPLE"
// is auto-skipped server-side — so the uploader can either delete them before
// uploading or leave them in place; the system ignores them either way.
//
// The Students template ships with FOUR sample rows covering the most
// common patterns:
//   1) New student, individual enrollment
//   2) Sibling of (1) — same parent_email + same program_name → auto-pools
//      with row 1 (no flag needed)
//   3) Same student as (1), enrolled in a SECOND program (different program
//      → new enrollment under same student, stays individual)
//   4) Same student as (1), SAME program but a SECOND weekly slot — note
//      sessions_remaining is 0 because slot A (row 1) already counted those
//      sessions; the system would otherwise double-count
const STUDENT_EXAMPLE_ROWS = [
  [
    "",  // student_id — leave blank for new students; system generates the ID
    "EXAMPLE 1 — new student, individual (delete or leave)",
    "2018-03-15",
    "male",
    "SK Taman Hijau",
    "Aiman Tan",
    "aiman.parent@example.com",
    "0123456789",
    "12 Jalan Hijau",
    "Semenyih",
    "Advaspire Robotics & Coding Academy Semenyih",
    "Junior Robotics",
    "session",
    "12",
    "tuesday",
    "14:00",
    "active",
    "8",
    "1",  // level — current course level (1 = beginner; blank treated as 1)
  ],
  [
    "",  // student_id — same convention; existing IDs look like ADV-001-25004
    "EXAMPLE 2 — sibling of EXAMPLE 1, auto-pooled (delete or leave)",
    "2020-06-22",
    "female",
    "SK Taman Hijau",
    "Aiman Tan",
    "aiman.parent@example.com",  // SAME parent_email as row 1 = same parent
    "0123456789",
    "12 Jalan Hijau",
    "Semenyih",
    "Advaspire Robotics & Coding Academy Semenyih",
    "Junior Robotics",  // SAME program as row 1 — auto-pools with row 1
    "session",
    "12",
    "tuesday",
    "14:00",
    "active",
    "0",
    "1",  // level
  ],
  [
    "",  // student_id — blank again; the student will be matched by name + parent
    "EXAMPLE 1 — new student, individual (delete or leave)",  // SAME name as row 1
    "2018-03-15",
    "male",
    "SK Taman Hijau",
    "Aiman Tan",
    "aiman.parent@example.com",  // SAME parent — matches the student in row 1
    "0123456789",
    "12 Jalan Hijau",
    "Semenyih",
    "Advaspire Robotics & Coding Academy Semenyih",
    "Senior Robotics",  // DIFFERENT program → adds a second enrollment to EXAMPLE 1
    "monthly",
    "1",
    "thursday",
    "16:00",
    "active",
    "4",
    "3",  // level — same student may be at a different level in a different program
  ],
  [
    "",  // student_id — blank; matches existing EXAMPLE 1 student by name+parent
    "EXAMPLE 1 — new student, individual (delete or leave)",  // SAME name as row 1
    "2018-03-15",
    "male",
    "SK Taman Hijau",
    "Aiman Tan",
    "aiman.parent@example.com",  // SAME parent
    "0123456789",
    "12 Jalan Hijau",
    "Semenyih",
    "Advaspire Robotics & Coding Academy Semenyih",
    "Junior Robotics",  // SAME program as row 1 — this is a SECOND weekly slot, not a new program
    "session",
    "12",
    "wednesday",  // DIFFERENT day from row 1 (tuesday)
    "10:00",      // (or different time same day, etc)
    "active",
    "0",          // sessions_remaining=0 because row 1 already counted this student's Junior Robotics sessions; non-zero here would double-count
    "1",          // level — same value as row 1 for this program
  ],
];

const ATTENDANCE_EXAMPLE_ROWS = [[
  "EXAMPLE-AUTO-SKIPPED",
  "2026-04-22",
  "14:00",
  "present",
  "Physical",
  "Jane Doe",
  "Lesson 4 - Sensors",
  "Build a line follower",
  // lesson_2 / mission_2 — used when the student finished a second activity
  // in the same session. Leave blank for single-activity rows.
  "",
  "",
  // lesson_3 / mission_3 — same idea for a third activity. Blank = none.
  "",
  "",
  "Built and tested a line-following robot",
  "10",
  "",
]];

const PAYMENTS_EXAMPLE_ROWS = [[
  "EXAMPLE-AUTO-SKIPPED",
  "450.00",
  "paid",
  "bank_transfer",
  "2026-04-01",
  "Junior Robotics",
  "session",
  "12",
  "288",
  "Q2 payment",
]];

const TRANSACTIONS_EXAMPLE_ROWS = [[
  "EXAMPLE-instructor@example.com",
  "user",
  "EXAMPLE-ADV-001-25001",
  "student",
  "5",
  "transfer",
  "2026-04-22",
  "Bonus adcoin for great attendance",
]];

const TRIALS_EXAMPLE_ROWS = [[
  "EXAMPLE Child",
  "8",
  "Jane Tan",
  "0123456789",
  "jane.tan@example.com",
  "Advaspire Robotics & Coding Academy Semenyih",
  "Junior Robotics",
  "walk_in",
  "2026-05-30",
  "10:00",
  "pending",
  "Interested after seeing FB ad",
]];

const EXAMINATIONS_EXAMPLE_ROWS = [
  // 1) First attempt — FAILED. No certificate number (only awarded on pass).
  [
    "EXAMPLE-ADV-001-25001",
    "Junior Robotics Level 1",
    "1",
    "2026-03-10",
    "fail",
    "42",
    "0",
    "instructor@example.com",
    "",
    "Missed timing on the line follower section",
  ],
  // 2) Reattempt — also FAILED. reattempt_count incremented. Still no cert.
  [
    "EXAMPLE-ADV-001-25001",
    "Junior Robotics Level 1",
    "1",
    "2026-03-24",
    "fail",
    "58",
    "1",
    "instructor@example.com",
    "",
    "Better, but mission 3 still incomplete",
  ],
  // 3) Reattempt — PASSED. reattempt_count further incremented. Cert assigned.
  [
    "EXAMPLE-ADV-001-25001",
    "Junior Robotics Level 1",
    "1",
    "2026-04-15",
    "pass",
    "85",
    "2",
    "instructor@example.com",
    "CERT-2026-001",
    "Cleared all missions within the time limit",
  ],
];

const SECTIONS: ImportSection[] = [
  {
    id: "students",
    title: "Students & Parents",
    description:
      "Import students with parent info and enrollment — works for new sign-ups AND migrating existing rosters with their original IDs. student_id can be blank (system auto-generates) OR your own value (used as-is — useful when bringing students over from a previous system). `level` is the student's current course level (integer, blank defaults to 1) — also stamped on the new enrollment so the level shown in /attendance and /examinations reflects the import. The first four rows are samples (individual, auto-pooled sibling, multi-program, multi-slot-same-program); they're auto-skipped because student_name starts with \"EXAMPLE\". Siblings auto-pool — any two rows with the same parent_email + program_name are joined into a shared pool automatically (no flag needed). One student can have multiple rows (same student_name + parent_email) to create additional enrollments — different program, day, or time. For multi-slot rows of the SAME program, put sessions_remaining on the FIRST row only; subsequent rows should be 0 (slot is added but sessions already counted).",
    templateColumns: STUDENT_COLUMNS,
    exampleRows: STUDENT_EXAMPLE_ROWS,
  },
  {
    id: "attendance",
    title: "Attendance History",
    description:
      "Import attendance records. Students must exist first (use student_id from the Students import). `time` = actual start time (HH:MM 24-hour). `activity` = what was completed in class (shown as \"Activity Completed\" in the mark-attendance modal). The three (lesson, mission) pairs let you record up to 3 activities completed in one session — fill only `lesson` + `mission` for the common one-activity case and leave `lesson_2`/`mission_2`/`lesson_3`/`mission_3` blank. If you fill a numbered pair, both halves must be filled together. `absence_reason` is only used when status=absent/excused — it surfaces in the attendance log under that absent entry; leave blank for present/late rows. The first row is a sample — delete it OR leave it, the system auto-skips rows whose student_id starts with \"EXAMPLE\".",
    templateColumns: [
      "student_id", "date", "time", "status", "class_type", "instructor_name",
      "lesson", "mission",
      "lesson_2", "mission_2",
      "lesson_3", "mission_3",
      "activity", "adcoin", "absence_reason",
    ],
    exampleRows: ATTENDANCE_EXAMPLE_ROWS,
  },
  {
    id: "payments",
    title: "Payment Records",
    description:
      "Import payment records. Students must exist first. `package_type` (session/monthly) + `package_duration` (number) together identify which package the payment is for; they must match an existing course_pricing row for the chosen program. `receipt_seq` is the 1–9999 number from your old system — the LMS builds the full receipt number (s-<branch>-E-<YY><seq>) and invoice number (adv-<branch>-e-<YY><seq>) from it, with the year derived from paid_at and the branch token derived from the student's branch code. The first row is a sample — delete it OR leave it, the system auto-skips rows whose student_id starts with \"EXAMPLE\".",
    templateColumns: [
      "student_id", "amount", "status", "payment_method", "paid_at",
      "program_name", "package_type", "package_duration", "receipt_seq", "notes",
    ],
    exampleRows: PAYMENTS_EXAMPLE_ROWS,
  },
  {
    id: "transactions",
    title: "Adcoin Transactions",
    description:
      "Import adcoin transactions. Use student_id (e.g. ADV-001-25001) for students or email for team members. `date` is the transaction date (YYYY-MM-DD or any standard format); blank = today. The sender must have ENOUGH adcoin balance for each transfer/spent row — if a sender's balance hits zero before the file finishes, subsequent rows for that sender are rejected with \"Insufficient adcoin\". Importing requires your password to approve. The first row is a sample — delete it OR leave it, rows whose sender_id or receiver_id starts with \"EXAMPLE\" are auto-skipped.",
    templateColumns: [
      "sender_id", "sender_type", "receiver_id", "receiver_type",
      "amount", "type", "date", "description",
    ],
    exampleRows: TRANSACTIONS_EXAMPLE_ROWS,
  },
  {
    id: "trials",
    title: "Trial Bookings",
    description:
      "Import trial-class bookings. `source` is how the family found you (walk_in / phone / online / referral / social_media / website / facebook / google / tiktok / xhs / youtube / instagram / other). `status` defaults to pending — valid values: pending / confirmed / completed / cancelled / no_show / converted. `branch_name` is the branch hosting the trial (defaults to your account's branch if blank). `program_name` is optional. The first row is a sample — auto-skipped (child_name starts with \"EXAMPLE\").",
    templateColumns: [
      "child_name", "child_age", "parent_name", "parent_phone", "parent_email",
      "branch_name", "program_name", "source",
      "scheduled_date", "scheduled_time", "status", "message",
    ],
    exampleRows: TRIALS_EXAMPLE_ROWS,
  },
  {
    id: "examinations",
    title: "Examinations",
    description:
      "Import examination records (typically migration history — past exam attempts and certifications). `student_id` matches an existing student. `status` is the outcome: eligible / scheduled / in_progress / pass / fail / absent. `mark` and `reattempt_count` are optional (reattempt defaults to 0). `examiner_email` is optional — looks up the instructor by email. `certificate_number` is the cert ID issued for THIS exam — only allowed when status=pass, must be unique (server checks both the existing table AND other rows in the upload, case-insensitive). The first three rows are samples showing a fail → reattempt → pass arc; all auto-skipped because student_id starts with \"EXAMPLE\".",
    templateColumns: [
      "student_id", "exam_name", "exam_level", "exam_date", "status",
      "mark", "reattempt_count", "examiner_email", "certificate_number", "notes",
    ],
    exampleRows: EXAMINATIONS_EXAMPLE_ROWS,
  },
];

interface ImportResult {
  success: number;
  failed: number;
  skipped?: number;
  errors: string[];
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ImportPage({
  canImport,
  branchOptions = [],
  programOptions = [],
  programPackages = [],
  programSlots = [],
  instructorOptions = [],
  hideStudentBranchColumn = false,
}: ImportPageProps) {
  const [activeSection, setActiveSection] = useState<ImportType | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // For single-branch importers, strip the branch_name column from the
  // Students template + example rows. The server will fall back to the
  // importer's own branch.
  const branchColIndex = STUDENT_COLUMNS.indexOf("branch_name");
  const sections = hideStudentBranchColumn
    ? SECTIONS.map((s) =>
        s.id !== "students" || branchColIndex < 0
          ? s
          : {
              ...s,
              templateColumns: s.templateColumns.filter((c) => c !== "branch_name"),
              exampleRows: (s.exampleRows ?? []).map((r) =>
                r.filter((_, i) => i !== branchColIndex),
              ),
            },
      )
    : SECTIONS;

  const downloadTemplateCsv = (section: ImportSection) => {
    const lines = [section.templateColumns.map(csvEscape).join(",")];
    for (const row of section.exampleRows ?? []) {
      lines.push(row.map(csvEscape).join(","));
    }
    const csv = lines.join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${section.id}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateXlsx = async (section: ImportSection) => {
    // Lazy import — keeps exceljs out of the main bundle.
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(section.id);
    ws.addRow(section.templateColumns);
    for (const row of section.exampleRows ?? []) {
      ws.addRow(row);
    }
    // All cells stored as text — preserves leading zeros in phones / IC numbers
    // and prevents Excel from auto-converting "1/8/2016" to a date.
    ws.eachRow((row) => row.eachCell((cell) => { cell.numFmt = "@"; }));
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${section.id}_template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, sectionId: ImportType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setActiveSection(sectionId);
    setResult(null);

    const ext = file.name.toLowerCase().split(".").pop() ?? "";

    if (ext === "xlsx" || ext === "xls") {
      // Parse XLSX via lazy-loaded exceljs.
      //
      // Real-world XLSX files are messy:
      //   - Numbers / Excel may insert a merged title row (e.g. the filename)
      //     above the actual headers — so we auto-detect the header row by
      //     scanning the first few rows for an expected column name.
      //   - Cells can hold rich text, hyperlinks (with nested richText), formula
      //     results, or dates — we normalise all of these to a plain string.
      //
      // Expected first column for each import section — used to find the
      // header row. We just look for this string somewhere in the row.
      const expectedFirstCol: Record<string, string> = {
        students: "student_name",
        attendance: "student_id",
        payments: "student_id",
        transactions: "sender_id",
      };
      const needle = expectedFirstCol[sectionId];

      // `kind` hints how a Date value should be formatted. Excel/Numbers may
      // store "18:30" as a Date (epoch + 18.5h) — we need HH:MM there, not
      // YYYY-MM-DD. For "date" columns we want YYYY-MM-DD. Default is "date".
      //
      // Use UTC methods: Excel stores both dates and time-of-day as fractions
      // since 1900 epoch, and exceljs converts to a UTC Date. Reading via
      // local getHours()/getDate() shifts the value by the user's timezone
      // offset — wrong in both directions.
      const extractText = (v: unknown, kind: "date" | "time" = "date"): string => {
        if (v == null) return "";
        if (v instanceof Date) {
          if (kind === "time") {
            const h = String(v.getUTCHours()).padStart(2, "0");
            const m = String(v.getUTCMinutes()).padStart(2, "0");
            return `${h}:${m}`;
          }
          const y = v.getUTCFullYear();
          const mo = String(v.getUTCMonth() + 1).padStart(2, "0");
          const d = String(v.getUTCDate()).padStart(2, "0");
          return `${y}-${mo}-${d}`;
        }
        if (typeof v !== "object") return String(v);
        // Hyperlink: { hyperlink, text: <string|richText> } — recurse into .text
        // Rich text: { richText: [{ text }, ...] }
        // Formula: { formula, result } — use result
        // Bare object with text: { text } — use text
        const obj = v as Record<string, unknown>;
        if ("richText" in obj && Array.isArray(obj.richText)) {
          return (obj.richText as { text?: string }[]).map((r) => r.text ?? "").join("");
        }
        if ("text" in obj) return extractText(obj.text, kind);
        if ("result" in obj) return extractText(obj.result, kind);
        if ("value" in obj) return extractText(obj.value, kind);
        return "";
      };

      // Decide formatting hint from header name. Columns with "time" but not
      // "date" → HH:MM. Everything else → date or plain string.
      const kindFor = (header: string): "date" | "time" => {
        const h = header.toLowerCase();
        if (h.includes("time") && !h.includes("date")) return "time";
        return "date";
      };

      (async () => {
        try {
          const ExcelJS = (await import("exceljs")).default;
          const wb = new ExcelJS.Workbook();
          const buffer = await file.arrayBuffer();
          await wb.xlsx.load(buffer);
          const ws = wb.worksheets[0];
          if (!ws) { setParsedData([]); return; }

          // Find the header row — scan first 10 rows for one that contains the
          // expected first-column name. Default to row 1 if not found.
          let headerRowNum = 1;
          if (needle) {
            const scanLimit = Math.min(10, ws.actualRowCount || ws.rowCount || 1);
            for (let r = 1; r <= scanLimit; r++) {
              const row = ws.getRow(r);
              let found = false;
              const maxC = row.cellCount || row.actualCellCount || 0;
              for (let c = 1; c <= maxC; c++) {
                if (extractText(row.getCell(c).value).trim().toLowerCase() === needle) {
                  found = true;
                  break;
                }
              }
              if (found) { headerRowNum = r; break; }
            }
          }

          const headerRow = ws.getRow(headerRowNum);
          const colCount = headerRow.cellCount || headerRow.actualCellCount || 0;
          if (colCount === 0) {
            setParsedData([]);
            return;
          }

          // Build header list by walking columns 1..colCount.
          const headers: string[] = [];
          for (let c = 1; c <= colCount; c++) {
            headers.push(extractText(headerRow.getCell(c).value).trim());
          }

          // Walk data rows below the detected header.
          const dataRows: Record<string, string>[] = [];
          const lastRow = ws.actualRowCount || ws.rowCount || 1;
          for (let r = headerRowNum + 1; r <= lastRow; r++) {
            const row = ws.getRow(r);
            const obj: Record<string, string> = {};
            let anyValue = false;
            for (let c = 1; c <= colCount; c++) {
              const header = headers[c - 1] ?? `col_${c}`;
              const text = extractText(row.getCell(c).value, kindFor(header)).trim();
              if (text !== "") anyValue = true;
              obj[header] = text;
            }
            if (anyValue) dataRows.push(obj);
          }
          setParsedData(dataRows);
        } catch (err) {
          console.error("XLSX parse failed", err);
          setParsedData([]);
        }
      })();
      return;
    }

    // Default: CSV via Papa.
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data as Record<string, string>[]);
      },
      error: () => {
        setParsedData([]);
      },
    });
  }, []);

  // Transactions require password re-auth before sending — the server
  // verifies the password via Supabase auth before committing any rows.
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const doImport = async (password?: string) => {
    if (!activeSection || parsedData.length === 0) return;

    setIsImporting(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = { rows: parsedData };
      if (password) body.password = password;
      const res = await fetch(`/api/import/${activeSection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: data.success ?? 0,
          failed: data.failed ?? 0,
          skipped: data.skipped ?? 0,
          errors: data.errors ?? [],
        });
      } else {
        setResult({
          success: 0,
          failed: parsedData.length,
          errors: [data.error || "Import failed"],
        });
      }
    } catch {
      setResult({
        success: 0,
        failed: parsedData.length,
        errors: ["Network error"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    // Transactions need password re-auth first. For other sections, go
    // straight to the POST.
    if (activeSection === "transactions") {
      setPwInput("");
      setPwError(null);
      setPwModalOpen(true);
      return;
    }
    await doImport();
  };

  const handleConfirmPassword = async () => {
    if (!pwInput) {
      setPwError("Password is required to approve transaction import");
      return;
    }
    setPwError(null);
    setPwModalOpen(false);
    await doImport(pwInput);
    // Clear the password from state once it's been sent.
    setPwInput("");
  };

  const resetUpload = () => {
    setActiveSection(null);
    setParsedData([]);
    setFileName("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Template Downloads */}
      <Card className="bg-white border-none shadow-none">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Download Templates</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Download XLSX (recommended — handles commas in fields, leading zeros in phones, and dates without ambiguity) or CSV.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-xl border border-border hover:border-[#23D2E2] hover:bg-[#23D2E2]/5 transition"
              >
                <div className="p-4 pb-2">
                  <p className="text-sm font-bold text-foreground">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.templateColumns.length} columns</p>
                </div>
                <div className="flex border-t border-border">
                  <button
                    onClick={() => downloadTemplateXlsx(section)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#23D2E2] hover:bg-[#23D2E2]/10 transition border-r border-border"
                  >
                    <Download className="h-3.5 w-3.5" />
                    XLSX
                  </button>
                  <button
                    onClick={() => downloadTemplateCsv(section)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/10 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Sections */}
      {canImport && SECTIONS.map((section) => (
        <Card key={section.id} className="bg-white border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              {activeSection === section.id && parsedData.length > 0 && (
                <button onClick={resetUpload} className="text-sm text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{section.description}</p>

            {section.id === "students" && (
              <StudentsFieldReference
                columns={section.templateColumns}
                branchOptions={branchOptions}
                programPackages={programPackages}
                programSlots={programSlots}
              />
            )}
            {section.id === "attendance" && (
              <AttendanceFieldReference instructorOptions={instructorOptions} />
            )}
            {section.id === "payments" && (
              <PaymentsFieldReference programOptions={programOptions} />
            )}
            {section.id === "transactions" && (
              <TransactionsFieldReference instructorOptions={instructorOptions} />
            )}

            {/* Hidden file input — always mounted so the "Choose different
                file" button below can trigger it without remounting state.
                The dropzone label uses htmlFor to target this same input. */}
            <input
              id={`upload-${section.id}`}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                handleFileUpload(e, section.id);
                // Reset the input value so picking the SAME file again
                // (after a correction) still fires onChange.
                e.target.value = "";
              }}
              className="hidden"
            />

            {/* Upload Area */}
            {activeSection !== section.id ? (
              <label
                htmlFor={`upload-${section.id}`}
                className={cn(
                  "flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed cursor-pointer transition",
                  "border-border hover:border-[#23D2E2] hover:bg-[#23D2E2]/5"
                )}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-bold text-foreground">Click to upload XLSX or CSV</span>
                <span className="text-xs text-muted-foreground mt-1">or drag and drop</span>
              </label>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-[#23D2E2]" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-muted-foreground">— {parsedData.length} rows</span>
                </div>

                {/* Header sanity check — if no row has the expected key for
                    this section, the header row was probably overwritten or
                    column names changed. The downstream "Row N: student_name
                    is required" errors are confusing in that case. */}
                {parsedData.length > 0 && section.id === "students" &&
                  !Object.keys(parsedData[0] ?? {}).includes("student_name") && (
                  <div className="rounded-lg p-4 bg-red-50 border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-red-900 mb-1">
                          Header row is missing or wrong
                        </p>
                        <p className="text-xs text-red-800 mb-2">
                          We didn&apos;t find a <span className="font-mono">student_name</span> column in row 1. Make sure row 1 has the column names exactly as the template specifies. Found columns:
                        </p>
                        <p className="text-xs font-mono text-red-700 break-all">
                          {Object.keys(parsedData[0] ?? {}).join(", ") || "(none)"}
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          Re-download the template (XLSX or CSV) and paste your data starting from row 2.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* All-example warning — the template's first data row is a
                    placeholder marked "EXAMPLE - delete this row before upload".
                    If the user hasn't replaced it, every row will be skipped
                    server-side and nothing will actually import. Surface this
                    before they hit Import so the result panel isn't a mystery. */}
                {parsedData.length > 0 && parsedData.every((r) =>
                  (r.student_name ?? "").trim().toUpperCase().startsWith("EXAMPLE")
                ) && (
                  <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-amber-900 mb-1">
                          Only the example row was found
                        </p>
                        <p className="text-xs text-amber-800">
                          The template ships with a placeholder row whose <span className="font-mono">student_name</span> starts with &ldquo;EXAMPLE&rdquo;. The server skips these on purpose. Open the file, <strong>replace the EXAMPLE row with your real student data</strong> (or add new rows below it and delete the EXAMPLE row), then re-upload.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Example parent_email still in real rows — pre-flight catch.
                    aiman.parent@example.com is the placeholder from the template's
                    EXAMPLE rows. If a real (non-EXAMPLE) row still uses it, the
                    server will reject either with "no parent found" (for shared
                    rows) or silently create an "aiman.parent" record (for
                    individual rows) — both surprising. */}
                {parsedData.some((r) =>
                  !(r.student_name ?? "").trim().toUpperCase().startsWith("EXAMPLE") &&
                  (r.parent_email ?? "").trim().toLowerCase() === "aiman.parent@example.com"
                ) && (
                  <div className="rounded-lg p-4 bg-red-50 border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-red-900 mb-1">
                          Real rows are using the example parent_email
                        </p>
                        <p className="text-xs text-red-800">
                          One or more non-EXAMPLE rows still have <span className="font-mono">parent_email = aiman.parent@example.com</span>{" "}
                          (the placeholder from the EXAMPLE rows). Replace it with the actual parent&apos;s email — siblings sharing a pool are identified by this field, so leaving it as the placeholder will cause &ldquo;no parent found&rdquo; errors on any shared row.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* In-file certificate_number duplicate detection
                    (Examinations only) — flag before sending to the server. */}
                {section.id === "examinations" && (() => {
                  const certRowMap = new Map<string, number[]>();
                  parsedData.forEach((r, i) => {
                    const v = (r.certificate_number ?? "").trim();
                    if (!v) return;
                    if ((r.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE")) return;
                    const key = v.toUpperCase();
                    if (!certRowMap.has(key)) certRowMap.set(key, []);
                    certRowMap.get(key)!.push(i + 1);
                  });
                  const dupes = Array.from(certRowMap.entries()).filter(([, rows]) => rows.length > 1);
                  if (dupes.length === 0) return null;
                  return (
                    <div className="rounded-lg p-4 bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-red-900 mb-1">
                            Duplicate certificate_number within this file
                          </p>
                          <p className="text-xs text-red-800 mb-2">
                            Each certificate number must be unique. These cert numbers appear on more than one row:
                          </p>
                          <ul className="text-xs font-mono text-red-700 space-y-0.5">
                            {dupes.map(([cert, rows]) => (
                              <li key={cert}>• {cert} — rows {rows.join(", ")}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* In-file cert-on-fail detection (Examinations only) —
                    fail/absent/scheduled etc. should NOT carry a cert number. */}
                {section.id === "examinations" && (() => {
                  const offenders = parsedData
                    .map((r, i) => ({ r, idx: i + 1 }))
                    .filter(({ r }) =>
                      !(r.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE") &&
                      (r.certificate_number ?? "").trim() !== "" &&
                      (r.status ?? "").trim().toLowerCase() !== "pass"
                    );
                  if (offenders.length === 0) return null;
                  return (
                    <div className="rounded-lg p-4 bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-red-900 mb-1">
                            Certificate number on a non-pass row
                          </p>
                          <p className="text-xs text-red-800 mb-2">
                            Certificate numbers are only awarded when status=pass. Clear the cert number on these rows OR change their status to pass:
                          </p>
                          <ul className="text-xs font-mono text-red-700 space-y-0.5">
                            {offenders.map(({ r, idx }) => (
                              <li key={idx}>
                                • row {idx}: status=<strong>{r.status || "(blank)"}</strong>, cert=<strong>{r.certificate_number}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* In-file receipt_seq duplicate detection (Payments only).
                    Each receipt number must be unique across the whole system
                    — flag if the user has two CSV rows with the same number. */}
                {section.id === "payments" && (() => {
                  const seqRowMap = new Map<string, number[]>();
                  parsedData.forEach((r, i) => {
                    const v = (r.receipt_seq ?? "").trim();
                    if (!v) return;
                    if ((r.student_id ?? "").trim().toUpperCase().startsWith("EXAMPLE")) return;
                    if (!seqRowMap.has(v)) seqRowMap.set(v, []);
                    seqRowMap.get(v)!.push(i + 1);
                  });
                  const dupes = Array.from(seqRowMap.entries()).filter(([, rows]) => rows.length > 1);
                  if (dupes.length === 0) return null;
                  return (
                    <div className="rounded-lg p-4 bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-red-900 mb-1">
                            Duplicate receipt_seq within this file
                          </p>
                          <p className="text-xs text-red-800 mb-2">
                            Each receipt number must be unique. These sequences appear on more than one row:
                          </p>
                          <ul className="text-xs font-mono text-red-700 space-y-0.5">
                            {dupes.map(([seq, rows]) => (
                              <li key={seq}>• receipt_seq <strong>{seq}</strong> — rows {rows.join(", ")}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Preview Table */}
                {parsedData.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left font-bold text-muted-foreground">#</th>
                          {Object.keys(parsedData[0]).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-bold text-muted-foreground whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Build the set of "bad" row numbers from TWO sources:
                          //   1. Server result (after Import is clicked) — parse
                          //      the "Row N: ..." prefix from each error.
                          //   2. Client-side pre-flight checks — same checks the
                          //      red banners above the preview run; we surface
                          //      them here too so the preview rows go red as
                          //      soon as the user can SEE them, not only after
                          //      Import is clicked.
                          const failedRows = new Set<number>();
                          if (result) {
                            for (const err of result.errors ?? []) {
                              const m = err.match(/^Row (\d+)\b/);
                              if (m) failedRows.add(parseInt(m[1], 10));
                            }
                          } else {
                            const isExample = (r: Record<string, string>) => {
                              const v = (r.student_id ?? r.student_name ?? r.sender_id ?? r.child_name ?? "").trim().toUpperCase();
                              return v.startsWith("EXAMPLE");
                            };

                            // Per-section pre-flight detectors. Each adds the
                            // offending row numbers to the failedRows set.
                            if (section.id === "students") {
                              parsedData.forEach((r, i) => {
                                if (isExample(r)) return;
                                if ((r.parent_email ?? "").trim().toLowerCase() === "aiman.parent@example.com") {
                                  failedRows.add(i + 1);
                                }
                              });
                            }

                            if (section.id === "payments") {
                              const seqMap = new Map<string, number[]>();
                              parsedData.forEach((r, i) => {
                                if (isExample(r)) return;
                                const v = (r.receipt_seq ?? "").trim();
                                if (!v) return;
                                if (!seqMap.has(v)) seqMap.set(v, []);
                                seqMap.get(v)!.push(i + 1);
                              });
                              for (const rows of seqMap.values()) {
                                if (rows.length > 1) rows.forEach((rn) => failedRows.add(rn));
                              }
                            }

                            if (section.id === "examinations") {
                              const certMap = new Map<string, number[]>();
                              parsedData.forEach((r, i) => {
                                if (isExample(r)) return;
                                const v = (r.certificate_number ?? "").trim();
                                if (v) {
                                  const key = v.toUpperCase();
                                  if (!certMap.has(key)) certMap.set(key, []);
                                  certMap.get(key)!.push(i + 1);
                                  // cert on non-pass
                                  if ((r.status ?? "").trim().toLowerCase() !== "pass") {
                                    failedRows.add(i + 1);
                                  }
                                }
                              });
                              for (const rows of certMap.values()) {
                                if (rows.length > 1) rows.forEach((rn) => failedRows.add(rn));
                              }
                            }
                          }
                          // Show all rows after import AND when pre-flight
                          // found problems — otherwise the user can't see the
                          // colored failures past row 5. Neutral previews
                          // still stay capped at 5 for compactness.
                          const expandPreview = !!result || failedRows.size > 0;
                          const rowsToShow = expandPreview ? parsedData : parsedData.slice(0, 5);
                          return rowsToShow.map((row, idx) => {
                            const rowNum = idx + 1;
                            const failed = failedRows.has(rowNum);
                            // Coloring rules:
                            //   - after import (result set): red for failed,
                            //     green for everything else (success/skipped)
                            //   - before import: red ONLY for pre-flight
                            //     failures, others stay neutral so the user
                            //     focuses on the problem rows
                            const rowClass = result
                              ? failed
                                ? "border-t bg-red-50"
                                : "border-t bg-green-50"
                              : failed
                                ? "border-t bg-red-50"
                                : "border-t";
                            return (
                              <tr key={idx} className={rowClass}>
                                <td className="px-3 py-2 text-muted-foreground">{rowNum}</td>
                                {Object.values(row).map((val, i) => (
                                  <td key={i} className="px-3 py-2 whitespace-nowrap">{val || "-"}</td>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {/* "more rows" hint — shown only when the preview was
                        actually capped at 5. We recompute the same condition
                        used inside the renderer. */}
                    {!result && parsedData.length > 5 && (() => {
                      // If any pre-flight failed row exists, the table is
                      // already expanded — no hint needed.
                      const anyFailedRowKnown = (() => {
                        const isExample = (r: Record<string, string>) => {
                          const v = (r.student_id ?? r.student_name ?? r.sender_id ?? r.child_name ?? "").trim().toUpperCase();
                          return v.startsWith("EXAMPLE");
                        };
                        if (section.id === "payments") {
                          const seqMap = new Map<string, number>();
                          for (const r of parsedData) {
                            if (isExample(r)) continue;
                            const v = (r.receipt_seq ?? "").trim();
                            if (!v) continue;
                            seqMap.set(v, (seqMap.get(v) ?? 0) + 1);
                          }
                          if (Array.from(seqMap.values()).some((n) => n > 1)) return true;
                        }
                        if (section.id === "examinations") {
                          const certMap = new Map<string, number>();
                          for (const r of parsedData) {
                            if (isExample(r)) continue;
                            const v = (r.certificate_number ?? "").trim();
                            if (!v) continue;
                            certMap.set(v.toUpperCase(), (certMap.get(v.toUpperCase()) ?? 0) + 1);
                            if ((r.status ?? "").trim().toLowerCase() !== "pass") return true;
                          }
                          if (Array.from(certMap.values()).some((n) => n > 1)) return true;
                        }
                        if (section.id === "students") {
                          if (parsedData.some((r) => !isExample(r) && (r.parent_email ?? "").trim().toLowerCase() === "aiman.parent@example.com")) return true;
                        }
                        return false;
                      })();
                      if (anyFailedRowKnown) return null;
                      return (
                        <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
                          ... and {parsedData.length - 5} more rows
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Result */}
                {result && (
                  <>
                    <div className={cn(
                      "rounded-lg p-4",
                      result.failed === 0 ? "bg-green-50" : "bg-amber-50"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        {result.failed === 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        )}
                        <span className="font-bold text-sm">
                          {result.success} imported, {result.failed} failed
                          {result.skipped ? `, ${result.skipped} skipped (example rows or already in system)` : ""}
                        </span>
                      </div>
                      {result.errors.length > 0 && (
                        <>
                          <p className="text-xs font-bold text-amber-700 mb-1">
                            Rejected rows — fix these in the CSV and re-upload:
                          </p>
                          <ul className="text-xs text-red-600 space-y-1 max-h-48 overflow-y-auto">
                            {result.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Post-result actions — let the user pick another file
                        (e.g. a corrected version of the same data, or the
                        next batch) without having to refresh the page. */}
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor={`upload-${section.id}`}
                        className="h-[50px] inline-flex items-center gap-2 px-6 rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white cursor-pointer font-bold text-sm transition"
                      >
                        <Upload className="h-4 w-4" />
                        Upload another file
                      </label>
                      <Button
                        onClick={resetUpload}
                        className="h-[50px] px-6 rounded-[10px] border border-[#23D2E2] bg-transparent text-[#23D2E2] hover:bg-[#23D2E2]/10 font-bold text-sm"
                      >
                        Done
                      </Button>
                    </div>
                  </>
                )}

                {/* Import + Reupload buttons */}
                {!result && (() => {
                  const realRows = parsedData.filter((r) =>
                    !(r.student_name ?? "").trim().toUpperCase().startsWith("EXAMPLE"),
                  );
                  const allExample = parsedData.length > 0 && realRows.length === 0;
                  const label = isImporting
                    ? "Importing..."
                    : allExample
                      ? "No real rows to import"
                      : `Import ${realRows.length || parsedData.length} rows`;
                  return (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleImport}
                        disabled={isImporting || parsedData.length === 0 || allExample}
                        className="h-[50px] px-8 text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {label}
                      </Button>
                      <label
                        htmlFor={`upload-${section.id}`}
                        className="h-[50px] inline-flex items-center gap-2 px-6 rounded-[10px] border border-[#23D2E2] text-[#23D2E2] hover:bg-[#23D2E2]/10 cursor-pointer font-bold text-sm transition"
                      >
                        <Upload className="h-4 w-4" />
                        Reupload
                      </label>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Password confirm modal — gates the transactions import */}
      {pwModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPwModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Confirm import with your password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adcoin transactions move balance between accounts. Enter your account password to approve this import.
              The rows will only be applied after the password is verified.
            </p>
            <input
              type="password"
              autoFocus
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmPassword(); }}
              className="w-full h-[44px] px-3 rounded-lg border border-[#ADAFCA] mb-2 text-sm"
              placeholder="Your password"
            />
            {pwError && (
              <p className="text-xs text-red-600 mb-2">{pwError}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button
                onClick={() => setPwModalOpen(false)}
                className="h-[42px] px-5 rounded-lg border border-[#ADAFCA] bg-transparent text-[#3e3f5e] hover:bg-muted/40 font-bold text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPassword}
                className="h-[42px] px-5 rounded-lg bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold text-sm"
              >
                Approve &amp; Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Field reference panel — shown for the Students section
// ============================================

interface LookupList {
  title: string;
  items: { primary: string; secondary?: string }[];
  emptyText?: string;
}

function LookupPanels({ lists, tip }: { lists: LookupList[]; tip?: React.ReactNode }) {
  const colClass =
    lists.length === 1
      ? "grid-cols-1"
      : lists.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : lists.length === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mb-5 rounded-xl border border-[#23D2E2]/30 bg-[#23D2E2]/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-[#23D2E2]" />
        <h3 className="text-sm font-bold text-[#3e3f5e]">Reference</h3>
      </div>

      <div className={cn("grid gap-3", colClass)}>
        {lists.map((list) => (
          <div key={list.title} className="rounded-lg bg-white border border-white p-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
              {list.title} ({list.items.length})
            </p>
            <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
              {list.items.length === 0 ? (
                <li className="text-muted-foreground italic">
                  {list.emptyText ?? "Nothing available."}
                </li>
              ) : (
                list.items.map((item, i) => (
                  <li key={`${list.title}-${i}`} className="text-[#3e3f5e]">
                    <span className="font-medium">{item.primary}</span>
                    {item.secondary && (
                      <span className="text-muted-foreground ml-1">{item.secondary}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>

      {tip && <p className="text-[11px] text-muted-foreground mt-3">{tip}</p>}
    </div>
  );
}

interface StudentsFieldReferenceProps {
  columns: string[];
  branchOptions: BranchOption[];
  programPackages: ProgramPackages[];
  programSlots: ProgramSlots[];
}

function StudentsFieldReference({
  branchOptions,
  programPackages,
  programSlots,
}: StudentsFieldReferenceProps) {
  return (
    <div className="mb-5 rounded-xl border border-[#23D2E2]/30 bg-[#23D2E2]/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-[#23D2E2]" />
        <h3 className="text-sm font-bold text-[#3e3f5e]">Reference</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Branches card */}
        <div className="rounded-lg bg-white border border-white p-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
            Available branches ({branchOptions.length})
          </p>
          <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
            {branchOptions.length === 0 ? (
              <li className="text-muted-foreground italic">No branches available.</li>
            ) : (
              branchOptions.map((b, i) => (
                <li key={`branch-${i}`} className="text-[#3e3f5e]">
                  <span className="font-medium">{b.name}</span>
                  {b.code && (
                    <span className="text-muted-foreground ml-1">({b.code})</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Packages per program — each program is its own column */}
        <div className="rounded-lg bg-white border border-white p-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
            Packages per program ({programPackages.length})
          </p>
          {programPackages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No packages defined yet.</p>
          ) : (
            <div className="grid gap-3 max-h-40 overflow-y-auto" style={{ gridTemplateColumns: `repeat(${programPackages.length}, minmax(120px, 1fr))` }}>
              {programPackages.map((pp) => (
                <div key={pp.program}>
                  <div className="text-xs font-bold text-[#3e3f5e] mb-1 truncate">{pp.program}</div>
                  <ul className="text-xs space-y-0.5">
                    {pp.packages.map((p) => (
                      <li key={`${p.package_type}-${p.duration}`} className="text-muted-foreground">
                        {p.package_type}+{p.duration}
                        <span className="text-[#3e3f5e]"> (RM{p.price.toLocaleString()})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slots per program — separate row, same column-per-program style */}
      <div className="rounded-lg bg-white border border-white p-3 mt-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">
          Slots per program ({programSlots.length})
        </p>
        {programSlots.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No slots defined yet.</p>
        ) : (
          <div
            className="grid gap-3 max-h-40 overflow-y-auto"
            style={{ gridTemplateColumns: `repeat(${programSlots.length}, minmax(120px, 1fr))` }}
          >
            {programSlots.map((ps) => (
              <div key={ps.program}>
                <div className="text-xs font-bold text-[#3e3f5e] mb-1 truncate">{ps.program}</div>
                <ul className="text-xs space-y-0.5">
                  {ps.slots.map((s, idx) => (
                    <li key={`${s.branch ?? ''}-${s.day}-${s.time}-${idx}`} className="text-muted-foreground">
                      {s.branch && (
                        <span className="text-[#615DFA] font-semibold">{s.branch} · </span>
                      )}
                      {s.day} {s.time}
                      <span className="text-[#3e3f5e]"> (cap {s.limit_student})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        <strong>One student, multiple enrollments:</strong> a student can have any number of enrollments — different programs,
        different weekly slots, or both. Just add another row with the same <span className="font-mono">student_name</span> + <span className="font-mono">parent_email</span> +
        branch and the import reuses the existing student record, then adds the new enrollment. The dedup key for enrollments is{" "}
        <span className="font-mono">(student, course, schedule_day, schedule_time)</span> — an exact match is skipped (so re-uploading
        the same file does nothing), but any of those differing creates a new enrollment.
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">
        <strong>The <span className="font-mono">student_id</span> column works three ways:</strong>
      </p>
      <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-5">
        <li>
          <strong>Blank</strong> — the system auto-generates an ID in the standard format
          (<span className="font-mono">ADV-{`{branchCode}`}-{`{year}{seq}`}</span>, e.g. <span className="font-mono">ADV-001-26001</span>).
          Best for typical new sign-ups.
        </li>
        <li>
          <strong>Custom value</strong> (e.g. <span className="font-mono">ADV26025</span> or any string from your old system) — the
          system uses your value as-is for the new student. Best for migrating an existing roster while keeping the IDs you already know.
        </li>
        <li>
          <strong>An ID that already exists in this system</strong> — the row is bound to that existing student. New enrollment rows are
          added under them (different program/day/time creates a new enrollment; exact same row is skipped).
        </li>
      </ul>
      <p className="text-[11px] text-muted-foreground mt-2">
        Even if you leave <span className="font-mono">student_id</span> blank, the import won&apos;t create duplicates: rows whose <span className="font-mono">student_name</span> + <span className="font-mono">parent_email</span> + branch match an existing student reuse that record.
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">
        Each program has its own set of packages. CSV columns{" "}
        <span className="font-mono">program_name</span>,{" "}
        <span className="font-mono">package_type</span>, and{" "}
        <span className="font-mono">package_duration</span> must match a row above — picking a package that doesn&apos;t belong to the chosen program will reject that CSV row.
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">
        <strong>Schedule:</strong> <span className="font-mono">schedule_day</span> and{" "}
        <span className="font-mono">schedule_time</span> are accepted in any valid format
        (<span className="font-mono">monday</span>–<span className="font-mono">sunday</span>,{" "}
        <span className="font-mono">HH:MM</span>) — the import does <strong>not</strong> reject
        rows that don&apos;t match an existing slot, but unmatched students may not appear correctly on{" "}
        <span className="font-mono">/attendance</span>. Stick to the slots above for clean grouping.
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">
        <strong>Sibling sharing is automatic:</strong> any two rows with the same{" "}
        <span className="font-mono">parent_email</span> + <span className="font-mono">program_name</span> get pooled together —
        no flag required. The first row of the pair becomes the anchor; the second auto-joins. This also covers
        a single student with multiple slots in the same program: the second slot auto-joins the family pool.
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">
        Tip — for students who <strong>already paid</strong> and still have unused sessions: set <span className="font-mono">enrollment_status=active</span> and <span className="font-mono">sessions_remaining</span> to whatever count they have left. No payment row is generated by this import, so they won&apos;t be double-charged. To record the historical payment / attendance / adcoin, use the Payments / Attendance / Transactions imports next.
      </p>
    </div>
  );
}

// ============================================
// Reference panels — Attendance / Payments / Transactions
// ============================================

function AttendanceFieldReference({ instructorOptions }: { instructorOptions: InstructorOption[] }) {
  const lists: LookupList[] = [
    {
      title: "Valid status",
      items: ["present", "absent", "late", "excused"].map((s) => ({ primary: s })),
    },
    {
      title: "Valid class_type",
      items: ["Physical", "Online"].map((s) => ({ primary: s })),
    },
    {
      title: "Instructors (for instructor_name)",
      emptyText: "No instructors available.",
      items: instructorOptions.map((u) => ({
        primary: u.name,
        secondary: u.branch ? `(${u.email}) · ${u.branch}` : `(${u.email})`,
      })),
    },
  ];
  return (
    <LookupPanels
      lists={lists}
      tip={
        <>
          <span className="font-mono">student_id</span> is the human-readable code printed on the Students tab (e.g. <span className="font-mono">ADV-001-25001</span>). <span className="font-mono">date</span> uses <span className="font-mono">YYYY-MM-DD</span>. <span className="font-mono">adcoin</span> is the amount awarded for that session (will be added to the student&apos;s balance). This import does <strong>not</strong> trigger session-decrement, exam level-up, or notifications — it&apos;s purely historical.
        </>
      }
    />
  );
}

function PaymentsFieldReference({ programOptions }: { programOptions: string[] }) {
  const lists: LookupList[] = [
    {
      title: "Valid status",
      items: ["paid", "pending"].map((s) => ({ primary: s })),
    },
    {
      title: "Valid payment_method",
      items: ["cash", "credit_card", "bank_transfer", "promptpay", "other"].map((s) => ({
        primary: s,
      })),
    },
    {
      title: "Available programs (for program_name)",
      emptyText: "No programs available.",
      items: programOptions.map((p) => ({ primary: p })),
    },
  ];
  return (
    <LookupPanels
      lists={lists}
      tip={
        <>
          <span className="font-mono">student_id</span> uses the printed code (e.g. <span className="font-mono">ADV-001-25001</span>). <span className="font-mono">amount</span> is a decimal (e.g. <span className="font-mono">450.00</span>). <span className="font-mono">paid_at</span> uses <span className="font-mono">YYYY-MM-DD</span> (leave blank for unpaid). This import does <strong>not</strong> update enrollment <span className="font-mono">sessions_remaining</span> — set that during the Students import.
        </>
      }
    />
  );
}

function TransactionsFieldReference({ instructorOptions }: { instructorOptions: InstructorOption[] }) {
  const lists: LookupList[] = [
    {
      title: "Valid sender_type / receiver_type",
      items: [
        { primary: "student", secondary: "(use student_id, e.g. ADV-001-25001)" },
        { primary: "user", secondary: "(use email, e.g. instructor@example.com)" },
      ],
    },
    {
      title: "Valid type",
      items: ["earned", "spent", "transfer", "adjusted"].map((s) => ({ primary: s })),
    },
    {
      title: "Team members (for user emails)",
      emptyText: "No team members available.",
      items: instructorOptions.map((u) => ({
        primary: u.email,
        secondary: u.branch ? `(${u.name}) · ${u.branch}` : `(${u.name})`,
      })),
    },
  ];
  return (
    <LookupPanels
      lists={lists}
      tip={
        <>
          The importer adjusts both balances directly: subtracts <span className="font-mono">amount</span> from the sender and adds it to the receiver. Use <span className="font-mono">transfer</span> for sibling sharing or staff-to-student bonuses, <span className="font-mono">adjusted</span> for manual corrections.
        </>
      }
    />
  );
}
