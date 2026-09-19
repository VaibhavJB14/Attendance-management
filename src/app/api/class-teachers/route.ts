export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const checkUser = searchParams.get('checkUser');

    // If checkUser is true, return if the CURRENT user is the class teacher for this grade/section
    if (checkUser === 'true') {
      if (!grade || !section) return NextResponse.json({ error: 'Missing grade or section' }, { status: 400 });
      
      const assignment = await prisma.classTeacherAssignment.findUnique({
        where: {
          tenantId_grade_section: {
            tenantId: session.tenantId,
            grade,
            section
          }
        }
      });
      
      const isClassTeacher = assignment?.teacherId === session.id;
      return NextResponse.json({ isClassTeacher });
    }

    // Otherwise return all assignments for admin
    if (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignments = await prisma.classTeacherAssignment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        teacher: {
          include: {
            user: { select: { email: true } }
          }
        }
      }
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Class Teacher Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { grade, section, teacherId } = body;

    if (!grade || !section || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure TeacherProfile exists to prevent foreign key constraint violations
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { id: teacherId }
    });

    if (!teacherProfile) {
      await prisma.teacherProfile.create({
        data: { id: teacherId }
      });
    }

    // Create or update the assignment
    const assignment = await prisma.classTeacherAssignment.upsert({
      where: {
        tenantId_grade_section: {
          tenantId: session.tenantId,
          grade,
          section
        }
      },
      update: { teacherId },
      create: {
        tenantId: session.tenantId,
        grade,
        section,
        teacherId
      }
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    console.error('Class Teacher Assign Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
