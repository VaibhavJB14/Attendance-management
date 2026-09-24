export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    const whereClause: any = { tenantId: session.tenantId };
    
    if (dateStr) {
      const startDate = new Date(dateStr);
      startDate.setUTCHours(0, 0, 0, 0);
      
      const endDate = new Date(dateStr);
      endDate.setUTCHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startDate,
        lte: endDate
      };
    }

    // @ts-ignore
    const absences = await prisma.excusedAbsence.findMany({
      where: whereClause,
      include: {
        student: {
          select: { firstName: true, lastName: true, rollNumber: true, grade: true, section: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, absences });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, date, reason } = body;

    if (!studentId || !date) {
      return NextResponse.json({ error: 'Missing studentId or date' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    parsedDate.setUTCHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

    // @ts-ignore
    const existing = await prisma.excusedAbsence.findFirst({
      where: {
        tenantId: session.tenantId,
        studentId,
        date: {
          gte: new Date(parsedDate.setUTCHours(0,0,0,0)),
          lte: new Date(parsedDate.setUTCHours(23,59,59,999))
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Excused absence already exists for this date.' }, { status: 400 });
    }

    parsedDate.setUTCHours(12, 0, 0, 0);

    // @ts-ignore
    const absence = await prisma.excusedAbsence.create({
      data: {
        tenantId: session.tenantId,
        studentId,
        date: parsedDate,
        reason: reason || null
      }
    });

    return NextResponse.json({ success: true, absence });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // @ts-ignore
    await prisma.excusedAbsence.delete({
      where: {
        id,
        tenantId: session.tenantId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
