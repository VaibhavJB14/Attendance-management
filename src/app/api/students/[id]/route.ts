export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId || request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePlan(tenantId, 'BASIC');

    const { id: studentId } = await props.params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, gender, grade, section, rollNumber, parentPhone, isHosteler, hostelName, roomNumber } = body;

    // Verify the student belongs to the tenant
    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId
      }
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (isHosteler && hostelName && roomNumber) {
      // Check room capacity
      const room = await prisma.room.findFirst({
        where: { tenantId, hostelName, roomNumber }
      });
      if (room) {
        const currentOccupants = await prisma.student.count({
          where: { tenantId, hostelName, roomNumber, isHosteler: true }
        });
        if (currentOccupants >= room.capacity && existingStudent.roomNumber !== roomNumber) {
          return NextResponse.json({ error: `Room ${roomNumber} is at full capacity.` }, { status: 400 });
        }
      }
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (gender !== undefined) updateData.gender = gender;
    if (grade !== undefined) updateData.grade = grade;
    if (section !== undefined) updateData.section = section;
    if (rollNumber !== undefined) updateData.rollNumber = rollNumber;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone;
    if (isHosteler !== undefined) {
      updateData.isHosteler = isHosteler;
      updateData.hostelName = isHosteler ? (hostelName !== undefined ? hostelName : existingStudent.hostelName) : null;
      updateData.roomNumber = isHosteler ? (roomNumber !== undefined ? roomNumber : existingStudent.roomNumber) : null;
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId
      },
      data: updateData
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const tenantId = session?.tenantId || request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePlan(tenantId, 'BASIC');

    const { id: studentId } = await props.params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    await prisma.student.deleteMany({
      where: {
        id: studentId,
        tenantId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

