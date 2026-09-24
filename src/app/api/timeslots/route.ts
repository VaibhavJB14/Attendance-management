import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const timeslots = await prisma.timeslot.findMany({
      where: { tenantId },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json({ timeslots });
  } catch (error: any) {
    console.error('Error fetching timeslots:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startTime, endTime } = await request.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'start time and end time are required' }, { status: 400 });
    }

    const newSlot = await prisma.timeslot.create({
      data: {
        tenantId: session.tenantId,
        startTime,
        endTime
      }
    });

    return NextResponse.json(newSlot, { status: 201 });
  } catch (error: any) {
    console.error('Error creating timeslot:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This time slot already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.timeslot.delete({
      where: { id, tenantId: session.tenantId }
    });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting timeslot:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
