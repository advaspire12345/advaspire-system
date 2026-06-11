import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/db";
import { createTrial } from "@/data/trial";

/**
 * Public marketing trial-signup endpoint. No auth — anyone can submit.
 * Inserts a row into the existing `trials` table that admins see at
 * /trial. The branch_id is resolved from the company's HQ branch (or
 * the closest configured branch by city name) so the trial lands in
 * the right place even without a logged-in admin context.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      parent_name?: string;
      parent_phone?: string;
      parent_email?: string;
      child_name?: string;
      child_age?: number;
      branch?: string; // "semenyih" | "kepong"
      message?: string;
    };

    const required = ["parent_name", "parent_phone", "child_name", "child_age", "branch"] as const;
    for (const key of required) {
      if (!body[key]) {
        return NextResponse.json({ error: `Missing ${key}` }, { status: 400 });
      }
    }

    // Resolve branch_id. The frontend sends a slug ("semenyih" / "kepong");
    // we match by case-insensitive name fragment so a small typo / casing
    // mismatch doesn't fail the submission silently.
    const branchSlug = String(body.branch).trim().toLowerCase();
    const { data: branches } = await supabaseAdmin
      .from("branches")
      .select("id, name, city, type")
      .in("type", ["branch", "hq"])
      .is("deleted_at", null);
    const branch = (branches ?? []).find((b) =>
      [b.name, b.city].filter(Boolean).some((s) => s.toLowerCase().includes(branchSlug)),
    );
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    // Default scheduled date: 7 days out at 10:00 — admin re-schedules later.
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 7);
    const dateIso = scheduledDate.toISOString().slice(0, 10);

    const created = await createTrial({
      parent_name: body.parent_name!,
      parent_phone: body.parent_phone!,
      parent_email: body.parent_email || null,
      child_name: body.child_name!,
      child_age: Number(body.child_age),
      branch_id: branch.id,
      course_id: null,
      source: "website",
      scheduled_date: dateIso,
      scheduled_time: "10:00",
      message: body.message || null,
      status: "pending",
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to create trial" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, trial_id: created.id });
  } catch (err) {
    console.error("[marketing/trial-signup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
