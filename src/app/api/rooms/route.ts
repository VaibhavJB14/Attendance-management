import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const hostelName = searchParams.get('hostelName');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: Missing tenant ID' }, { status: 401 });
    }
    
    if (!hostelName) {
      return NextResponse.json({ error: 'hostelName is required' }, { status: 400 });
    }

    await requirePlan(tenantId, 'BASIC');

    // Fetch all rooms for this hostel
    const rooms = await prisma.room.findMany({
      where: {
        tenantId,
        hostelName
      },
      orderBy: {
        roomNumber: 'asc'
      }
    });

    // Fetch student count per room in this hostel
    const roomCounts = await prisma.student.groupBy({
      by: ['roomNumber'],
      where: {
        tenantId,
        hostelName,
        isHosteler: true,
        roomNumber: { not: null }
      },
      _count: {
        id: true
      }
    });

    const countMap = roomCounts.reduce((acc, curr) => {
      if (curr.roomNumber) {
        acc[curr.roomNumber] = curr._count.id;
      }
      return acc;
    }, {} as Record<string, number>);

    // Combine room data with occupancy
    const enrichedRooms = rooms.map(room => ({
      ...room,
      occupancy: countMap[room.roomNumber] || 0,
      isFull: (countMap[room.roomNumber] || 0) >= room.capacity
    }));

    return NextResponse.json({ success: true, rooms: enrichedRooms });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    await requirePlan(tenantId, 'BASIC');

    const body = await request.json();
    const { hostelName, roomNumber, capacity } = body;

    if (!hostelName || !roomNumber || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingRoom = await prisma.room.findFirst({
      where: {
        tenantId,
        hostelName,
        roomNumber
      }
    });

    if (existingRoom) {
      return NextResponse.json({ error: `Room ${roomNumber} already exists in ${hostelName}` }, { status: 400 });
    }

    const newRoom = await prisma.room.create({
      data: {
        tenantId,
        hostelName,
        roomNumber,
        capacity: parseInt(capacity, 10)
      }
    });

    return NextResponse.json({ success: true, room: newRoom });
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
    const tenantId = session.tenantId;
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    await requirePlan(tenantId, 'BASIC');

    // Make sure no students are assigned to this room before deleting
    // Or just clear the roomNumber for those students?
    // Let's just allow deleting, and we can unassign students if we want, but Prisma doesn't have cascading on the string field.
    // It's safer to prevent deletion if there are students, or we manually unassign them.
    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const studentsInRoom = await prisma.student.count({
      where: { tenantId, hostelName: room.hostelName, roomNumber: room.roomNumber, isHosteler: true }
    });

    if (studentsInRoom > 0) {
      return NextResponse.json({ error: `Cannot delete room. ${studentsInRoom} student(s) are currently assigned to it.` }, { status: 400 });
    }

    await prisma.room.delete({
      where: { id: roomId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
