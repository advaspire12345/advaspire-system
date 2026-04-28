import { supabaseAdmin } from "@/db";
import type { Trial, TrialInsert, TrialUpdate, TrialStatus } from "@/db/schema";

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
  // Get user's branch access — resolve company IDs to child HQ/branch IDs
  const { getUserBranchIds, getUserByEmail, isSuperAdmin } = await import("./users");
  let branchIds = await getUserBranchIds(userEmail);
  const currentUser = await getUserByEmail(userEmail);
  const useCityName = !(isSuperAdmin(userEmail) || currentUser?.role === "super_admin");

  // Only expand company IDs for admin role, NOT branch_admin/instructor
  if (branchIds && branchIds.length > 0 && currentUser?.role === "group_admin") {
    const { data: assigned } = await supabaseAdmin
      .from("branches")
      .select("id, type, parent_id")
      .in("id", branchIds)
      .is("deleted_at", null);

    const companyIds = new Set<string>();
    for (const b of assigned ?? []) {
      if (b.type === "company") companyIds.add(b.id);
      else if (b.parent_id) companyIds.add(b.parent_id);
    }

    if (companyIds.size > 0) {
      const { data: children } = await supabaseAdmin
        .from("branches")
        .select("id")
        .in("parent_id", [...companyIds])
        .in("type", ["hq", "branch"])
        .is("deleted_at", null);
      branchIds = (children ?? []).map((b) => b.id);
    }
  }

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
      branch:branches(id, name, city),
      course:courses(id, name)
    `
    )
    .is("deleted_at", null)
    .order("scheduled_date", { ascending: false });

  // Filter by branch
  if (branchIds) {
    query = query.in("branch_id", branchIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trials:", error);
    return [];
  }

  return (data ?? []).map((trial) => {
    const branch = trial.branch as unknown as { id: string; name: string; city: string | null } | null;
    const course = trial.course as unknown as { id: string; name: string } | null;

    return {
      id: trial.id,
      parentName: trial.parent_name,
      parentPhone: trial.parent_phone,
      parentEmail: trial.parent_email,
      childName: trial.child_name,
      childAge: trial.child_age,
      branchId: trial.branch_id,
      branchName: useCityName ? (branch?.city || branch?.name) ?? "Unknown" : branch?.name ?? "Unknown",
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

export async function getTrialByPhone(phone: string): Promise<TrialRow | null> {
  const { data, error } = await supabaseAdmin
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
    .eq("parent_phone", phone)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error checking phone:", error);
    return null;
  }

  const branch = data.branch as unknown as { id: string; name: string } | null;
  const course = data.course as unknown as { id: string; name: string } | null;

  return {
    id: data.id,
    parentName: data.parent_name,
    parentPhone: data.parent_phone,
    parentEmail: data.parent_email,
    childName: data.child_name,
    childAge: data.child_age,
    branchId: data.branch_id,
    branchName: branch?.name ?? "Unknown",
    courseId: data.course_id,
    courseName: course?.name ?? null,
    source: data.source,
    scheduledDate: data.scheduled_date,
    scheduledTime: data.scheduled_time,
    message: data.message,
    status: data.status,
  };
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
