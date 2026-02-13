import { supabaseAdmin } from "@/db";
import type { Trial, TrialInsert, TrialUpdate, TrialStatus } from "@/db/schema";
import { getUserByEmail } from "@/data/users";

// ============================================
// TYPES
// ============================================

export interface TrialRow {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  childName: string;
  childAge: number;
  branchId: string;
  branchName: string;
  courseId: string | null;
  courseName: string | null;
  source: string;
  scheduledDate: string;
  scheduledTime: string;
  message: string | null;
  status: string;
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getTrialsForTable(userEmail: string): Promise<TrialRow[]> {
  // Get user to check branch access
  const user = await getUserByEmail(userEmail);

  let query = supabaseAdmin
    .from("trials")
    .select(
      `
      id,
      parent_name,
      parent_phone,
      parent_email,
      child_name,
      child_age,
      branch_id,
      course_id,
      source,
      scheduled_date,
      scheduled_time,
      message,
      status,
      branch:branches(id, name),
      course:courses(id, name)
    `
    )
    .is("deleted_at", null)
    .order("scheduled_date", { ascending: false });

  // Filter by branch for branch_admin users
  if (user && user.role === "branch_admin" && user.branch_id) {
    query = query.eq("branch_id", user.branch_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trials:", error);
    return [];
  }

  return (data ?? []).map((trial) => {
    const branch = trial.branch as unknown as { id: string; name: string } | null;
    const course = trial.course as unknown as { id: string; name: string } | null;

    return {
      id: trial.id,
      parentName: trial.parent_name,
      parentPhone: trial.parent_phone,
      parentEmail: trial.parent_email,
      childName: trial.child_name,
      childAge: trial.child_age,
      branchId: trial.branch_id,
      branchName: branch?.name ?? "Unknown",
      courseId: trial.course_id,
      courseName: course?.name ?? null,
      source: trial.source,
      scheduledDate: trial.scheduled_date,
      scheduledTime: trial.scheduled_time,
      message: trial.message,
      status: trial.status,
    };
  });
}

export async function getTrialById(id: string): Promise<Trial | null> {
  const { data, error } = await supabaseAdmin
    .from("trials")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching trial:", error);
    return null;
  }

  return data;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createTrial(data: TrialInsert): Promise<Trial | null> {
  const { data: trial, error } = await supabaseAdmin
    .from("trials")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error creating trial:", error);
    return null;
  }

  return trial;
}

export async function updateTrial(
  id: string,
  data: TrialUpdate
): Promise<Trial | null> {
  const { data: trial, error } = await supabaseAdmin
    .from("trials")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating trial:", error);
    return null;
  }

  return trial;
}

export async function updateTrialStatus(
  id: string,
  status: TrialStatus
): Promise<Trial | null> {
  return updateTrial(id, { status });
}

export async function softDeleteTrial(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("trials")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error soft deleting trial:", error);
    return false;
  }

  return true;
}
