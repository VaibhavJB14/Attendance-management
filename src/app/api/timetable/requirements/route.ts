import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');

    const whereClause: any = { tenantId: session.tenantId };
    if (grade) whereClause.grade = grade;
    if (section) whereClause.section = section;

    const requirements = await prisma.courseRequirement.findMany({
      where: whereClause,
      include: {
        teacher: {
          include: { user: { select: { email: true } } }
        }
      }
    });

    return NextResponse.json({ requirements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;
    
    // Requires Advanced or Pro for Timetable features (assuming PRO for now)
    await requirePlan(tenantId, 'PRO');

    const body = await request.json();
    const { grade, section, subject, periodsPerWeek, teacherId } = body;

    if (!grade || !section || !subject || !periodsPerWeek || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requirement = await prisma.courseRequirement.upsert({
      where: {
        tenantId_grade_section_subject: {
          tenantId,
          grade,
          section,
          subject
        }
      },
      update: {
        periodsPerWeek: parseInt(periodsPerWeek),
        teacherId
      },
      create: {
        tenantId,
        grade,
        section,
        subject,
        periodsPerWeek: parseInt(periodsPerWeek),
        teacherId
      }
    });

    return NextResponse.json({ success: true, requirement });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing requirement ID' }, { status: 400 });
    }

    await prisma.courseRequirement.delete({
      where: { id, tenantId: session.tenantId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
