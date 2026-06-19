# Part D — Hub repoint change-list (`software_development`)

> Scoped 2026-06-19 (analysis only, no code changed). The Hub app must be refactored to the
> unified LMS schema before/with the env repoint. **~370 edit sites across ~30 files.**
> All DB access is in `app/dashboard/**`, a few `app/{ev3,microbit,advasbot}/**` + `_components`,
> `lib/supabase/**`, `lib/lessonResources.ts`, `scripts/*.mjs`. No `.rpc()` in app code.

## Mapping rules (FROM Hub → TO unified)
- **Auth identity (rewrite, not rename):** Hub assumes one `users` table with `users.id = auth.uid()`.
  Unified: **student** = `students` row via `students.auth_id = auth.uid()`; **staff** = `users` row via
  `users.auth_id = auth.uid()` (`users.id` ≠ auth.uid()). Need a two-source resolver returning
  `{ id, role, branch_id, authUid }`.
- **Roles:** `school-admin`→`company_admin`, `school-teacher`→`instructor`, `super-admin`→`super_admin`;
  `school-student` = a `students` row (no `users.role`).
- `school_id` → `branch_id` (FK `branches`, not `schools`).
- Student owner col `user_id` → `student_id` on `lesson_progress`, `assessment_attempts`, `certificates`,
  `lesson_quiz_attempts`, `lesson_remarks`, `lesson_uploads`, `lesson_ratings`. **Staff cols stay**
  (`*_approved_by`, `marked_by`, `issued_by`, `unlocked_by`, `updated_by`, `created_by` → `users.id`).
  Update matching `onConflict` strings (`user_id,lesson_coordinate` → `student_id,lesson_coordinate`).
- `classes` → `course_slots`(`kind='class'`, `name`, `branch_id`, `teacher_in_charge`);
  `class_members` → `slot_students`(`slot_id`, `student_id`, `branch_id`); `onConflict "class_id,user_id"`→`"slot_id,student_id"`.
- Column name mismatches on `students`: Hub `full_name`→`students.name`; `verification_id`→`students.student_id`;
  `username` exists on both. Branch signature cols (`signature_path/signed_name/signed_position`) **already on `branches`** (A6).
- `certificates` table name confirmed (NOT `assessment_certificates`). Hard-coded embed
  `users!assessment_attempts_user_id_fkey` → `students!assessment_attempts_student_id_fkey`.

## Site counts
A env values 3 (+6 files use unchanged var names) · B auth/profile resolution ~31 · C `school_id`→`branch_id` ~90 ·
D student `user_id`→`student_id` ~55 (+7 onConflict; ~25 staff cols stay) · E classes/class_members ~30 ·
F schools→branches ~15 · G role literals ~90 · I rpc 0.

## Highest-risk files (do first)
1. `app/dashboard/actions.ts` — central `getCallerProfile`, all user CRUD, lesson_progress upserts, bulk import.
2. `app/dashboard/(authed)/layout.tsx` — gates every authed page (student resolution).
3. `app/dashboard/_components/Sidebar.tsx` — role union + per-route `roles` arrays.
4. `actions-assessment.ts`, `actions-certificates.ts` — student/staff cols, `certificates`, FK embed.
5. `actions-classes.ts` — classes/class_members → course_slots/slot_students.
6. `actions-remarks.ts`, `actions-uploads.ts` — dual student/staff columns + student-from-`users` lookups.
7. `(authed)/student-progress/page.tsx`, `students/page.tsx`, `assessment/certificates/page.tsx`.
8. `lib/supabase/*` + `.env.local` — repoint first (URL `https://kbzrdsxzzqzbxqgwpsuq.supabase.co`).

## ✅ PART D COMPLETE — VERIFIED 2026-06-19
Hub repointed to the LMS project + ~30 files refactored (2 subagent waves). Tested good on the
unified DB: login (both personas), lesson management, progress, assessment, certificates, public
lessons. Two test-time bugs fixed: (a) `getCaller` selected nonexistent `users.username` → derive
from email; (b) login built legacy `@advaspire-learning.com` → now tries `@staff.`/`@student.`/legacy.
Remaining follow-ups (non-blocking): student edit/reset/delete in `actions.ts` still target `users`
(provisioning is LMS-owned now); `assistant_admin` absent from the admins-page DB filter.

## Foundation — DONE (2026-06-19)
- **DB:** `get_current_student_id()` patched to resolve migrated students via `students.auth_id`
  (migration `unify_get_current_student_id_authid`) so `students_select` RLS grants student self-read.
  (`users_select` already allowed `auth_id = auth.uid()`.) The LMS already has `is_super_admin/
  is_branch_admin/is_instructor/get_current_user_branch_id` — reuse these (my B4 `app_*` fns are
  functional duplicates; leave for now).
- **Resolver:** `lib/supabase/caller.ts` → `getCaller()` (+ `isStaff/isAdmin/isSuperAdmin`). Two-source
  (staff `users.auth_id`, student `students.auth_id`). **Returns legacy Hub `role` strings** (maps
  `company_admin→school-admin`, `instructor→school-teacher`, `super/group_admin→super-admin`,
  student→`school-student`) → **eliminates ~90 role-literal edits**. Exposes `authUid` for auth.admin ops,
  `school_id`+`branch_id` (same value), `verification_id`=students.student_id, `full_name`=name.

## Open decisions (gate the coding)
1. ~~Resolver contract~~ — DONE (`lib/supabase/caller.ts`).
2a. **Provisioning — DECIDED: LMS owns it.** Remove/disable Hub `createSchool`, `createSchoolAdmin`,
   `createSchoolMember`, `bulkImportStudents` (+ their UI forms) and the `scripts/*.mjs` importers. Hub
   keeps content CRUD, progress/marking, certificates, reads.
2. ~~lesson_ratings~~ — RESOLVED: already migrated like its siblings (ETL).
3. **Provisioning ownership (PRODUCT DECISION):** Hub currently creates schools/admins/students/classes
   (`createSchool`, `createSchoolAdmin`, `createSchoolMember`, `bulkImportStudents`, `import-semenyih-certs.mjs`).
   In the unified model the **LMS is master** for students/branches. Do these Hub flows get rewritten to the
   unified tables, or **removed** (provisioning owned by the LMS app)?
4. **`course_slots.teacher_in_charge`** — class creation set `created_by`; decide created_by vs teacher_in_charge for `kind='class'`.
5. ~~branches signature columns~~ — RESOLVED: present on `branches` (A6).
6. **`students` shape** — confirm reads remap `full_name`→`name`, `verification_id`→`student_id`; `username`/password-reset email depend on `students.username`.
7. **auth-admin ops** — `actions.ts:104-118` updates `auth.admin.updateUserById(caller.id,…)`; must use raw `auth.uid()`, surfaced by the resolver.
8. **No root `middleware.ts` found** invoking `updateSession` — confirm dashboard auth-gating is wired.
