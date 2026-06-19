-- =============================================================================
-- A6 — CANONICAL SCHEMA DIFF for the unified Supabase (LMS = advaspire-system)
-- =============================================================================
-- STATUS: REVIEW ONLY. Do NOT run against prod. Rehearse on a Supabase BRANCH
--         of the LMS project (Part B2), verify, then apply in Part C2.
-- Source of truth: A3 inventory (see UNIFICATION-PLAN.md, 2026-06-18).
--
-- What this adds to the LMS DB so it can host the migrated Learning-Hub data:
--   1. students.auth_id            -> bring LMS students into Supabase auth
--   2. branches.type 'school' + signature fields  (Hub schools fold into branches)
--   3. school_branch_map + hub_user_map           (ETL staging, dropped after C5)
--   4. two Hub enums (progress_status, assessment_status)
--   5. lesson content catalog tables (additive, standalone)
--   6. student/school-scoped tables with REMAPPED FKs:
--        owner  user_id  -> student_id -> public.students(id)
--        tenant school_id -> branch_id  -> public.branches(id)
--        staff  *_approved_by / marked_by / issued_by / unlocked_by / updated_by
--                                      -> public.users(id)   (unchanged target)
--
-- OPEN DECISIONS embedded below (marked  >>> DECIDE):
--   D1. Fold schools into branches (this file) vs keep a thin schools lookup.
--   D2. class_members owner = student (assumed) vs may include staff.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Conventions
-- -----------------------------------------------------------------------------
-- branches.type is TEXT but HAS an existing CHECK `branches_type_check` limiting it to
-- ('company','hq','branch'). Adding 'school' REQUIRES widening that constraint first
-- (done in section 2 below). >>> Discovered by the B2 dry-run, 2026-06-18.

-- -----------------------------------------------------------------------------
-- 1. Students -> Supabase auth (decision #7/#8)
-- -----------------------------------------------------------------------------
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE public.students
  ADD CONSTRAINT students_auth_id_fkey
  FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS students_auth_id_key
  ON public.students(auth_id) WHERE auth_id IS NOT NULL;
-- ETL (C4) mints auth.users: email <lower(student_id)>@student.advaspire.com,
-- password = student_id, then writes students.auth_id. username stays NULL
-- (except the 27 ADV002-XXXXX placeholders: temp username = student_id).

-- -----------------------------------------------------------------------------
-- 2. Hub schools fold into branches  (D1 RESOLVED: branch = school)
--    school_id is NOT literally branch_id (different UUIDs) -> mapping required.
--    Name-based map (A3): Kepong school 28833139.. -> branch 78d12755.. (code 002)
--                         Semenyih school 7b2da70f.. -> branch 701e847c.. (code 001)
--                         Global Ark 6f423c60..      -> NO existing branch -> CREATE below.
--    Carry the Hub school signature fields onto branches (certificates use them).
-- -----------------------------------------------------------------------------
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS signature_path  text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS signed_name     text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS signed_position text;

-- Widen the existing type CHECK to allow 'school' (required for Global Ark + the fold).
-- Existing def: CHECK (type = ANY (ARRAY['company','hq','branch'])).
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_type_check;
ALTER TABLE public.branches ADD CONSTRAINT branches_type_check
  CHECK (type = ANY (ARRAY['company','hq','branch','school']));

-- D1/Global Ark (decision 2026-06-18): create a new school-type branch.
-- parent_id -> the company branch 'Advaspire Robotics and Coding Academy' (b9db8917..).
-- Review id/parent/admin before running; the 27 unresolved Hub students land here.
INSERT INTO public.branches (id, name, type, code, parent_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Global Ark International School', 'school', 'GAIS',
       'b9db8917-c077-46ae-8eee-caae31f9b170', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.branches WHERE code = 'GAIS');

-- -----------------------------------------------------------------------------
-- 3. ETL staging tables (review their rows before C3; DROP after C5)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_branch_map (
  hub_school_id   uuid PRIMARY KEY,             -- old Hub schools.id
  branch_id       uuid NOT NULL REFERENCES public.branches(id),
  hub_school_name text,
  mapped_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hub_user_map (
  hub_user_id uuid PRIMARY KEY,                 -- old Hub users.id
  kind        text NOT NULL CHECK (kind IN ('student','staff')),
  student_id  uuid REFERENCES public.students(id),  -- set when kind='student'
  user_id     uuid REFERENCES public.users(id),     -- set when kind='staff'
  disposition text NOT NULL CHECK (disposition IN ('linked','created')),
  note        text
);
-- B3 ETL populates hub_user_map (verification_id->student_id match = 'linked';
-- 27 unresolved + 8 staff = 'created'). All later FK rewrites read this map.

-- -----------------------------------------------------------------------------
-- 4. Hub-origin enums (do not exist in the LMS)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.progress_status AS ENUM ('not_done','pending','approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_status AS ENUM ('unlocked','in_progress','submitted','marked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 5. Lesson content catalog (additive, standalone; only updated_by -> users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ev3_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  level       integer,
  position    smallint,
  code        text,
  online_url  text,
  local_url   text,
  video_url   text,
  image_path  text,
  pdf_path    text,
  content_md  text,
  updated_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advasbot_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  level       smallint,
  position    smallint,
  code        text,
  online_url  text,
  local_url   text,
  video_url   text,
  image_path  text,
  pdf_path    text,
  content_md  text,
  updated_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.microbit_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  level       smallint,
  position    smallint,
  code        text,
  online_url  text,
  local_url   text,
  video_url   text,
  image_path  text,
  pdf_path    text,
  content_md  text,
  updated_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course          text NOT NULL,
  level           integer NOT NULL,
  version         integer NOT NULL,
  coordinate      text NOT NULL,
  title           text NOT NULL,
  total_marks     integer NOT NULL,
  pass_pct        integer NOT NULL,
  distinction_pct integer NOT NULL,
  duration_min    integer NOT NULL,
  bank_module     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessments_course_level_version_key UNIQUE (course, level, version)
);

CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_coordinate text NOT NULL,
  online_url        text,
  local_url         text,
  image_path        text,
  pdf_path          text,
  video_url         text,
  updated_by        uuid REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_resources_coordinate_key UNIQUE (lesson_coordinate)
);

CREATE TABLE IF NOT EXISTS public.advasbot_planning (
  section    text PRIMARY KEY,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

-- -----------------------------------------------------------------------------
-- 6. Student/school-scoped tables  (owner user_id -> student_id -> students;
--    school_id -> branch_id -> branches; staff cols -> users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             uuid NOT NULL REFERENCES public.students(id),  -- was user_id->users
  branch_id              uuid NOT NULL REFERENCES public.branches(id),  -- was school_id->schools
  lesson_coordinate      text NOT NULL,
  learnt_status          public.progress_status NOT NULL DEFAULT 'not_done',
  learnt_ticked_at       timestamptz,
  learnt_approved_by     uuid REFERENCES public.users(id),
  learnt_approved_at     timestamptz,
  challenge_status       public.progress_status NOT NULL DEFAULT 'not_done',
  challenge_ticked_at    timestamptz,
  challenge_approved_by  uuid REFERENCES public.users(id),
  challenge_approved_at  timestamptz,
  homework_status        public.progress_status NOT NULL DEFAULT 'not_done',
  homework_ticked_at     timestamptz,
  homework_approved_by   uuid REFERENCES public.users(id),
  homework_approved_at   timestamptz,
  mission1_status        public.progress_status NOT NULL DEFAULT 'not_done',
  mission1_ticked_at     timestamptz,
  mission1_approved_by   uuid REFERENCES public.users(id),
  mission1_approved_at   timestamptz,
  mission2_status        public.progress_status NOT NULL DEFAULT 'not_done',
  mission2_ticked_at     timestamptz,
  mission2_approved_by   uuid REFERENCES public.users(id),
  mission2_approved_at   timestamptz,
  mission3_status        public.progress_status NOT NULL DEFAULT 'not_done',
  mission3_ticked_at     timestamptz,
  mission3_approved_by   uuid REFERENCES public.users(id),
  mission3_approved_at   timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_progress_student_coordinate_key UNIQUE (student_id, lesson_coordinate)
);
CREATE INDEX IF NOT EXISTS lesson_progress_branch_idx ON public.lesson_progress(branch_id);

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id),  -- was user_id
  branch_id     uuid NOT NULL REFERENCES public.branches(id),  -- was school_id
  assessment_id uuid NOT NULL REFERENCES public.assessments(id),
  status        public.assessment_status NOT NULL DEFAULT 'unlocked',
  unlocked_by   uuid REFERENCES public.users(id),
  unlocked_at   timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  submitted_at  timestamptz,
  answers       jsonb,
  question_ids  jsonb,
  part_a_score  integer,
  part_b_marks  jsonb,
  part_c_marks  jsonb,
  teacher_notes text,
  final_score   integer,
  marked_by     uuid REFERENCES public.users(id),
  marked_at     timestamptz,
  answer_files  jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_attempts_student_assessment_key UNIQUE (student_id, assessment_id)
);
CREATE INDEX IF NOT EXISTS assessment_attempts_branch_idx ON public.assessment_attempts(branch_id);

CREATE TABLE IF NOT EXISTS public.certificates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.students(id),  -- was user_id
  branch_id    uuid NOT NULL REFERENCES public.branches(id),  -- was school_id
  student_name text NOT NULL,
  course_name  text NOT NULL,
  template     text NOT NULL,
  grade        text,
  code         text NOT NULL,
  date_issued  date NOT NULL,
  source       text NOT NULL,
  attempt_id   uuid REFERENCES public.assessment_attempts(id),
  issued_by    uuid REFERENCES public.users(id),
  issued_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS certificates_student_idx ON public.certificates(student_id);

CREATE TABLE IF NOT EXISTS public.lesson_quiz_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id),
  branch_id         uuid NOT NULL REFERENCES public.branches(id),
  lesson_coordinate text NOT NULL,
  question_ids      jsonb,
  answers           jsonb,
  score             integer,
  total             integer NOT NULL,
  submitted_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_quiz_attempts_student_coordinate_key UNIQUE (student_id, lesson_coordinate)
);

CREATE TABLE IF NOT EXISTS public.lesson_ratings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id),
  branch_id         uuid NOT NULL REFERENCES public.branches(id),
  lesson_coordinate text NOT NULL,
  effort            smallint,
  knowledge         smallint,
  behaviour         smallint,
  updated_by        uuid REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_ratings_student_coordinate_key UNIQUE (student_id, lesson_coordinate)
);

CREATE TABLE IF NOT EXISTS public.lesson_remarks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id),
  branch_id         uuid NOT NULL REFERENCES public.branches(id),
  lesson_coordinate text NOT NULL,
  note              text,
  updated_by        uuid REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_remarks_student_coordinate_key UNIQUE (student_id, lesson_coordinate)
);

CREATE TABLE IF NOT EXISTS public.lesson_uploads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id),
  branch_id         uuid NOT NULL REFERENCES public.branches(id),
  lesson_coordinate text NOT NULL,
  image_path        text,
  project_url       text,
  video_url         text,
  updated_by        uuid REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_uploads_student_coordinate_key UNIQUE (student_id, lesson_coordinate)
);

-- D2 RESOLVED (2026-06-18): merge Hub "class" INTO the LMS "slot" = "class slot".
-- Extend course_slots with a kind; class-kind slots carry a roster but no schedule.
ALTER TABLE public.course_slots
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'schedule';
-- Allow roster-only (class) slots to omit schedule fields:
ALTER TABLE public.course_slots ALTER COLUMN course_id     DROP NOT NULL;
ALTER TABLE public.course_slots ALTER COLUMN day           DROP NOT NULL;
ALTER TABLE public.course_slots ALTER COLUMN time          DROP NOT NULL;
ALTER TABLE public.course_slots ALTER COLUMN duration      DROP NOT NULL;
ALTER TABLE public.course_slots ALTER COLUMN limit_student DROP NOT NULL;
-- ...but keep existing scheduled slots fully constrained via a kind-aware CHECK:
ALTER TABLE public.course_slots DROP CONSTRAINT IF EXISTS course_slots_kind_chk;
ALTER TABLE public.course_slots ADD CONSTRAINT course_slots_kind_chk CHECK (
  kind = 'class' OR
  (kind = 'schedule' AND course_id IS NOT NULL AND day IS NOT NULL
   AND time IS NOT NULL AND duration IS NOT NULL AND limit_student IS NOT NULL)
);
-- For class-kind slots, the Hub class name lives here:
ALTER TABLE public.course_slots ADD COLUMN IF NOT EXISTS name text;
-- Optional single "teacher in charge" (nullable; applies to class-kind slots,
-- harmless for scheduled slots which still use course_slot_teachers for the roster):
ALTER TABLE public.course_slots
  ADD COLUMN IF NOT EXISTS teacher_in_charge uuid REFERENCES public.users(id);
-- ETL: Hub classes(12) -> course_slots(kind='class', branch_id=mapped, name=class.name,
--       created_by=remapped users id). Hub classes.UNIQUE(school_id,name) becomes:
CREATE UNIQUE INDEX IF NOT EXISTS course_slots_class_branch_name_key
  ON public.course_slots(branch_id, name) WHERE kind = 'class';

-- Student roster on a slot (the merged "class slot" membership). Students only.
CREATE TABLE IF NOT EXISTS public.slot_students (
  slot_id    uuid NOT NULL REFERENCES public.course_slots(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),   -- was class_members.user_id->users
  branch_id  uuid NOT NULL REFERENCES public.branches(id),   -- was school_id
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slot_id, student_id)
);
CREATE INDEX IF NOT EXISTS slot_students_student_idx ON public.slot_students(student_id);
-- ETL: Hub class_members(31) -> slot_students (slot_id = the migrated class-kind slot).

-- -----------------------------------------------------------------------------
-- 7. Lock down by default (policies authored in Part B4).
--    App reads via service-role (supabaseAdmin) which bypasses RLS, so enabling
--    RLS with no policy is safe for the app and closes anon-key exposure.
-- -----------------------------------------------------------------------------
ALTER TABLE public.ev3_lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advasbot_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microbit_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advasbot_planning    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_remarks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_uploads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_students        ENABLE ROW LEVEL SECURITY;
-- (course_slots RLS is enabled in B4-rls-enable.sql — pre-existing table.)
-- NOTE (B4): the LMS already has 18 PRE-EXISTING tables with RLS disabled
-- (role_permissions, vouchers, session_transfers, custom_roles, events, ...).
-- Decide their policies in the same B4 pass; do NOT blanket-enable without policies.

COMMIT;

-- =============================================================================
-- Public-read lesson content (Hub serves public lesson pages). Author in B4,
-- e.g.:  CREATE POLICY ev3_public_read ON public.ev3_lessons FOR SELECT USING (true);
-- Tenant/role policies (instructor sees own branch's progress, etc.) also B4.
-- =============================================================================
