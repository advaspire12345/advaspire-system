import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import { getUserByAuthId, getUserBranchIds } from "@/data/users";

// Rows whose student_name starts with this token are treated as template
// guidance and skipped during import.
const EXAMPLE_ROW_MARKER = "EXAMPLE";

function isExampleRow(row: Record<string, string>): boolean {
  const name = row.student_name?.trim().toUpperCase() ?? "";
  return name.startsWith(EXAMPLE_ROW_MARKER);
}

const VALID_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

function normalizeDay(s: string | undefined): string | null {
  if (!s) return null;
  const lower = s.trim().toLowerCase();
  return VALID_DAYS.has(lower) ? lower : null;
}

function normalizeTime(s: string | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  // Accept HH:MM or HH:MM:SS. Reject anything else.
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(m[1]).padStart(2, "0");
  const mm = m[2];
  const ss = m[3] ?? "00";
  return `${hh}:${mm}:${ss}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = (await request.json()) as {
      rows: Record<string, string>[];
    };

    const importer = await getUserByAuthId(user.id);
    if (!importer) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    // Pre-load: the set of branch ids the importer is allowed to write to.
    // null = unrestricted (super_admin / group_admin without branch assignment).
    const allowedBranchIds = await getUserBranchIds(user.email);

    // Pre-load: all non-deleted writeable branches by name (case-insensitive).
    // We need name → id and code lookups.
    const { data: allBranches } = await supabaseAdmin
      .from("branches")
      .select("id, name, code, type")
      .is("deleted_at", null);
    const branchByName = new Map<string, { id: string; code: string | null }>();
    for (const b of (allBranches ?? []) as { id: string; name: string; code: string | null; type: string }[]) {
      branchByName.set(b.name.trim().toLowerCase(), { id: b.id, code: b.code });
    }

    // Fallback branch when CSV row doesn't specify one — importer's own branch.
    const fallbackBranchId = importer.branch_id ?? null;

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Track (student, course) pairs whose sessions_remaining has already been
    // counted by an earlier row in this upload. When a user lists multiple
    // enrollment rows for the same student+course (different slots), they
    // typically write the same total sessions on each row — but the pool
    // would otherwise sum them and over-count. Force second+ rows to count
    // as 0 sessions toward the pool. First row wins.
    const sessionsCountedFor = new Set<string>();

    // Per-branch student-id sequence counter, lazily initialised on first row for a branch.
    const sequenceByPrefix = new Map<string, number>();

    async function nextStudentId(branchCode: string): Promise<string> {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `ADV-${branchCode}-${year}`;
      let seq = sequenceByPrefix.get(prefix);
      if (seq === undefined) {
        const { data: latest } = await supabaseAdmin
          .from("students")
          .select("student_id")
          .like("student_id", `${prefix}%`)
          .order("student_id", { ascending: false })
          .limit(1)
          .maybeSingle();
        seq = 1;
        if (latest?.student_id) {
          const lastSeq = parseInt(latest.student_id.slice(-3), 10);
          if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
      }
      sequenceByPrefix.set(prefix, seq + 1);
      return `${prefix}${seq.toString().padStart(3, "0")}`;
    }

    // Two-pass row order: process non-shared (individual) rows first, then
    // shared rows. This way a `share_with_sibling=true` row always finds its
    // sibling already in the DB regardless of CSV row order.
    // We keep the original row index so error messages match the user's file.
    const isShared = (r: Record<string, string>) => {
      const v = (r.share_with_sibling ?? "").trim().toLowerCase();
      return v === "true" || v === "yes" || v === "1" || v === "y";
    };
    const indexed = rows.map((row, i) => ({ row, originalIndex: i + 1 }));
    const ordered = [
      ...indexed.filter((x) => !isShared(x.row)),
      ...indexed.filter((x) => isShared(x.row)),
    ];

    for (const { row, originalIndex: rowIndex } of ordered) {
      if (isExampleRow(row)) {
        skipped++;
        continue;
      }

      try {
        // Validate required fields
        if (!row.student_name?.trim()) {
          throw new Error("student_name is required");
        }
        if (!row.parent_name?.trim()) {
          throw new Error("parent_name is required");
        }
        if (!row.parent_email?.trim()) {
          throw new Error("parent_email is required");
        }

        // Resolve branch: CSV branch_name takes priority; else importer's own.
        let branchId: string | null = null;
        let branchCode: string | null = null;
        const csvBranchName = row.branch_name?.trim();
        if (csvBranchName) {
          const match = branchByName.get(csvBranchName.toLowerCase());
          if (!match) {
            throw new Error(
              `branch_name "${csvBranchName}" not found — check spelling`,
            );
          }
          branchId = match.id;
          branchCode = match.code;
        } else if (fallbackBranchId) {
          branchId = fallbackBranchId;
          const { data: b } = await supabaseAdmin
            .from("branches")
            .select("code")
            .eq("id", fallbackBranchId)
            .single();
          branchCode = (b?.code as string | null) ?? null;
        } else {
          throw new Error(
            "branch_name is required (your account has no default branch)",
          );
        }

        // Authorization: non-super_admin must have access to the chosen branch.
        if (allowedBranchIds !== null && !allowedBranchIds.includes(branchId)) {
          throw new Error(
            `You are not allowed to import students into "${csvBranchName ?? branchId}"`,
          );
        }

        // Pre-validate share_with_sibling — if set, an existing sibling MUST
        // exist for (parent_email, program). We check now (before any inserts)
        // so a failing row doesn't leak a half-created student/parent row.
        // The actual pool join happens later, after the enrollment insert.
        const wantsShared = isShared(row);
        if (wantsShared) {
          if (!row.program_name?.trim()) {
            throw new Error(
              `share_with_sibling=true requires program_name (need the course to find the sibling's enrollment)`,
            );
          }
          const programNameCheck = row.program_name.trim();
          const { data: courseCheck } = await supabaseAdmin
            .from("courses")
            .select("id")
            .ilike("name", programNameCheck)
            .is("deleted_at", null)
            .maybeSingle();
          if (!courseCheck) {
            throw new Error(`program_name "${programNameCheck}" not found`);
          }
          const parentEmailCheck = row.parent_email.trim().toLowerCase();
          // Find the parent by email (may not exist yet — that's OK, it just
          // means no siblings can exist either, so we reject).
          const { data: parentCheck } = await supabaseAdmin
            .from("parents")
            .select("id")
            .ilike("email", parentEmailCheck)
            .is("deleted_at", null)
            .maybeSingle();
          if (!parentCheck) {
            // Two common reasons this hits:
            //   - The user filled parent_email with an example placeholder
            //     (e.g. aiman.parent@example.com) and no row in the system
            //     actually uses that address.
            //   - Every row for this parent has share_with_sibling=true, so
            //     nobody created the parent record yet. Need at least one
            //     "anchor" row with share_with_sibling blank/false.
            throw new Error(
              `share_with_sibling=true but no parent found for "${parentEmailCheck}". ` +
                `Make sure (a) the parent_email matches a real parent and isn't the example placeholder, and ` +
                `(b) at least one row for this parent has share_with_sibling BLANK (the "anchor" sibling — ` +
                `the others share with that one).`,
            );
          }
          // Look for an existing pool OR an existing individual sibling under
          // this parent + course. If neither exists, reject early.
          const { findSiblingPool } = await import("@/data/pools");
          const poolCheck = await findSiblingPool(parentCheck.id as string, courseCheck.id as string);
          if (!poolCheck) {
            // Two-step lookup: get all student_ids linked to this parent,
            // then check enrollments for any individual (pool_id=null) row in
            // the target course. PostgREST nested aliases were unreliable here.
            const { data: stuLinks } = await supabaseAdmin
              .from("parent_students")
              .select("student_id")
              .eq("parent_id", parentCheck.id);
            const siblingStudentIds = (stuLinks ?? [])
              .map((r) => r.student_id as string | null)
              .filter((id): id is string => !!id);
            let hasIndividualSibling = false;
            if (siblingStudentIds.length > 0) {
              const { count } = await supabaseAdmin
                .from("enrollments")
                .select("id", { count: "exact", head: true })
                .in("student_id", siblingStudentIds)
                .eq("course_id", courseCheck.id)
                .is("pool_id", null)
                .is("deleted_at", null);
              hasIndividualSibling = (count ?? 0) > 0;
            }
            if (!hasIndividualSibling) {
              throw new Error(
                `share_with_sibling=true but no existing individual sibling found for "${parentEmailCheck}" + "${programNameCheck}". Either add the sibling as an individual row in the same CSV (with share_with_sibling BLANK), or pre-create them in the system.`,
              );
            }
          }
        }

        // 1. Parent (lookup-or-create by email)
        const parentEmail = row.parent_email.trim().toLowerCase();
        const { data: existingParent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .ilike("email", parentEmail)
          .is("deleted_at", null)
          .maybeSingle();

        let parentId: string;
        if (existingParent) {
          parentId = existingParent.id as string;
        } else {
          const { data: newParent, error: parentError } = await supabaseAdmin
            .from("parents")
            .insert({
              name: row.parent_name.trim(),
              email: parentEmail,
              phone: row.parent_phone?.trim() || null,
              address: row.parent_address?.trim() || null,
              city: row.parent_city?.trim() || null,
            })
            .select("id")
            .single();

          if (parentError || !newParent) {
            throw new Error(`Failed to create parent: ${parentError?.message}`);
          }
          parentId = newParent.id as string;
        }

        // Parse `level` once — used on both student insert and enrollment
        // insert. Blank defaults to 1 (beginner).
        const levelRaw = row.level?.trim();
        let level = 1;
        if (levelRaw) {
          const parsed = parseInt(levelRaw, 10);
          if (isNaN(parsed) || parsed < 1) {
            throw new Error(`level "${levelRaw}" must be a positive integer`);
          }
          level = parsed;
        }

        // 2. Lookup-or-create the student. The dedup key here is
        // (name, branch, linked parent) — same student in the SAME CSV /
        // a re-uploaded one reuses the existing record so multiple enrollment
        // rows for one student don't create duplicate students.
        //   - csv student_id provided → must exist; bind to that record.
        //   - csv student_id blank → match by (name, branch, parent), or
        //     create a fresh student + parent_students link.
        // Whether the row results in success or skipped is decided later, at
        // the enrollment-dedup step.
        // Lookup-or-create student. Three paths:
        //   a) csv student_id filled and matches an existing record → reuse
        //   b) csv student_id filled and NOT in the DB → create the student
        //      using that exact ID (lets users migrate existing rosters with
        //      their own IDs, e.g. "ADV26025" from a previous system)
        //   c) csv student_id blank → name+parent+branch match → reuse;
        //      otherwise create with an auto-generated ID
        const csvStudentId = row.student_id?.trim();
        let studentRowId: string;
        let createdNewStudent = false;

        if (csvStudentId) {
          const { data: existingStu } = await supabaseAdmin
            .from("students")
            .select("id, name")
            .ilike("student_id", csvStudentId)
            .is("deleted_at", null)
            .maybeSingle();
          if (existingStu) {
            // ID match — confirm the NAME also matches. If not, the user
            // typed an ID that's already taken by someone else; silently
            // rebinding the row would be a confusing mistake.
            const dbName = (existingStu.name as string | null)?.trim().toLowerCase() ?? "";
            const csvName = row.student_name.trim().toLowerCase();
            if (dbName && csvName && dbName !== csvName) {
              throw new Error(
                `student_id "${csvStudentId}" already belongs to a different student ("${existingStu.name}"). ` +
                  `Leave the student_id column blank to create a new student (the system will assign an ID), or pick an unused value.`,
              );
            }
            studentRowId = existingStu.id as string;
          } else {
            // Create with the user-supplied custom ID.
            const { data: newStu, error: stuErr } = await supabaseAdmin
              .from("students")
              .insert({
                student_id: csvStudentId,
                name: row.student_name.trim(),
                date_of_birth: row.date_of_birth?.trim() || null,
                gender: row.gender?.trim().toLowerCase() || null,
                school_name: row.school_name?.trim() || null,
                branch_id: branchId,
                level,
                adcoin_balance: 0,
              })
              .select("id")
              .single();
            if (stuErr || !newStu) {
              // The common case: UNIQUE constraint on student_id when the ID
              // collides with someone in a different parent/branch.
              const detail = stuErr?.message?.includes("duplicate")
                ? ` — that student_id is already taken by another record. Pick a different value.`
                : ` — ${stuErr?.message ?? "unknown error"}`;
              throw new Error(`Failed to create student "${row.student_name}"${detail}`);
            }
            studentRowId = newStu.id as string;
            createdNewStudent = true;
          }
        } else {
          // Blank ID — reuse by (name, branch, parent) if possible; else
          // create with an auto-generated ID.
          const { data: existing } = await supabaseAdmin
            .from("students")
            .select("id, parent_students!inner(parent_id)")
            .ilike("name", row.student_name.trim())
            .eq("branch_id", branchId)
            .eq("parent_students.parent_id", parentId)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();
          if (existing) {
            studentRowId = existing.id as string;
          } else {
            const studentIdValue = await nextStudentId(branchCode ?? "000");
            const { data: newStudent, error: studentError } = await supabaseAdmin
              .from("students")
              .insert({
                student_id: studentIdValue,
                name: row.student_name.trim(),
                date_of_birth: row.date_of_birth?.trim() || null,
                gender: row.gender?.trim().toLowerCase() || null,
                school_name: row.school_name?.trim() || null,
                branch_id: branchId,
                level,
                adcoin_balance: 0,
              })
              .select("id")
              .single();
            if (studentError || !newStudent) {
              throw new Error(`Failed to create student: ${studentError?.message}`);
            }
            studentRowId = newStudent.id as string;
            createdNewStudent = true;
          }
        }

        // Insert the parent_students link only if the student was just created
        // (existing students already have their parent link from a prior import).
        if (createdNewStudent) {
          await supabaseAdmin.from("parent_students").insert({
            parent_id: parentId,
            student_id: studentRowId,
            relationship: "parent",
          });
        }
        // Alias used by the existing enrollment / pool blocks below.
        const newStudent = { id: studentRowId };

        // 5. Optional enrollment
        if (row.program_name?.trim()) {
          const programName = row.program_name.trim();
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id")
            .ilike("name", programName)
            .is("deleted_at", null)
            .maybeSingle();

          if (!course) {
            throw new Error(`program_name "${programName}" not found`);
          }

          // Resolve package (optional but recommended)
          let packageId: string | null = null;
          const packageType = row.package_type?.trim().toLowerCase();
          const packageDurationRaw = row.package_duration?.trim();
          if (packageType && packageDurationRaw) {
            const duration = parseInt(packageDurationRaw, 10);
            if (isNaN(duration)) {
              throw new Error(
                `package_duration "${packageDurationRaw}" is not a number`,
              );
            }
            const { data: pricing } = await supabaseAdmin
              .from("course_pricing")
              .select("id")
              .eq("course_id", course.id)
              .eq("package_type", packageType)
              .eq("duration", duration)
              .is("deleted_at", null)
              .maybeSingle();
            if (!pricing) {
              throw new Error(
                `No package matching package_type="${packageType}" + package_duration=${duration} for "${programName}"`,
              );
            }
            packageId = pricing.id as string;
          }

          // Schedule
          const day = normalizeDay(row.schedule_day);
          const time = normalizeTime(row.schedule_time);
          if (row.schedule_day?.trim() && !day) {
            throw new Error(
              `schedule_day "${row.schedule_day}" is invalid — use monday/tuesday/.../sunday`,
            );
          }
          if (row.schedule_time?.trim() && !time) {
            throw new Error(
              `schedule_time "${row.schedule_time}" is invalid — use HH:MM (24-hour)`,
            );
          }

          const enrollmentStatus = row.enrollment_status?.trim().toLowerCase() || "active";
          const sessionsRemainingRaw = row.sessions_remaining?.trim();
          let sessionsRemaining = sessionsRemainingRaw
            ? parseInt(sessionsRemainingRaw, 10)
            : 0;
          if (sessionsRemainingRaw && isNaN(sessionsRemaining)) {
            throw new Error(
              `sessions_remaining "${sessionsRemainingRaw}" is not a number`,
            );
          }

          // If we've already counted sessions for this (student, course)
          // earlier in this upload, force this row to contribute 0. Otherwise
          // a multi-slot entry (e.g. "Lego EV3 Sat 14:00" + "Lego EV3 Sat 16:00"
          // for the same student, both with sessions=3) would double-count
          // when the pool absorbs each enrollment's leftover.
          const groupKey = `${newStudent.id}|${course.id}`;
          if (sessionsCountedFor.has(groupKey)) {
            sessionsRemaining = 0;
          } else {
            sessionsCountedFor.add(groupKey);
          }

          // Enrollment dedup — an exact (student, course, day, time) match
          // already in the DB means this row was already imported. Skip.
          // Different course OR different day/time creates a fresh enrollment
          // under the same student. This supports:
          //   - re-uploading the same file (idempotent)
          //   - one student, multiple programs (different course rows)
          //   - one student, same program, multiple weekly slots (different
          //     day/time rows)
          {
            let dupQuery = supabaseAdmin
              .from("enrollments")
              .select("id")
              .eq("student_id", newStudent.id)
              .eq("course_id", course.id)
              .is("deleted_at", null);
            dupQuery = day == null ? dupQuery.is("day_of_week", null) : dupQuery.eq("day_of_week", day);
            dupQuery = time == null ? dupQuery.is("start_time", null) : dupQuery.eq("start_time", time);
            const { data: existingEnr } = await dupQuery.limit(1).maybeSingle();
            if (existingEnr) {
              skipped++;
              continue;
            }
          }

          const { data: newEnrollment, error: enrollErr } = await supabaseAdmin
            .from("enrollments")
            .insert({
              student_id: newStudent.id,
              course_id: course.id,
              package_id: packageId,
              status: enrollmentStatus,
              sessions_remaining: sessionsRemaining,
              day_of_week: day,
              start_time: time,
              level,
            })
            .select("id")
            .single();
          if (enrollErr || !newEnrollment) {
            throw new Error(`Failed to create enrollment: ${enrollErr?.message}`);
          }

          // 6. Pool handling — if share_with_sibling=true, join (or create)
          //    the pool for (parent, course). The two-pass ordering above
          //    guarantees the sibling's individual enrollment is already in DB.
          if (isShared(row)) {
            const { findSiblingPool, createPoolWithSiblings, addStudentToPool } = await import("@/data/pools");

            // Look for an existing pool first.
            const existingPool = await findSiblingPool(parentId, course.id);
            if (existingPool) {
              const joined = await addStudentToPool(
                existingPool.id,
                newStudent.id,
                newEnrollment.id,
              );
              if (!joined) {
                throw new Error("Failed to add student to existing pool");
              }
            } else {
              // No pool yet — find the EARLIEST individual enrollment for any
              // student under this parent in this course. We do NOT exclude
              // the current student: their own prior individual enrollment is
              // a valid anchor (the case when share=true is set on a student's
              // second slot in the same course — both slots join the pool).
              // We also exclude the just-created enrollment so it doesn't pick
              // itself as the "other anchor".
              const { data: sibEnrollment } = await supabaseAdmin
                .from("enrollments")
                .select("id, student_id, students!inner(id, name)")
                .eq("course_id", course.id)
                .is("deleted_at", null)
                .neq("id", newEnrollment.id)
                .in("student_id",
                  (await supabaseAdmin
                    .from("parent_students")
                    .select("student_id")
                    .eq("parent_id", parentId))
                    .data?.map((r) => r.student_id as string) ?? []
                )
                .is("pool_id", null)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

              if (!sibEnrollment) {
                throw new Error(
                  `share_with_sibling=true but no existing individual sibling found for this parent + "${programName}". Make sure the sibling's row appears in the CSV (with share_with_sibling blank or false) — the import processes individuals first then shared.`,
                );
              }

              // Look up parent + course names for the pool name field.
              const { data: parentRow } = await supabaseAdmin
                .from("parents")
                .select("name")
                .eq("id", parentId)
                .single();

              const { data: courseRow } = await supabaseAdmin
                .from("courses")
                .select("name")
                .eq("id", course.id)
                .single();

              const pool = await createPoolWithSiblings(
                parentId,
                course.id,
                packageId,
                parentRow?.name ?? "Family",
                courseRow?.name ?? programName,
                { studentId: sibEnrollment.student_id as string, enrollmentId: sibEnrollment.id as string },
                { studentId: newStudent.id, enrollmentId: newEnrollment.id },
              );
              if (!pool) {
                throw new Error("Failed to create sibling pool");
              }
            }
          }
        }

        success++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Unknown error";
        const name = row.student_name?.trim();
        const label = name ? `Row ${rowIndex} (${name})` : `Row ${rowIndex}`;
        errors.push(`${label}: ${message}`);
      }
    }

    revalidatePath("/student");

    return NextResponse.json({ success, failed, skipped, errors });
  } catch (error) {
    console.error("Import students error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
