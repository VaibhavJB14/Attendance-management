export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await requirePlan(session.tenantId, 'ADVANCE');
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = {
      tenantId: session.tenantId
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const notifications = await prisma.notificationQueue.findMany({
      where: whereClause,
      include: {
        student: {
          select: { firstName: true, lastName: true, grade: true, section: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit for dashboard
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Notifications Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}
