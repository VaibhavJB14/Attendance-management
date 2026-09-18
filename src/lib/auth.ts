import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

// In a real app, store this in .env!
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'super-secure-secret-key-12345';
const key = new TextEncoder().encode(JWT_SECRET_KEY);

export interface SessionPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days expiration for easier testing
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth_token')?.value;
  
  if (!sessionCookie) return null;
  
  const parsed = await decrypt(sessionCookie);
  if (!parsed) return null;

  return parsed as SessionPayload;
}
