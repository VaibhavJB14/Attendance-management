import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email },
    });

    if (!user || (user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Only admins can approve or reject papers' }, { status: 403 });
    }

    const body = await request.json();
    const { status, feedback } = body; // status can be "APPROVED", "REJECTED", "PENDING"

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updatedRequest = await prisma.questionPaperRequest.update({
      where: { id },
      data: {
        status,
        feedback: feedback || null,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating question paper request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.email },
    });

    if (!user || (user.role !== 'SYSTEM_ADMIN' && user.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.questionPaperRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question paper request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
