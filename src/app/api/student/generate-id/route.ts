import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/db';

/**
 * GET /api/student/generate-id?branchId=xxx
 * Generate the next student ID in format ADV-{branchCode}-{YY}{seq}
 * e.g., ADV-001-26001 for first student in branch 001 in 2026
 */
export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId');

    // Get branch code
    let branchCode = "000";
    if (branchId) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('code')
        .eq('id', branchId)
        .single();
      if (branch?.code) {
        branchCode = branch.code;
      }
    }

    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // e.g., "26" for 2026
    const prefix = `ADV-${branchCode}-${yearSuffix}`;

    // Find the highest student_id matching this prefix
    const { data: latestStudent, error } = await supabaseAdmin
      .from('students')
      .select('student_id')
      .like('student_id', `${prefix}%`)
      .order('student_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest student ID:', error);
      return NextResponse.json({ studentId: `${prefix}001` });
    }

    if (!latestStudent?.student_id) {
      // First student with this prefix
      return NextResponse.json({ studentId: `${prefix}001` });
    }

    // Extract the sequence number and increment
    const latestId = latestStudent.student_id;
    const sequenceStr = latestId.slice(-3); // Last 3 digits
    const nextSequence = parseInt(sequenceStr, 10) + 1;
    const nextSequenceStr = nextSequence.toString().padStart(3, '0');

    return NextResponse.json({ studentId: `${prefix}${nextSequenceStr}` });
  } catch (error) {
    console.error('Error generating student ID:', error);
    return NextResponse.json(
      { error: 'Failed to generate student ID' },
      { status: 500 }
    );
  }
}
