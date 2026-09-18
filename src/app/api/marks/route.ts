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
      return prisma.mark.findFirst({
        where: {
          studentId: record.studentId,
          examName: examName,
          subject: subject
        }
      }).then(existing => {
        if (existing) {
          return prisma.mark.update({
            where: { id: existing.id },
            data: { 
              score: Number(record.score), 
              maxScore: Number(maxScore), 
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
              subject: subject,
              score: Number(record.score),
              maxScore: Number(maxScore),
            }
          });
        }
      });
    });

    await Promise.all(operations);

    return NextResponse.json({ success: true, message: 'Marks updated successfully' });
  } catch (error: any) {
    console.error('Marks Save Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save marks' }, { status: 500 });
  }
}
