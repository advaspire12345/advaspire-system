-- =============================================================================
-- B4 — RLS POLICIES for the unified DB (translated from the Hub's access model)
-- =============================================================================
-- Context: the LMS app reads via service-role (bypasses RLS). These policies exist
-- for (a) the HUB app once it's repointed here (it uses the anon/session client, so
-- RLS applies), and (b) closing anon-key exposure. Idempotent (drop-if-exists).
--
-- Translation from Hub -> unified schema:
--   user_id = auth.uid()      (student-owned)  ->  student_id = app_current_student_id()
--   school_id = current_school + staff role     ->  app_staff_sees_branch(branch_id)
--   Hub roles -> LMS roles: school-admin=company_admin, school-teacher=instructor,
--   super-admin=super_admin (branch-staff tier also covers group_admin/assistant_admin).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Resolver functions (SECURITY DEFINER so they can read students/users
--    regardless of those tables' own RLS). Map the calling auth user -> identity.
-- ---------------------------------------------------------------------------
create or replace function public.app_current_student_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.students where auth_id = auth.uid() and deleted_at is null limit 1;
$$;

create or replace function public.app_current_role() returns text
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.users where auth_id = auth.uid() and deleted_at is null limit 1),
    (select case when exists (select 1 from public.students where auth_id = auth.uid() and deleted_at is null)
                 then 'student' end)
  );
$$;

create or replace function public.app_current_branch_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select branch_id from public.users    where auth_id = auth.uid() and deleted_at is null limit 1),
    (select branch_id from public.students where auth_id = auth.uid() and deleted_at is null limit 1)
  );
$$;

-- True if the caller is staff allowed to see rows in branch b:
--   super_admin / group_admin -> all branches; company_admin/assistant_admin/instructor -> own branch.
create or replace function public.app_staff_sees_branch(b uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when public.app_current_role() = any (array['super_admin','group_admin']) then true
    when public.app_current_role() = any (array['company_admin','assistant_admin','instructor']) then b = public.app_current_branch_id()
    else false end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Lesson content — public read (Hub serves these on public pages)
-- ---------------------------------------------------------------------------
do $$ declare t text;
begin
  foreach t in array array['ev3_lessons','advasbot_lessons','microbit_lessons','lesson_resources'] loop
    execute format('drop policy if exists %I on public.%I', t||'_public_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||'_public_read', t);
  end loop;
end $$;

-- assessments catalogue: authenticated read (Hub: "everyone reads catalogue")
drop policy if exists assessments_read on public.assessments;
create policy assessments_read on public.assessments for select to authenticated using (true);

-- advasbot_planning: staff only (Hub had no student/public access)
drop policy if exists advasbot_planning_staff_read on public.advasbot_planning;
create policy advasbot_planning_staff_read on public.advasbot_planning for select to authenticated
  using (public.app_current_role() = any (array['super_admin','group_admin','company_admin','assistant_admin','instructor']));

-- ---------------------------------------------------------------------------
-- 2. Student-owned data: student sees/writes own; staff see their branch.
-- ---------------------------------------------------------------------------
-- lesson_progress: student R/W own, staff R/U branch
drop policy if exists lesson_progress_student_read   on public.lesson_progress;
drop policy if exists lesson_progress_student_insert on public.lesson_progress;
drop policy if exists lesson_progress_student_update on public.lesson_progress;
drop policy if exists lesson_progress_staff_read     on public.lesson_progress;
drop policy if exists lesson_progress_staff_update   on public.lesson_progress;
create policy lesson_progress_student_read   on public.lesson_progress for select to authenticated using (student_id = public.app_current_student_id());
create policy lesson_progress_student_insert on public.lesson_progress for insert to authenticated with check (student_id = public.app_current_student_id());
create policy lesson_progress_student_update on public.lesson_progress for update to authenticated using (student_id = public.app_current_student_id()) with check (student_id = public.app_current_student_id());
create policy lesson_progress_staff_read     on public.lesson_progress for select to authenticated using (public.app_staff_sees_branch(branch_id));
create policy lesson_progress_staff_update   on public.lesson_progress for update to authenticated using (public.app_staff_sees_branch(branch_id)) with check (public.app_staff_sees_branch(branch_id));

-- assessment_attempts: student R own + U own(in_progress), staff R/U branch
drop policy if exists assessment_attempts_student_read   on public.assessment_attempts;
drop policy if exists assessment_attempts_student_update on public.assessment_attempts;
drop policy if exists assessment_attempts_staff_read     on public.assessment_attempts;
drop policy if exists assessment_attempts_staff_update   on public.assessment_attempts;
create policy assessment_attempts_student_read   on public.assessment_attempts for select to authenticated using (student_id = public.app_current_student_id());
create policy assessment_attempts_student_update on public.assessment_attempts for update to authenticated using (student_id = public.app_current_student_id() and status = 'in_progress'::public.assessment_status) with check (student_id = public.app_current_student_id());
create policy assessment_attempts_staff_read     on public.assessment_attempts for select to authenticated using (public.app_staff_sees_branch(branch_id));
create policy assessment_attempts_staff_update   on public.assessment_attempts for update to authenticated using (public.app_staff_sees_branch(branch_id)) with check (public.app_staff_sees_branch(branch_id));

-- certificates / quiz / remarks / uploads: student R own, staff R branch
do $$ declare t text;
begin
  foreach t in array array['certificates','lesson_quiz_attempts','lesson_remarks','lesson_uploads'] loop
    execute format('drop policy if exists %I on public.%I', t||'_student_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_staff_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (student_id = public.app_current_student_id())', t||'_student_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.app_staff_sees_branch(branch_id))', t||'_staff_read', t);
  end loop;
end $$;

-- lesson_ratings: staff-only (no student read, per Hub)
drop policy if exists lesson_ratings_staff_read on public.lesson_ratings;
create policy lesson_ratings_staff_read on public.lesson_ratings for select to authenticated using (public.app_staff_sees_branch(branch_id));

-- slot_students (was class_members): student R own, staff R branch
drop policy if exists slot_students_student_read on public.slot_students;
drop policy if exists slot_students_staff_read   on public.slot_students;
create policy slot_students_student_read on public.slot_students for select to authenticated using (student_id = public.app_current_student_id());
create policy slot_students_staff_read   on public.slot_students for select to authenticated using (public.app_staff_sees_branch(branch_id));

-- ---------------------------------------------------------------------------
-- 3. Enable RLS on the 18 pre-existing exposed tables (from B4-rls-enable.sql).
--    All accessed only via service-role in the LMS, so bare-enable is safe.
-- ---------------------------------------------------------------------------
alter table public.adcoin_topup_requests      enable row level security;
alter table public.admin_branches             enable row level security;
alter table public.app_settings               enable row level security;
alter table public.course_slot_teachers       enable row level security;
alter table public.course_slots               enable row level security;
alter table public.custom_roles               enable row level security;
alter table public.enrollment_course_switches enable row level security;
alter table public.event_occurrences          enable row level security;
alter table public.events                     enable row level security;
alter table public.notifications              enable row level security;
alter table public.pool_students              enable row level security;
alter table public.role_hierarchy             enable row level security;
alter table public.role_permissions           enable row level security;
alter table public.session_reschedules        enable row level security;
alter table public.session_transfers          enable row level security;
alter table public.shared_session_pools       enable row level security;
alter table public.user_permissions           enable row level security;
alter table public.vouchers                   enable row level security;

-- course_slots is dual-purpose (LMS scheduled slots + Hub class-slots). The Hub app
-- reads class-slots via the session client -> needs a branch-scoped read policy.
-- (LMS app uses service-role, so its slot reads bypass RLS regardless.)
drop policy if exists course_slots_branch_read on public.course_slots;
create policy course_slots_branch_read on public.course_slots for select to authenticated
  using (public.app_staff_sees_branch(branch_id) or branch_id = public.app_current_branch_id());

-- =============================================================================
-- Notes:
-- * Lesson content (ev3/advasbot/microbit/lesson_resources) is public-read; everything
--   student-scoped is gated by student_id=auth student or staff-sees-branch.
-- * WRITES to most tables go through the app's service-role client (RLS-bypassing), so
--   we only add the student self-writes the Hub session client actually performs
--   (lesson_progress insert/update, assessment_attempts update). Add more if Part D
--   moves any write off the service-role client.
-- =============================================================================
