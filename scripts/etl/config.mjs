// scripts/etl/config.mjs
// -----------------------------------------------------------------------------
// B3 ETL — configuration & decision knobs for the Hub -> LMS migration.
// Everything that's a judgement call lives here so the logic in migrate.mjs is
// mechanical. Review this file before any --commit run.
// -----------------------------------------------------------------------------
import "./load-env.mjs"; // MUST be first — populates process.env before the reads below

export const SOURCE = {
  // Learning Hub (advaspire-learning) — the data we pull FROM.
  name: "hub-advaspire-learning",
  url: "https://sfxltburkhrgsojyvboj.supabase.co",
  key: process.env.HUB_SERVICE_ROLE_KEY, // service_role (read)
};

export const TARGET = {
  // LMS (advaspire-system) — the unified DB we write INTO (after A6 applied).
  name: "lms-advaspire-system",
  url: "https://kbzrdsxzzqzbxqgwpsuq.supabase.co",
  key: process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Hub user_role -> LMS users.role (text). Students do NOT go to users (see migrate.mjs).
export const ROLE_MAP = {
  "super-admin": "super_admin",
  "school-admin": "company_admin",
  "school-teacher": "instructor",
  // 'school-student' handled separately -> public.students
};

// Synthetic auth emails (decision #8/#9). Students keyed off student_id; staff off username.
export const EMAIL = {
  studentDomain: "student.advaspire.com", // <lower(student_id)>@student.advaspire.com
  staffDomain: "staff.advaspire.com", //    <lower(username)>@staff.advaspire.com
};

// School(name) -> we map by exact name match to an LMS branch(name). Global Ark's
// branch is created by A6 (code GAIS). If any school fails to match, the ETL ABORTS.
export const SCHOOL_MATCH_BY = "name";

// Created (unresolved) students get a TEMPORARY placeholder student_id derived from
// their BRANCH code (decision 2026-06-18): numeric code -> ADV<code>-####, else <code>-####.
//   Kepong(002)->ADV002-0001 · Semenyih(001)->ADV001-0001 · Global Ark(GAIS)->GAIS-0001.
// Per-branch sequence, seeded above existing ids. Super-admin re-IDs later (decision #11).
export const CREATED_STUDENT_ID_PAD = 4;
export const CREATED_STUDENT_DEFAULTS = { level: 1, adcoin_balance: 0 };

// Pre-A6 dry-run only: Global Ark's GAIS branch doesn't exist until A6, so the dry-run
// can't read its code. Fall back by school name so the prefix still shows correctly.
export const SCHOOL_BRANCH_CODE_FALLBACK = { "Global Ark International School": "GAIS" };

// Hub super-admin links to the EXISTING LMS super_admin instead of creating a 2nd
// (decision 2026-06-18). Other staff are created normally.
export const LINK_HUB_SUPERADMIN = true;

// Default password policy: password = the natural id (student_id for students,
// username for staff). Users reset on first login.
export const RESET_PASSWORD_TO = "natural-id";

// Storage buckets to copy Hub -> LMS (handled by migrate-storage.mjs, not this file).
export const HUB_BUCKETS = ["assessment-uploads", "lesson-resources", "student-uploads"];

// Additive tables to migrate, in dependency order. Each entry declares how to
// rewrite its FKs. owner = the student-owner column (user_id -> students.id);
// schoolCol -> branch_id; staffCols stay -> users.id. keepId preserves the source
// UUID so intra-Hub references (assessment_id, attempt_id) stay valid.
export const MIGRATE_TABLES = [
  // --- standalone content catalog (only updated_by is a staff ref) ---
  { table: "ev3_lessons", keepId: true, owner: null, schoolCol: null, staffCols: ["updated_by"] },
  { table: "advasbot_lessons", keepId: true, owner: null, schoolCol: null, staffCols: ["updated_by"] },
  { table: "microbit_lessons", keepId: true, owner: null, schoolCol: null, staffCols: ["updated_by"] },
  { table: "assessments", keepId: true, owner: null, schoolCol: null, staffCols: [] },
  { table: "lesson_resources", keepId: true, owner: null, schoolCol: null, staffCols: ["updated_by"] },
  { table: "advasbot_planning", keepId: true, owner: null, schoolCol: null, staffCols: ["updated_by"], conflict: "section" },
  // --- student/school-scoped (owner user_id -> student_id) ---
  { table: "lesson_progress", keepId: true, owner: "user_id", schoolCol: "school_id",
    staffCols: ["learnt_approved_by","challenge_approved_by","homework_approved_by",
                "mission1_approved_by","mission2_approved_by","mission3_approved_by"] },
  { table: "assessment_attempts", keepId: true, owner: "user_id", schoolCol: "school_id",
    staffCols: ["unlocked_by","marked_by"] },
  { table: "certificates", keepId: true, owner: "user_id", schoolCol: "school_id",
    staffCols: ["issued_by"] }, // attempt_id kept via keepId on assessment_attempts
  { table: "lesson_quiz_attempts", keepId: true, owner: "user_id", schoolCol: "school_id", staffCols: [] },
  { table: "lesson_ratings", keepId: true, owner: "user_id", schoolCol: "school_id", staffCols: ["updated_by"] },
  { table: "lesson_remarks", keepId: true, owner: "user_id", schoolCol: "school_id", staffCols: ["updated_by"] },
  { table: "lesson_uploads", keepId: true, owner: "user_id", schoolCol: "school_id", staffCols: ["updated_by"] },
];

// classes/class_members are special (merge into course_slots/slot_students) — handled
// explicitly in migrate.mjs, not via MIGRATE_TABLES.
