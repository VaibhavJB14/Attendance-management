export const dynamic = 'force-dynamic';
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

    const timetables = await prisma.timetable.findMany({
      where: whereClause,
      include: {
        teacher: {
          include: { user: { select: { email: true } } }
        },
        room: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({ timetables });
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

    const body = await request.json();
    const { grade, section, dayOfWeek, startTime, endTime, subject, teacherId, force } = body;

    if (!grade || !section || !dayOfWeek || !startTime || !endTime || !subject || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const day = parseInt(dayOfWeek, 10);
    if (isNaN(day)) {
       return NextResponse.json({ error: 'dayOfWeek must be a valid number' }, { status: 400 });
    }

    // Check for overlaps unless forced
    if (!force) {
      // Check if teacher is busy
      const teacherBusy = await prisma.timetable.findFirst({
        where: { tenantId: session.tenantId, teacherId, dayOfWeek: day, startTime }
      });
      
      if (teacherBusy) {
        return NextResponse.json({ 
          error: 'Teacher is already scheduled for another class at this time.',
          conflict: true
        }, { status: 409 });
      }

      // Check if the class already has a period
      const classBusy = await prisma.timetable.findFirst({
        where: { tenantId: session.tenantId, grade, section, dayOfWeek: day, startTime }
      });

      if (classBusy) {
        return NextResponse.json({ 
          error: 'This class already has a subject scheduled at this time.',
          conflict: true
        }, { status: 409 });
      }
    }



    const timetable = await prisma.timetable.create({
      data: {
        tenantId: session.tenantId,
        grade,
        section,
        dayOfWeek: day,
        startTime,
        endTime,
        subject,
        teacherId
      }
    });

    return NextResponse.json({ timetable });
  } catch (error: any) {
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
      return NextResponse.json({ error: 'Timetable ID is required' }, { status: 400 });
    }

    await prisma.timetable.delete({
      where: { id, tenantId: session.tenantId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
