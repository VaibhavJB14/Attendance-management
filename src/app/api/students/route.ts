import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requirePlan } from '@/lib/featureGuard';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    // In a real app, this comes from the decoded JWT session token
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: Missing tenant ID' }, { status: 401 });
    }

    // Verify the tenant has at least the BASIC plan
    await requirePlan(tenantId, 'BASIC');

    // Extract query params for filtering
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    const hostelName = searchParams.get('hostelName');
    const roomNumber = searchParams.get('roomNumber');
    const isHosteler = searchParams.get('isHosteler');

    const whereClause: any = { tenantId };
    if (grade) whereClause.grade = grade;
    if (section) whereClause.section = section;
    if (isHosteler === 'true') whereClause.isHosteler = true;
    if (hostelName) whereClause.hostelName = hostelName;
    if (roomNumber) whereClause.roomNumber = roomNumber;

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: [
        { grade: 'asc' },
        { section: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message.includes('Locked') ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    await requirePlan(tenantId, 'BASIC');

    const body = await request.json();
    const { firstName, lastName, grade, section, isHosteler, hostelName, roomNumber, rollNumber, parentPhone } = body;

    if (!firstName || !lastName || !grade || !section) {
      return NextResponse.json({ error: 'Missing required student details' }, { status: 400 });
    }

    let parentId = null;

    if (parentPhone && rollNumber) {
      // Check if parent user already exists
      let parentUser = await prisma.user.findFirst({
        where: { tenantId, email: parentPhone, role: 'PARENT' }
      });

      if (!parentUser) {
        // Create new parent user
        const hashedPassword = await bcrypt.hash(rollNumber, 10);
        parentUser = await prisma.user.create({
          data: {
            tenantId,
            email: parentPhone,
            hashedPassword,
            role: 'PARENT',
            parentProfile: {
              create: {}
            }
          }
        });
      }

      parentId = parentUser.id;
    }

    const newStudent = await prisma.student.create({
      data: {
        tenantId,
        firstName,
        lastName,
        grade,
        section,
        enrollmentDate: new Date(),
        isHosteler: isHosteler || false,
        hostelName: isHosteler ? hostelName : null,
        roomNumber: isHosteler ? roomNumber : null,
        rollNumber: rollNumber || null,
        parentPhone: parentPhone || null,
        parentId: parentId
      }
    });

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
