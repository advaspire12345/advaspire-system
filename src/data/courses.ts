import { supabaseAdmin } from "@/db";
import type { Course, Package, PricingPackageType } from "@/db/schema";

export interface CourseOption {
  id: string;
  name: string;
  numberOfLevels: number | null;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  courseId: string;
  packageType: PricingPackageType;
  duration: number;
}

export interface CoursePricingOption {
  id: string;
  courseId: string;
  packageType: PricingPackageType;
  price: number;
  duration: number;
  description: string | null;
  isDefault: boolean;
}

export interface CourseSlotOption {
  id: string;
  courseId: string;
  branchId: string;
  day: string;
  time: string;
  duration: number;
  limitStudent: number;
}

export async function getAllCourses(): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name, number_of_levels")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    numberOfLevels: c.number_of_levels,
  }));
}

export async function getCoursesByBranchId(branchId: string): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name, number_of_levels")
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching courses by branch:", error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    numberOfLevels: c.number_of_levels,
  }));
}

export async function getCoursesAndPackages(): Promise<{
  courses: CourseOption[];
  packages: PackageOption[];
}> {
  const [courses, coursePricing] = await Promise.all([
    getAllCourses(),
    getAllCoursePricing(),
  ]);

  // Convert course pricing to package options format
  const packages: PackageOption[] = coursePricing.map((p) => ({
    id: p.id,
    name: `${p.duration} ${p.packageType === 'monthly' ? 'Month' : 'Session'}${p.duration > 1 ? 's' : ''}`,
    price: p.price,
    courseId: p.courseId,
    packageType: p.packageType,
    duration: p.duration,
  }));

  return { courses, packages };
}

/**
 * Get all pricing options for all courses
 */
export async function getAllCoursePricing(): Promise<CoursePricingOption[]> {
  const { data, error } = await supabaseAdmin
    .from("course_pricing")
    .select("id, course_id, package_type, price, duration, description, is_default")
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("price");

  if (error) {
    console.error("Error fetching course pricing:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    courseId: p.course_id,
    packageType: p.package_type as PricingPackageType,
    price: p.price,
    duration: p.duration,
    description: p.description,
    isDefault: p.is_default,
  }));
}

/**
 * Get all course slots
 */
export async function getAllCourseSlots(): Promise<CourseSlotOption[]> {
  const { data, error } = await supabaseAdmin
    .from("course_slots")
    .select("id, course_id, branch_id, day, time, duration, limit_student")
    .is("deleted_at", null)
    .order("day")
    .order("time");

  if (error) {
    console.error("Error fetching course slots:", error);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    courseId: s.course_id,
    branchId: s.branch_id,
    day: s.day,
    time: s.time,
    duration: s.duration,
    limitStudent: s.limit_student,
  }));
}
