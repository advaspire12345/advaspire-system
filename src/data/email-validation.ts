import { supabaseAdmin } from "@/db";

export interface EmailCheckResult {
  exists: boolean;
  table: "students" | "parents" | "users" | null;
  id: string | null;
}

/**
 * Check if an email exists in any of the main tables (students, parents, users)
 * @param email - The email to check
 * @param excludeTable - Optional table to exclude from check (useful when updating)
 * @param excludeId - Optional ID to exclude from check (the record being updated)
 */
export async function checkEmailExists(
  email: string,
  excludeTable?: "students" | "parents" | "users",
  excludeId?: string
): Promise<EmailCheckResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check students table
  let studentQuery = supabaseAdmin
    .from("students")
    .select("id, email")
    .eq("email", normalizedEmail)
    .is("deleted_at", null);

  if (excludeTable === "students" && excludeId) {
    studentQuery = studentQuery.neq("id", excludeId);
  }

  const { data: studentData } = await studentQuery.maybeSingle();
  if (studentData) {
    return { exists: true, table: "students", id: studentData.id };
  }

  // Check parents table
  let parentQuery = supabaseAdmin
    .from("parents")
    .select("id, email")
    .eq("email", normalizedEmail)
    .is("deleted_at", null);

  if (excludeTable === "parents" && excludeId) {
    parentQuery = parentQuery.neq("id", excludeId);
  }

  const { data: parentData } = await parentQuery.maybeSingle();
  if (parentData) {
    return { exists: true, table: "parents", id: parentData.id };
  }

  // Check users table (team members, instructors, admins)
  let userQuery = supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", normalizedEmail)
    .is("deleted_at", null);

  if (excludeTable === "users" && excludeId) {
    userQuery = userQuery.neq("id", excludeId);
  }

  const { data: userData } = await userQuery.maybeSingle();
  if (userData) {
    return { exists: true, table: "users", id: userData.id };
  }

  return { exists: false, table: null, id: null };
}

/**
 * Get a user-friendly message for email conflict
 */
export function getEmailConflictMessage(table: "students" | "parents" | "users"): string {
  switch (table) {
    case "students":
      return "This email is already registered to a student";
    case "parents":
      return "This email is already registered to a parent";
    case "users":
      return "This email is already registered to a team member";
    default:
      return "This email is already in use";
  }
}
