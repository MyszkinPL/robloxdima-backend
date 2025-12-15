import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUser, User } from './db';
import { getSettings } from './settings';
import { prisma } from './prisma';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'session_token';

async function getJwtSecret(): Promise<string> {
    const settings = await getSettings();
    if (settings.jwtSecret) {
        return settings.jwtSecret;
    }

    // Generate new secret if missing and save to DB
    const newSecret = crypto.randomBytes(64).toString('hex');
    await prisma.settings.update({
        where: { id: 1 },
        data: { jwtSecret: newSecret }
    });
    
    return newSecret;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const secret = await getJwtSecret();
    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await getUser(decoded.userId);
    return user || null;
  } catch {
    return null;
  }
}

export async function setSessionUser(userId: string) {
  const secret = await getJwtSecret();
  // Sign the token with userId
  const token = jwt.sign({ userId }, secret, { expiresIn: '30d' });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
