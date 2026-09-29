export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '1';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // "STUDENT" | "STAFF"

    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status.toUpperCase();
    }
    if (type) {
      whereClause.type = type.toUpperCase();
    }

    const records = await prisma.admissionRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error: unknown) {
    console.error('Failed to fetch admission records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '1';
    const body = await request.json();

    const {
      type = 'STUDENT',
      // Personal Details
      firstName,
      middleName,
      lastName,
      dob,
      gender = 'Male',
      bloodGroup,
      phone,
      email,
      currentAddress,
      permanentAddress,
      // Parent / Emergency Contact Details
      parentFirstName = '',
      parentMiddleName = '',
      parentLastName = '',
      parentDob = '',
      parentBloodGroup = '',
      parentPhone = '',
      parentEmail = '',
      // Academic / Professional Assignment
      grade = 'Year 1',
      section = 'Sec A',
      isHosteler = false,
      hostelName = null,
      roomNumber = null,
      experience = '',
      // Documents & Status
      status = 'ENROLLED',
      documents = [], // [{ name: string, isChecked: boolean, fileUrl?: string }]
    } = body;

    if (!firstName || !lastName || !dob || !phone || !email) {
      return NextResponse.json({ error: 'Missing required personal details' }, { status: 400 });
    }

    let createdStudentId: string | null = null;

    if (type.toUpperCase() === 'STUDENT') {
      // 1. Create or sync Student record in core database
      const newStudent = await prisma.student.create({
        data: {
          tenantId,
          firstName,
          lastName,
          gender,
          grade,
          section,
          enrollmentDate: new Date(),
          isHosteler: Boolean(isHosteler),
          hostelName: isHosteler ? hostelName : null,
          roomNumber: isHosteler ? roomNumber : null,
          parentPhone: parentPhone || phone,
          rollNumber: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        },
      });
      createdStudentId = newStudent.id;
    }

    // 2. Also add Medical record automatically
    try {
      await prisma.medicalRecord.create({
        data: {
          tenantId,
          type: type.toUpperCase(),
          name: `${firstName} ${lastName}`.trim(),
          gender,
          phone,
          bloodGroup: bloodGroup || 'O+',
          dob: dob || '',
          email: email || '',
          reportType: 'WRITTEN',
          reportContent: `Onboarded via Admission Dashboard (${type}). Initial health clearance pending.`,
        },
      });
    } catch (e) {
      console.warn('Could not auto-create medical record:', e);
    }

    // 3. Create full AdmissionRecord
    const newAdmission = await prisma.admissionRecord.create({
      data: {
        tenantId,
        type: type.toUpperCase(),
        studentId: createdStudentId,
        firstName,
        middleName: middleName || '',
        lastName,
        dob,
        gender,
        bloodGroup: bloodGroup || 'O+',
        phone,
        email,
        currentAddress: currentAddress || '',
        permanentAddress: permanentAddress || '',
        parentFirstName: parentFirstName || 'N/A',
        parentMiddleName: parentMiddleName || '',
        parentLastName: parentLastName || 'N/A',
        parentDob: parentDob || '',
        parentBloodGroup: parentBloodGroup || '',
        parentPhone: parentPhone || phone,
        parentEmail: parentEmail || '',
        grade,
        section,
        isHosteler: Boolean(isHosteler),
        hostelName: isHosteler ? hostelName : null,
        roomNumber: isHosteler ? roomNumber : null,
        experience: experience || '',
        status: status.toUpperCase(),
        documentsJson: JSON.stringify(documents),
      },
    });

    return NextResponse.json({ admission: newAdmission }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to enroll:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '1';
    const body = await request.json();
    const { id, status, documents } = body;

    if (!id) {
      return NextResponse.json({ error: 'Admission ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status.toUpperCase();
    if (documents) updateData.documentsJson = JSON.stringify(documents);

    const updated = await prisma.admissionRecord.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error: unknown) {
    console.error('Failed to update admission record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '1';
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admission ID is required' }, { status: 400 });
    }

    await prisma.admissionRecord.deleteMany({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete admission record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
