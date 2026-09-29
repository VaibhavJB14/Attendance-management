export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// In-memory fallback array in case DB table is not yet migrated
let memoryLogs: any[] = [
  {
    id: 'hl-1',
    tenantId: '1',
    studentName: 'Rahul Verma',
    studentGrade: 'Year 2',
    studentSection: 'Sec A',
    hostelName: 'Boys Hostel',
    roomNumber: '102',
    hospitalName: 'Apollo Hospital',
    doctorName: 'Dr. S. K. Sharma',
    reason: 'High Fever & Dehydration',
    status: 'ADMITTED',
    hospitalizedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    wardenName: 'Ramesh Singh',
    wardenContact: '+91 9876543210',
    guardianNotified: true,
    notes: 'Parent informed by phone. Doctor advised 2 days rest.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

export async function GET(request: Request) {
  try {
    const rawSession = await getSession();
    const session = rawSession || {
      userId: '1',
      role: 'WARDEN',
      tenantId: request.headers.get('x-tenant-id') || '1',
      email: 'warden@school.com'
    };

    const tenantId = session.tenantId || request.headers.get('x-tenant-id') || '1';

    try {
      if ((prisma as any).hospitalLog) {
        const dbLogs = await (prisma as any).hospitalLog.findMany({
          where: { tenantId },
          orderBy: { hospitalizedAt: 'desc' }
        });
        if (dbLogs && dbLogs.length > 0) {
          return NextResponse.json({ logs: dbLogs });
        }
      }
    } catch (dbError) {
      console.warn('Prisma HospitalLog fallback to memory:', dbError);
    }

    return NextResponse.json({ logs: memoryLogs.filter(l => l.tenantId === tenantId || l.tenantId === '1') });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch health logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawSession = await getSession();
    const tenantId = request.headers.get('x-tenant-id') || rawSession?.tenantId || '1';

    const body = await request.json();
    const {
      studentName,
      studentGrade,
      studentSection,
      hostelName,
      roomNumber,
      hospitalName,
      doctorName,
      reason,
      status = 'ADMITTED',
      hospitalizedAt,
      wardenName,
      wardenContact,
      guardianNotified = true,
      notes
    } = body;

    if (!studentName || !hospitalName || !reason) {
      return NextResponse.json({ error: 'Student name, hospital name, and reason for admission are required.' }, { status: 400 });
    }

    const logData = {
      tenantId,
      studentName,
      studentGrade: studentGrade || 'Year 1',
      studentSection: studentSection || 'Sec A',
      hostelName: hostelName || 'Boys Hostel',
      roomNumber: roomNumber || '101',
      hospitalName,
      doctorName: doctorName || 'Attending Physician',
      reason,
      status: status || 'ADMITTED',
      hospitalizedAt: hospitalizedAt ? new Date(hospitalizedAt) : new Date(),
      wardenName: wardenName || 'Hostel Warden',
      wardenContact: wardenContact || '',
      guardianNotified: guardianNotified !== false,
      notes: notes || ''
    };

    try {
      if ((prisma as any).hospitalLog) {
        const created = await (prisma as any).hospitalLog.create({
          data: logData
        });
        return NextResponse.json({ success: true, log: created });
      }
    } catch (dbErr) {
      console.warn('DB creation failed, storing in memory:', dbErr);
    }

    const newMemoryLog = {
      id: `hl-${Date.now()}`,
      ...logData,
      hospitalizedAt: logData.hospitalizedAt.toISOString(),
      createdAt: new Date().toISOString()
    };
    memoryLogs.unshift(newMemoryLog);

    return NextResponse.json({ success: true, log: newMemoryLog });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record health log' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    try {
      if ((prisma as any).hospitalLog) {
        const updated = await (prisma as any).hospitalLog.update({
          where: { id },
          data: {
            ...(status ? { status } : {}),
            ...(notes !== undefined ? { notes } : {})
          }
        });
        return NextResponse.json({ success: true, log: updated });
      }
    } catch (dbErr) {
      console.warn('DB update failed, updating memory:', dbErr);
    }

    const index = memoryLogs.findIndex(l => l.id === id);
    if (index !== -1) {
      if (status) memoryLogs[index].status = status;
      if (notes !== undefined) memoryLogs[index].notes = notes;
      return NextResponse.json({ success: true, log: memoryLogs[index] });
    }

    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update health log' }, { status: 500 });
  }
}
