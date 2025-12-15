import { Prisma, User as PrismaUser, Order as PrismaOrder, Payment as PrismaPayment } from '@prisma/client';

export interface Order {
  id: string;
  userId: string; // Telegram ID
  username: string; // Roblox Username (entered by user)
  type: 'gamepass' | 'vip';
  amount: number;
  price: number;
  cost: number; // Cost of goods sold
  status: 'pending' | 'completed' | 'failed' | 'processing' | 'cancelled';
  createdAt: string;
  rbxOrderId?: string;
  placeId: string;
}

export interface User {
  id: string; // Telegram ID
  username?: string; // Telegram Username
  firstName: string;
  photoUrl?: string;
  role: 'user' | 'admin';
  balance: number;
  referralBalance: number;
  isBanned: boolean;
  createdAt: string;
  referrerId?: string;
}

export interface Log {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface Payment {
  id: string; // CryptoBot invoice ID or internal ID
  userId: string; // Telegram ID
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired';
  invoiceUrl?: string;
  createdAt: string;
  method?: string;
  providerData?: string | null;
}

// Helpers to map Prisma results to our interfaces
export function mapUser(user: PrismaUser): User {
  // If PrismaUser type doesn't have these fields yet (due to partial client update), we access them carefully
  // But since we ran prisma generate, they should exist if schema is correct.
  // If not, we fallback to accessing as any but we prefer type safety.
  // We assume schema has these fields.
  const extendedUser = user as PrismaUser & { 
    referrerId?: string | null; 
    referralBalance?: Prisma.Decimal | number;
  };

  return {
    ...user,
    username: user.username || undefined,
    photoUrl: user.photoUrl || undefined,
    referrerId: extendedUser.referrerId ?? undefined,
    role: user.role as 'user' | 'admin',
    balance: new Prisma.Decimal(user.balance).toNumber(),
    isBanned: user.isBanned,
    referralBalance: new Prisma.Decimal(extendedUser.referralBalance ?? 0).toNumber(),
    createdAt: user.createdAt.toISOString(),
  };
}

export function mapOrder(order: PrismaOrder): Order {
  return {
    id: order.id,
    userId: order.userId,
    username: order.username,
    type: (order.type as Order['type']) || 'gamepass',
    amount: order.amount,
    price: new Prisma.Decimal(order.price).toNumber(),
    cost: new Prisma.Decimal(order.cost || 0).toNumber(),
    status: order.status as Order['status'],
    createdAt: order.createdAt.toISOString(),
    placeId: order.placeId,
    rbxOrderId: order.rbxOrderId || undefined,
  };
}

export function mapPayment(payment: PrismaPayment): Payment {
  return {
    ...payment,
    invoiceUrl: payment.invoiceUrl || undefined,
    amount: new Prisma.Decimal(payment.amount).toNumber(),
    status: payment.status as Payment['status'],
    createdAt: payment.createdAt.toISOString(),
  };
}
