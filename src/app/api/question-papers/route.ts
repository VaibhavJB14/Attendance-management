import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email },
      include: { teacherProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // 'admin' or 'teacher'

    if (role === 'admin' && (user.role === 'SYSTEM_ADMIN' || user.role === 'SCHOOL_ADMIN')) {
      const requests = await prisma.questionPaperRequest.findMany({
        where: { tenantId: user.tenantId },
        include: {
          teacher: {
            include: { user: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(requests);
    } 
    
    if (role === 'teacher' && user.teacherProfile) {
      const requests = await prisma.questionPaperRequest.findMany({
        where: { 
          tenantId: user.tenantId,
          teacherId: user.teacherProfile.id
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(requests);
    }

    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  } catch (error) {
    console.error('Error fetching question paper requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email },
      include: { teacherProfile: true },
    });

    if (!user || !user.teacherProfile) {
      return NextResponse.json({ error: 'Only teachers can submit papers' }, { status: 403 });
    }

    const body = await request.json();
    const { subject, examName, fileUrl, notes } = body;

    if (!subject || !examName) {
      return NextResponse.json({ error: 'Subject and Exam Name are required' }, { status: 400 });
    }

    const requestData = await prisma.questionPaperRequest.create({
      data: {
        tenantId: user.tenantId,
        teacherId: user.teacherProfile.id,
        subject,
        examName,
        fileUrl,
        notes,
      },
    });

    return NextResponse.json(requestData, { status: 201 });
  } catch (error) {
    console.error('Error creating question paper request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
