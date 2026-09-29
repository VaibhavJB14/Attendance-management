export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '1';
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "STUDENT" | "STAFF"

    const whereClause: any = { tenantId };
    if (type) {
      whereClause.type = type.toUpperCase();
    }

    const records = await prisma.medicalRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error: unknown) {
    console.error('Failed to fetch medical records:', error);
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

    const { type, name, gender = 'Male', phone, bloodGroup, dob, email, reportType = 'WRITTEN', reportContent } = body;

    if (!type || !name || !phone || !bloodGroup) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newRecord = await prisma.medicalRecord.create({
      data: {
        tenantId,
        type: type.toUpperCase(),
        name,
        gender,
        phone,
        bloodGroup,
        dob: dob || '',
        email: email || '',
        reportType: reportType.toUpperCase(),
        reportContent: reportContent || '',
      },
    });

    return NextResponse.json({ record: newRecord }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create medical record:', error);
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

    const { id, type, name, gender, phone, bloodGroup, dob, email, reportType, reportContent } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const updatedRecord = await prisma.medicalRecord.updateMany({
      where: { id, tenantId },
      data: {
        ...(type && { type: type.toUpperCase() }),
        ...(name && { name }),
        ...(gender && { gender }),
        ...(phone && { phone }),
        ...(bloodGroup && { bloodGroup }),
        ...(dob !== undefined && { dob }),
        ...(email !== undefined && { email }),
        ...(reportType && { reportType: reportType.toUpperCase() }),
        ...(reportContent !== undefined && { reportContent }),
      },
    });

    return NextResponse.json({ success: true, updated: updatedRecord.count });
  } catch (error: unknown) {
    console.error('Failed to update medical record:', error);
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
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    await prisma.medicalRecord.deleteMany({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete medical record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
