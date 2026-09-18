export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.tenant.isActive) {
      return NextResponse.json({ error: 'Tenant is inactive' }, { status: 403 });
    }

    const sessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      plan: user.tenant.plan
    };

    // Create JWT
    const token = await encrypt(sessionPayload);

    // Return the response and set HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      user: sessionPayload // Still return to client for immediate UI render if needed, but not required for auth anymore
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15 minutes
    });

    return response;

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
