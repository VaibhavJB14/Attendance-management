import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== 'SYSTEM_ADMIN' && session.role !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData: any = {
      tenantId,
      email,
      hashedPassword: password, // Plaintext for demo purposes
      role
    };

    if (role === 'PARENT') {
      userData.parentProfile = {
        create: {}
      };
    } else if (role === 'TEACHER') {
      userData.teacherProfile = {
        create: {}
      };
    }

    // Create User
    const newUser = await prisma.user.create({
      data: userData
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
