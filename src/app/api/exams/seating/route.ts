import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require Pro plan or at least check they are admin/teacher.
    // For now just basic plan is fine, but they must be admin
    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { grades, sections, numClassrooms, benchesPerClassroom, studentsPerBench } = body;

    if (!grades || !sections || !numClassrooms || !benchesPerClassroom || !studentsPerBench) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where: {
        tenantId: session.tenantId,
        grade: { in: grades },
        section: { in: sections }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
        grade: true,
        section: true
      }
    });

    if (students.length === 0) {
      return NextResponse.json({ error: 'No students found matching the criteria' }, { status: 404 });
    }

    const totalCapacity = numClassrooms * benchesPerClassroom * studentsPerBench;
    if (students.length > totalCapacity) {
      return NextResponse.json({ 
        error: `Insufficient capacity. You have ${students.length} students but only ${totalCapacity} seats available.`
      }, { status: 400 });
    }

    // Shuffle students for randomization (Fisher-Yates)
    const shuffledStudents = [...students];
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }

    const seatingArrangement = [];
    let studentIndex = 0;

    for (let c = 1; c <= numClassrooms; c++) {
      for (let b = 1; b <= benchesPerClassroom; b++) {
        for (let s = 1; s <= studentsPerBench; s++) {
          if (studentIndex >= shuffledStudents.length) {
            break;
          }

          const student = shuffledStudents[studentIndex];
          seatingArrangement.push({
            studentId: student.id,
            name: `${student.firstName} ${student.lastName}`,
            rollNumber: student.rollNumber || 'N/A',
            grade: student.grade,
            section: student.section,
            classroom: `Room ${c}`,
            bench: `Bench ${b}`,
            seatPosition: s // e.g., Seat 1, Seat 2 on that bench
          });
          
          studentIndex++;
        }
        if (studentIndex >= shuffledStudents.length) break;
      }
      if (studentIndex >= shuffledStudents.length) break;
    }

    return NextResponse.json({ success: true, arrangement: seatingArrangement });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
