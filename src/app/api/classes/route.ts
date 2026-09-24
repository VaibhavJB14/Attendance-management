import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const classes = await prisma.schoolClass.findMany({
      where: { tenantId },
      orderBy: [
        { grade: 'asc' },
        { section: 'asc' }
      ]
    });

    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { grade, section } = await request.json();

    if (!grade || !section) {
      return NextResponse.json({ error: 'Grade and section are required' }, { status: 400 });
    }

    const newClass = await prisma.schoolClass.create({
      data: {
        tenantId,
        grade,
        section
      }
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    console.error('Error creating class:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This class and section already exists.' }, { status: 409 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
