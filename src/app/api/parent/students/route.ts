export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await requirePlan(session.tenantId, 'ADVANCE');
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    // Fetch the parent profile with nested students
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { id: session.id },
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            grade: true,
            section: true,
            rollNumber: true
          }
        }
      }
    });

    if (!parentProfile) {
      return NextResponse.json({ success: true, students: [] });
    }

    return NextResponse.json({ success: true, students: parentProfile.students });

  } catch (error: any) {
    console.error('Parent Students Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}
