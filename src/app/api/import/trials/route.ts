import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/db";
import { getUserByAuthId, getUserBranchIds } from "@/data/users";

interface TrialRow {
  child_name: string;
  child_age: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  branch_name?: string;
  program_name?: string;
  source: string;
  scheduled_date: string;
  scheduled_time: string;
  status?: string;
  message?: string;
}

const VALID_SOURCES = new Set([
  "walk_in", "phone", "online", "referral", "social_media",
  "website", "facebook", "google", "tiktok", "xhs", "youtube",
  "instagram", "other",
]);
const VALID_STATUSES = new Set([
  "pending", "confirmed", "completed", "cancelled", "no_show", "converted",
]);

function normalizeTime(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const importer = await getUserByAuthId(user.id);
    if (!importer) {
      return NextResponse.json({ error: "User profile not found" }, { status: 401 });
    }

    const { rows } = (await request.json()) as { rows: Record<string, string>[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const allowedBranchIds = await getUserBranchIds(user.email);

    // Pre-load branches by name for resolution.
    const { data: allBranches } = await supabaseAdmin
      .from("branches")
      .select("id, name, type")
      .is("deleted_at", null);
    const branchByName = new Map<string, string>();
    for (const b of (allBranches ?? []) as { id: string; name: string; type: string }[]) {
      if (b.type !== "company") branchByName.set(b.name.trim().toLowerCase(), b.id);
    }

    const fallbackBranchId = importer.branch_id ?? null;

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown as TrialRow;
      const rowIndex = i + 1;

      if ((row.child_name ?? "").trim().toUpperCase().startsWith("EXAMPLE")) {
        skipped++;
        continue;
      }

      try {
        // Required fields
        if (!row.child_name?.trim()) throw new Error("child_name is required");
        if (!row.parent_name?.trim()) throw new Error("parent_name is required");
        if (!row.parent_phone?.trim()) throw new Error("parent_phone is required");
        if (!row.child_age?.trim()) throw new Error("child_age is required");
        if (!row.source?.trim()) throw new Error("source is required");
        if (!row.scheduled_date?.trim()) throw new Error("scheduled_date is required");
        if (!row.scheduled_time?.trim()) throw new Error("scheduled_time is required");

        const childAge = parseInt(row.child_age.trim(), 10);
        if (isNaN(childAge) || childAge < 0 || childAge > 100) {
          throw new Error(`child_age "${row.child_age}" must be a number 0–100`);
        }

        const source = row.source.trim().toLowerCase();
        if (!VALID_SOURCES.has(source)) {
          throw new Error(
            `Invalid source "${row.source}" — use one of: ${Array.from(VALID_SOURCES).join(", ")}`,
          );
        }

        const status = (row.status?.trim().toLowerCase() || "pending");
        if (!VALID_STATUSES.has(status)) {
          throw new Error(
            `Invalid status "${row.status}" — use one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          );
        }

        const time = normalizeTime(row.scheduled_time);
        if (!time) {
          throw new Error(`scheduled_time "${row.scheduled_time}" is invalid — use HH:MM (24-hour)`);
        }

        // Resolve branch
        let branchId: string | null = null;
        const csvBranchName = row.branch_name?.trim();
        if (csvBranchName) {
          branchId = branchByName.get(csvBranchName.toLowerCase()) ?? null;
          if (!branchId) {
            throw new Error(`branch_name "${csvBranchName}" not found — check spelling`);
          }
        } else if (fallbackBranchId) {
          branchId = fallbackBranchId;
        } else {
          throw new Error("branch_name is required (your account has no default branch)");
        }

        // Authorization
        if (allowedBranchIds !== null && !allowedBranchIds.includes(branchId)) {
          throw new Error(
            `You are not allowed to import trials into "${csvBranchName ?? branchId}"`,
          );
        }

        // Resolve course (optional)
        let courseId: string | null = null;
        if (row.program_name?.trim()) {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id")
            .ilike("name", row.program_name.trim())
            .is("deleted_at", null)
            .maybeSingle();
          if (!course) {
            throw new Error(`program_name "${row.program_name}" not found`);
          }
          courseId = course.id;
        }

        // Dedup — same trial booking (child + parent_phone + branch + slot) is a dup.
        const { data: existing } = await supabaseAdmin
          .from("trials")
          .select("id")
          .ilike("child_name", row.child_name.trim())
          .eq("parent_phone", row.parent_phone.trim())
          .eq("branch_id", branchId)
          .eq("scheduled_date", row.scheduled_date.trim())
          .eq("scheduled_time", time)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        const { error: insertError } = await supabaseAdmin
          .from("trials")
          .insert({
            child_name: row.child_name.trim(),
            child_age: childAge,
            parent_name: row.parent_name.trim(),
            parent_phone: row.parent_phone.trim(),
            parent_email: row.parent_email?.trim() || null,
            branch_id: branchId,
            course_id: courseId,
            source,
            scheduled_date: row.scheduled_date.trim(),
            scheduled_time: time,
            status,
            message: row.message?.trim() || null,
            created_by: importer.id,
          });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        success++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Unknown error";
        const name = row.child_name?.trim();
        const label = name ? `Row ${rowIndex} (${name})` : `Row ${rowIndex}`;
        errors.push(`${label}: ${message}`);
      }
    }

    revalidatePath("/trials");

    return NextResponse.json({ success, failed, skipped, errors });
  } catch (error) {
    console.error("Import trials error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
