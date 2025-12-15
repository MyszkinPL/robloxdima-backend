import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { User, mapUser } from './types';

// Users
export interface GetUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  ordersFilter?: 'with' | 'without' | 'all';
}

export async function getUsers(options: GetUsersOptions = {}): Promise<{ users: User[]; total: number }> {
  const { page = 1, limit = 50, search, role, status, ordersFilter } = options;
  const skip = (page - 1) * limit;
  const where: Prisma.UserWhereInput = {};

  if (role && role !== 'all') where.role = role;
  if (status && status !== 'all') {
      if (status === 'banned') where.isBanned = true;
      if (status === 'active') where.isBanned = false;
  }
  
  if (ordersFilter === 'with') {
    where.orders = { some: {} };
  } else if (ordersFilter === 'without') {
    where.orders = { none: {} };
  }

  if (search) {
      where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } }
      ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);
  return { users: users.map(mapUser), total };
}

export async function getUser(telegramId: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: telegramId }
  });
  return user ? mapUser(user) : undefined;
}

export async function createUserOrUpdate(userData: Partial<User> & { id: string }): Promise<User> {
  const { id, ...rest } = userData;
  
  // Prevent self-referral
  let referrerConnect = undefined;
  if (rest.referrerId && rest.referrerId !== id) {
      referrerConnect = { connect: { id: rest.referrerId } };
  }

  // Prepare data for upsert
  const createData: Prisma.UserCreateInput = {
    id,
    firstName: rest.firstName || 'User',
    username: rest.username,
    photoUrl: rest.photoUrl,
    role: rest.role || 'user',
    balance: rest.balance || 0,
    createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
    referrer: referrerConnect,
    referralBalance: rest.referralBalance || 0,
  };

  const updateData: Prisma.UserUpdateInput = {
    firstName: rest.firstName,
    username: rest.username,
    photoUrl: rest.photoUrl,
    role: rest.role,
    balance: rest.balance,
    createdAt: rest.createdAt ? new Date(rest.createdAt) : undefined,
    referralBalance: rest.referralBalance,
  };

  // Remove undefined fields from updateData
  Object.keys(updateData).forEach(key => {
    const k = key as keyof typeof updateData;
    if (updateData[k] === undefined) {
      delete updateData[k];
    }
  });

  const user = await prisma.user.upsert({
    where: { id },
    create: createData,
    update: updateData,
  });

  return mapUser(user);
}

export async function updateUserBalance(telegramId: string, newBalance: number): Promise<void> {
  await prisma.user.update({
    where: { id: telegramId },
    data: { balance: newBalance }
  });
}

export async function addToUserBalance(telegramId: string, amountToAdd: number): Promise<void> {
  await prisma.user.update({
    where: { id: telegramId },
    data: {
      balance: { increment: amountToAdd }
    }
  });
}

export async function addToReferralBalance(telegramId: string, amountToAdd: number): Promise<void> {
  await prisma.user.update({
    where: { id: telegramId },
    data: {
      referralBalance: { increment: amountToAdd }
    }
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned }
  });
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });
}
