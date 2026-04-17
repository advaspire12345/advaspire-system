import { NextRequest, NextResponse } from 'next/server';
import { getSiblingPoolInfo } from '@/data/pools';
import { supabaseAdmin } from '@/db';

/**
 * GET /api/pools/check-sibling
 * Check if a parent has an existing sibling pool for a specific course
 *
 * Query params:
 * - parentId: The parent's ID
 * - courseId: The course ID to check
 * OR
 * - poolId: Direct pool ID lookup (for editing existing pooled student)
 *
 * Returns:
 * - hasPool: boolean
 * - poolInfo: pool details if exists (poolId, siblings, sessions, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const courseId = searchParams.get('courseId');
    const poolId = searchParams.get('poolId');
    const excludeStudentId = searchParams.get('excludeStudentId');

    // Direct pool lookup by poolId
    if (poolId) {
      const { getPoolInfoById } = await import('@/data/pools');
      const poolInfo = await getPoolInfoById(poolId);

      if (poolInfo) {
        return NextResponse.json({
          hasPool: true,
          poolInfo,
        });
      }

      return NextResponse.json({
        hasPool: false,
        poolInfo: null,
      });
    }

    if (!parentId || !courseId) {
      return NextResponse.json(
        { error: 'parentId and courseId (or poolId) are required' },
        { status: 400 }
      );
    }

    // Count total children under this parent FIRST — frontend uses this to show/hide shared button
    // Join with students to exclude soft-deleted students
    const { data: parentStudentsRaw } = await supabaseAdmin
      .from('parent_students')
      .select('student_id, student:students!inner(id, deleted_at)')
      .eq('parent_id', parentId);

    // Filter out soft-deleted students
    const parentStudents = (parentStudentsRaw ?? []).filter(
      (ps) => !(ps.student as unknown as { deleted_at: string | null })?.deleted_at
    );

    const parentChildCount = parentStudents?.length ?? 0;

    // If parent has no siblings to share with, return early
    // Edit mode (excludeStudentId set): current student is counted, so need > 1
    // Add mode (no excludeStudentId): new student not yet in DB, so need >= 1 existing child
    const minChildrenForSharing = excludeStudentId ? 2 : 1;
    if (parentChildCount < minChildrenForSharing) {
      return NextResponse.json({
        hasPool: false,
        hasSiblingInCourse: false,
        parentChildCount,
        siblings: [],
        siblingPackageInfo: null,
        poolInfo: null,
      });
    }

    // Get pool info if exists
    const poolInfo = await getSiblingPoolInfo(parentId, courseId);

    if (poolInfo && poolInfo.siblings.length > 0) {
      return NextResponse.json({
        hasPool: true,
        parentChildCount,
        poolInfo,
      });
    }
    // If pool exists but has no active members, continue to check sibling enrollments

    // No existing pool - check if parent has other children enrolled in this course

    if (!parentStudents || parentStudents.length === 0) {
      return NextResponse.json({
        hasPool: false,
        hasSiblingInCourse: false,
        parentChildCount,
        poolInfo: null,
      });
    }

    const studentIds = parentStudents.map(ps => ps.student_id);

    // Exclude the current student being edited so they don't count as their own sibling
    const siblingStudentIds = excludeStudentId
      ? studentIds.filter(id => id !== excludeStudentId)
      : studentIds;

    if (siblingStudentIds.length === 0) {
      return NextResponse.json({
        hasPool: false,
        hasSiblingInCourse: false,
        parentChildCount,
        siblings: [],
        siblingPackageInfo: null,
        poolInfo: null,
      });
    }

    // Check if any of these students are enrolled in this course (include package info)
    const { data: siblingEnrollments, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('id, student_id, package_id')
      .eq('course_id', courseId)
      .in('student_id', siblingStudentIds)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (enrollmentError) {
      console.error('Error fetching sibling enrollments:', enrollmentError);
    }

    const hasSiblingInCourse = (siblingEnrollments ?? []).length > 0;

    // Get sibling names for display
    let siblings: { studentId: string; studentName: string; enrollmentId: string }[] = [];
    let siblingPackageInfo: { packageId: string | null; packageType: string | null; packageDuration: number | null } | null = null;

    if (hasSiblingInCourse && siblingEnrollments) {
      // Fetch student names separately for reliability
      const siblingStudentIds = siblingEnrollments.map(e => e.student_id);
      const { data: studentsData } = await supabaseAdmin
        .from('students')
        .select('id, name')
        .in('id', siblingStudentIds);

      const studentMap = new Map((studentsData ?? []).map(s => [s.id, s.name]));

      siblings = siblingEnrollments.map(e => ({
        studentId: e.student_id,
        studentName: studentMap.get(e.student_id) || 'Unknown',
        enrollmentId: e.id,
      }));

      // Get the first sibling's package info for auto-selection
      const firstSiblingPackageId = siblingEnrollments[0]?.package_id;
      if (firstSiblingPackageId) {
        const { data: pricingData } = await supabaseAdmin
          .from('course_pricing')
          .select('id, package_type, duration')
          .eq('id', firstSiblingPackageId)
          .single();

        if (pricingData) {
          siblingPackageInfo = {
            packageId: pricingData.id,
            packageType: pricingData.package_type,
            packageDuration: pricingData.duration,
          };
        }
      }
    }

    return NextResponse.json({
      hasPool: false,
      hasSiblingInCourse,
      parentChildCount,
      siblings,
      siblingPackageInfo,
      poolInfo: null,
    });
  } catch (error) {
    console.error('Error checking sibling pool:', error);
    return NextResponse.json(
      { error: 'Failed to check sibling pool' },
      { status: 500 }
    );
  }
}
