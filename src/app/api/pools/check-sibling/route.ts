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

    // Get pool info if exists
    const poolInfo = await getSiblingPoolInfo(parentId, courseId);

    if (poolInfo) {
      return NextResponse.json({
        hasPool: true,
        poolInfo,
      });
    }

    // No existing pool - check if parent has other children enrolled in this course
    // This determines if we should show the "share sessions" option

    // Get all students linked to this parent
    const { data: parentStudents } = await supabaseAdmin
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parentId);

    if (!parentStudents || parentStudents.length === 0) {
      return NextResponse.json({
        hasPool: false,
        hasSiblingInCourse: false,
        poolInfo: null,
      });
    }

    const studentIds = parentStudents.map(ps => ps.student_id);

    // Check if any of these students are enrolled in this course (include package info)
    const { data: siblingEnrollments, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('id, student_id, package_id')
      .eq('course_id', courseId)
      .in('student_id', studentIds)
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
