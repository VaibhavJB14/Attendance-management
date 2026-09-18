import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Fetch students
    const students = await prisma.student.findMany({
      where: { tenantId },
      include: {
        parent: {
          include: {
            user: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    // Fetch parent users
    const parents = await prisma.user.findMany({
      where: { tenantId, role: 'PARENT' },
      select: { id: true, email: true }
    });

    return NextResponse.json({ success: true, students, parents });
  } catch (error: any) {
    console.error('API Error:', error);
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
    const body = await request.json();
    const { studentId, parentId } = body;

    if (!studentId || !parentId) {
      return NextResponse.json({ error: 'Missing studentId or parentId' }, { status: 400 });
    }

    // Verify student belongs to tenant
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Student not found or unauthorized' }, { status: 404 });
    }

    // Update student with parent ID
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { parentId }
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
