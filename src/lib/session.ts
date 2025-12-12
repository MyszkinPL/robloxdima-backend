import { cookies } from 'next/headers';
import { getUser, User } from './db';

const SESSION_COOKIE_NAME = 'session_user_id';

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) return null;

  const user = await getUser(userId);
  return user || null;
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  // Set cookie for 30 days
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
