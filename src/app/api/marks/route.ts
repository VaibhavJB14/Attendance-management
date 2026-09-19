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

    // Plan restriction removed

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const examName = searchParams.get('examName');
    const subject = searchParams.get('subject');

    // First get the students
    const students = await prisma.student.findMany({
      where: {
        tenantId: session.tenantId,
        ...(grade && { grade }),
        ...(section && { section }),
      },
      select: { id: true, firstName: true, lastName: true, rollNumber: true }
    });

    const studentIds = students.map(s => s.id);

    // Then get the marks if specific exam/subject provided
    let marks: any[] = [];
    if (examName && subject) {
      marks = await prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
          examName,
          subject
        }
      });
    } else {
       // Return all marks for these students
       marks = await prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
        }
      });
    }

    return NextResponse.json({ success: true, students, marks });
  } catch (error: any) {
    console.error('Marks Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch marks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow TEACHER, SYSTEM_ADMIN, SCHOOL_ADMIN
    if (session.role === 'STUDENT' || session.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Plan restriction removed

    const body = await request.json();
    const { examName, examCategory, syllabusCoverage, subject, maxScore, records } = body;

    if (!examName || !examCategory || !subject || !maxScore || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const operations = records.map(record => {
      const recordSubject = record.subject || subject; // Fallback to top-level if not present
      const recordMaxScore = record.maxScore || maxScore;
      return prisma.mark.findFirst({
        where: {
          studentId: record.studentId,
          examName: examName,
          subject: recordSubject
        }
      }).then(existing => {
        if (existing) {
          return prisma.mark.update({
            where: { id: existing.id },
            data: { 
              score: Number(record.score), 
              maxScore: Number(recordMaxScore), 
              examCategory: examCategory,
              syllabusCoverage: syllabusCoverage,
              recordedAt: new Date() 
            }
          });
        } else {
          return prisma.mark.create({
            data: {
              studentId: record.studentId,
              examName: examName,
              examCategory: examCategory,
              syllabusCoverage: syllabusCoverage,
              subject: recordSubject,
              score: Number(record.score),
              maxScore: Number(recordMaxScore),
            }
          });
        }
      });
    });

    await Promise.all(operations);

    // Enqueue SMS notifications for parents
    const studentIds = records.map((r: any) => r.studentId);
    const studentsList = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true }
    });
    
    const studentMap = new Map(studentsList.map(s => [s.id, s]));

    const notifications = records.map((record: any) => {
      const student = studentMap.get(record.studentId);
      const studentName = student ? student.firstName : 'Student';
      const recordSubject = record.subject || subject;
      const recordMaxScore = record.maxScore || maxScore;
      const msg = `Dear Parent, ${studentName} scored ${record.score}/${recordMaxScore} in ${recordSubject} (${examName}).`;
      
      return prisma.notificationQueue.create({
        data: {
          tenantId: session.tenantId,
          studentId: record.studentId,
          date: new Date(),
          sessionName: 'Marks Update',
          message: msg,
          sendAfter: new Date(),
          status: 'PENDING'
        }
      });
    });

    await Promise.all(notifications);

    return NextResponse.json({ success: true, message: 'Marks updated successfully' });
  } catch (error: any) {
    console.error('Marks Save Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save marks' }, { status: 500 });
  }
}
