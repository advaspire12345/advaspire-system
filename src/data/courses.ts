import { supabaseAdmin } from "@/db";
import type { Course, Package } from "@/db/schema";

export interface CourseOption {
  id: string;
  name: string;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
}

export async function getAllCourses(): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return data ?? [];
}

export async function getCoursesByBranchId(branchId: string): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name")
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching courses by branch:", error);
    return [];
  }

  return data ?? [];
}

export async function getAllPackages(): Promise<PackageOption[]> {
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("id, name, price")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching packages:", error);
    return [];
  }

  return data ?? [];
}

export async function getCoursesAndPackages(): Promise<{
  courses: CourseOption[];
  packages: PackageOption[];
}> {
  const [courses, packages] = await Promise.all([
    getAllCourses(),
    getAllPackages(),
  ]);

  return { courses, packages };
}
