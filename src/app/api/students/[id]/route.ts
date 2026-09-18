import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    await requirePlan(tenantId, 'BASIC');

    const { id: studentId } = await props.params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { isHosteler, hostelName, roomNumber } = body;

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

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId
      },
      data: {
        isHosteler: isHosteler !== undefined ? isHosteler : existingStudent.isHosteler,
        hostelName: isHosteler ? (hostelName || existingStudent.hostelName) : null,
        roomNumber: isHosteler ? (roomNumber || existingStudent.roomNumber) : null,
      }
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
