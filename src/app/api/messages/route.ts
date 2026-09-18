import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'TEACHER' && session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await request.json();
    const { studentId, message } = body;

    if (!studentId || !message) {
      return NextResponse.json({ error: 'Missing studentId or message' }, { status: 400 });
    }

    // Verify student belongs to tenant
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Student not found or unauthorized' }, { status: 404 });
    }

    // Add message to NotificationQueue
    const notification = await prisma.notificationQueue.create({
      data: {
        tenantId,
        studentId,
        date: new Date(),
        sessionName: 'Marks Update',
        message: message,
        sendAfter: new Date(),
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
