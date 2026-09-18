import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id'); // Simulating logged-in user

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePlan(tenantId, 'BASIC');

    const body = await request.json();
    const { date, records, sessionName = "Morning (8-12)" } = body; 
    // records: { studentId: string, status: string }[]

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const attendanceDate = new Date(date);
    const currentHour = attendanceDate.getHours();

    // Time-based validation
    if (sessionName === "Morning (8-12)") {
      if (currentHour < 8 || currentHour >= 12) {
        return NextResponse.json({ error: 'Morning session attendance can only be marked between 8 AM and 12 PM.' }, { status: 400 });
      }
    } else if (sessionName === "Afternoon (12-3)") {
      if (currentHour < 12 || currentHour >= 15) {
        return NextResponse.json({ error: 'Afternoon session attendance can only be marked between 12 PM and 3 PM.' }, { status: 400 });
      }
    } else if (sessionName === "Evening (3-6)") {
      if (currentHour < 15 || currentHour >= 18) {
        return NextResponse.json({ error: 'Evening session attendance can only be marked between 3 PM and 6 PM.' }, { status: 400 });
      }
    }

    // Create attendance records efficiently using createMany
    const results = await prisma.attendance.createMany({
      data: records.map((record) => ({
        studentId: record.studentId,
        date: attendanceDate,
        sessionName: sessionName,
        status: record.status,
        recordedBy: userId,
      }))
    });

    // Queue SMS Sending for ABSENT students
    const absentRecords = records.filter(r => r.status === 'ABSENT');
    let messagesSent = 0;
    const sentLogs: string[] = [];

    if (absentRecords.length > 0) {
      // Fetch details of absent students to get phone numbers
      const absentStudentIds = absentRecords.map(r => r.studentId);
      const studentsToNotify = await prisma.student.findMany({
        where: {
          id: { in: absentStudentIds },
          tenantId // safety check
        }
      });

      const sendAfter = new Date(Date.now() + 30 * 60 * 1000);
      const notificationsData = [];

      for (const student of studentsToNotify) {
        if (student.parentPhone) {
          const message = `Your child ${student.firstName} ${student.lastName} of ${student.grade} - ${student.section} has not attended the ${sessionName}.`;
          
          notificationsData.push({
            tenantId,
            studentId: student.id,
            date: attendanceDate,
            sessionName,
            message,
            sendAfter
          });
          
          messagesSent++;
          sentLogs.push(`Queued for ${student.firstName}'s parent (${student.parentPhone})`);
        } else {
          console.warn(`[SMS WARNING] Cannot queue SMS for ${student.firstName} ${student.lastName} - No parent phone number on file.`);
        }
      }

      if (notificationsData.length > 0) {
        await prisma.notificationQueue.createMany({
          data: notificationsData
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.count,
      smsSentCount: messagesSent,
      smsLogs: sentLogs
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    await requirePlan(tenantId, 'BASIC');

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const studentId = searchParams.get('studentId');
    const sessionName = searchParams.get('sessionName');
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');

    const whereClause: any = { 
      student: { tenantId } // Ensure we only fetch attendance for students in this tenant
    };

    if (grade || section) {
      if (grade) whereClause.student.grade = grade;
      if (section) whereClause.student.section = section;
    }

    if (sessionName) {
      whereClause.sessionName = sessionName;
    }

    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    }

    if (studentId) {
      whereClause.studentId = studentId;
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: { firstName: true, lastName: true, grade: true, section: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ attendance });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
