import { prisma } from '@/lib/prisma';
import type { User as PrismaUser, Order as PrismaOrder, Payment as PrismaPayment } from '@prisma/client';

export interface Order {
  id: string;
  userId: string; // Telegram ID
  username: string; // Roblox Username (entered by user)
  type: 'gamepass' | 'vip';
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'failed' | 'processing';
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
  isBanned: boolean;
  createdAt: string;
  bybitUid?: string;
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
  method: string;
  providerData?: string | null;
}

// Helpers to map Prisma results to our interfaces
function mapUser(user: PrismaUser): User {
  return {
    ...user,
    username: user.username || undefined,
    photoUrl: user.photoUrl || undefined,
    role: user.role as 'user' | 'admin',
    isBanned: user.isBanned,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapOrder(order: PrismaOrder): Order {
  return {
    id: order.id,
    userId: order.userId,
    username: order.username,
    type: (order.type as Order['type']) || 'gamepass',
    amount: order.amount,
    price: order.price,
    status: order.status as Order['status'],
    createdAt: order.createdAt.toISOString(),
    placeId: order.placeId,
  };
}

function mapPayment(payment: PrismaPayment): Payment {
  return {
    ...payment,
    invoiceUrl: payment.invoiceUrl || undefined,
    status: payment.status as Payment['status'],
    createdAt: payment.createdAt.toISOString(),
  };
}

// Orders
export async function getOrders(): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return orders.map(mapOrder);
}

export interface OrderRefundInfo {
  refunded: boolean;
  source?: RefundOrderSource;
  initiatorUserId?: string | null;
}

export async function getOrderRefundInfo(orderId: string): Promise<OrderRefundInfo> {
  const log = await prisma.log.findFirst({
    where: {
      action: "order_refund",
      details: {
        contains: `"orderId":"${orderId}"`,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!log || !log.details) {
    return { refunded: false };
  }

  try {
    const parsed = JSON.parse(log.details) as {
      orderId?: string;
      source?: RefundOrderSource;
      initiatorUserId?: string;
    };

    return {
      refunded: true,
      source: parsed.source,
      initiatorUserId: parsed.initiatorUserId ?? null,
    };
  } catch {
    return { refunded: true };
  }
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const order = await prisma.order.findUnique({
    where: { id },
  });
  return order ? mapOrder(order) : undefined;
}

export async function searchOrders(query: string): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { equals: query } }, // Exact match for ID
        { username: { contains: query, mode: 'insensitive' } } // Partial match for username
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  return orders.map(mapOrder);
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return orders.map(mapOrder);
}

export async function addOrder(order: Order): Promise<void> {
  await prisma.order.create({
    data: {
      id: order.id,
      userId: order.userId,
      username: order.username,
      type: order.type,
      amount: order.amount,
      price: order.price,
      status: order.status,
      placeId: order.placeId,
      createdAt: new Date(order.createdAt),
    }
  });
}

export type RefundOrderSource = "admin_cancel" | "rbx_webhook" | "order_create" | "system";

export type RefundOrderReason =
  | "ok"
  | "order_not_found"
  | "already_completed"
  | "already_failed_or_refunded";

export interface RefundOrderResult {
  refunded: boolean;
  reason: RefundOrderReason;
}

export async function refundOrder(
  orderId: string,
  options: {
    source: RefundOrderSource;
    initiatorUserId?: string;
    externalStatus?: string;
    externalError?: string;
  },
): Promise<RefundOrderResult> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        refunded: false,
        reason: "order_not_found" as const,
      };
    }

    if (order.status === "completed") {
      return {
        refunded: false,
        reason: "already_completed" as const,
      };
    }

    if (order.status === "failed" || order.status === "cancelled") {
      return {
        refunded: false,
        reason: "already_failed_or_refunded" as const,
      };
    }

    await tx.user.update({
      where: { id: order.userId },
      data: {
        balance: { increment: order.price },
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "failed",
      },
    });

    const detailsPayload = {
      orderId,
      amount: order.price,
      source: options.source,
      initiatorUserId: options.initiatorUserId,
      externalStatus: options.externalStatus,
      externalError: options.externalError,
    };

    await tx.log.create({
      data: {
        userId: order.userId,
        action: "order_refund",
        details: JSON.stringify(detailsPayload),
      },
    });

    if (options.initiatorUserId && options.initiatorUserId !== order.userId) {
      await tx.log.create({
        data: {
          userId: options.initiatorUserId,
          action: "order_refund_initiated",
          details: JSON.stringify(detailsPayload),
        },
      });
    }

    return {
      refunded: true,
      reason: "ok" as const,
    };
  });

  return result;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  // Filter out undefined values and handle Date conversion if createdAt is updated
  const data: Record<string, unknown> = { ...updates };
  if (typeof data.createdAt === 'string') {
    data.createdAt = new Date(data.createdAt);
  }
  
  await prisma.order.update({
    where: { id },
    data
  });
}

// Users
export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return users.map(mapUser);
}

export async function getUser(telegramId: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: telegramId }
  });
  return user ? mapUser(user) : undefined;
}

export async function createUserOrUpdate(userData: Partial<User> & { id: string }): Promise<User> {
  const { id, ...rest } = userData;
  
  // Prepare data for upsert
  const createData = {
    id,
    firstName: rest.firstName || 'User',
    username: rest.username,
    photoUrl: rest.photoUrl,
    role: rest.role || 'user',
    balance: rest.balance || 0,
    createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
  };

  const updateData = {
    ...rest,
    createdAt: rest.createdAt ? new Date(rest.createdAt) : undefined,
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

// Payments
export async function getPayments(): Promise<Payment[]> {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return payments.map(mapPayment);
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return payments.map(mapPayment);
}

export async function createPayment(payment: Payment): Promise<void> {
  await prisma.payment.create({
    data: {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      invoiceUrl: payment.invoiceUrl,
      method: payment.method || "cryptobot",
      providerData: payment.providerData ?? null,
      createdAt: new Date(payment.createdAt),
    }
  });
}

export async function updatePaymentStatus(id: string, status: Payment['status']): Promise<void> {
  await prisma.payment.update({
    where: { id },
    data: { status }
  });
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  const payment = await prisma.payment.findUnique({
    where: { id }
  });
  return payment ? mapPayment(payment) : undefined;
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

export async function logAction(userId: string, action: string, details?: string): Promise<void> {
  await prisma.log.create({
    data: {
      userId,
      action,
      details,
    }
  });
}

export async function getUserLogs(userId: string): Promise<Log[]> {
  const logs = await prisma.log.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return logs.map(log => ({
    id: log.id,
    userId: log.userId,
    action: log.action,
    details: log.details,
      createdAt: log.createdAt.toISOString()
    }));
}

export interface AdminLogEntry {
  id: string;
  userId: string;
  userName?: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export async function getAdminLogs(): Promise<AdminLogEntry[]> {
  const logs = await prisma.log.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user?.username ?? log.user?.firstName ?? null,
    action: log.action,
    details: log.details,
    createdAt: log.createdAt.toISOString(),
  }));
}
