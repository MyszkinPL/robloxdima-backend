import { Prisma, User as PrismaUser, Order as PrismaOrder, Payment as PrismaPayment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from './settings';

export { prisma };

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
function mapUser(user: PrismaUser): User {
  // If PrismaUser type doesn't have these fields yet (due to partial client update), we access them carefully
  // But since we ran prisma generate, they should exist if schema is correct.
  // If not, we fallback to accessing as any but we prefer type safety.
  // We assume schema has these fields.
  const extendedUser = user as PrismaUser & { 
    referrerId?: string | null; 
    referralBalance?: number;
  };

  return {
    ...user,
    username: user.username || undefined,
    photoUrl: user.photoUrl || undefined,
    referrerId: extendedUser.referrerId ?? undefined,
    role: user.role as 'user' | 'admin',
    isBanned: user.isBanned,
    referralBalance: extendedUser.referralBalance ?? 0,
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
    cost: order.cost || 0,
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
export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  status?: string;
  refunded?: boolean;
}

export async function getOrders(options: GetOrdersOptions = {}): Promise<{ orders: Order[]; total: number }> {
  const { page = 1, limit = 50, search, userId, status, refunded } = options;
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = {};

  if (userId) where.userId = userId;
  if (status && status !== 'all') where.status = status;
  if (refunded) {
    where.status = 'failed'; // Assuming refunds are marked as failed
    // Or check logs if needed, but simple check for now
  }
  
  if (search) {
      where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
      ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.order.count({ where })
  ]);
  return { orders: orders.map(mapOrder), total };
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const order = await prisma.order.findUnique({
    where: { id }
  });
  return order ? mapOrder(order) : undefined;
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'cost'>): Promise<Order> {
  const settings = await getSettings();
  const cost = order.amount * (settings.buyRate || 0);

  const created = await prisma.order.create({
    data: {
      userId: order.userId,
      username: order.username,
      type: order.type,
      amount: order.amount,
      price: order.price,
      cost: cost,
      status: 'pending',
      placeId: order.placeId,
    }
  });
  return mapOrder(created);
}

type RefundOrderSource = "admin" | "system" | "user_cancel" | "admin_cancel" | "rbx_webhook" | "order_create";
type RefundOrderReason =
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
  
  // Prepare data for upsert
  const createData: Prisma.UserCreateInput = {
    id,
    firstName: rest.firstName || 'User',
    username: rest.username,
    photoUrl: rest.photoUrl,
    role: rest.role || 'user',
    balance: rest.balance || 0,
    createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
    referrer: rest.referrerId ? { connect: { id: rest.referrerId } } : undefined,
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
    },
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

export async function getUserLogs(userId: string, page: number = 1, limit: number = 50): Promise<{ logs: Log[], total: number }> {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.log.count({ where: { userId } })
  ]);

  return {
    logs: logs.map(log => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt.toISOString()
    })),
    total
  };
}

export interface AdminLogEntry {
  id: string;
  userId: string;
  userName?: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface GetAdminLogsOptions {
  page?: number;
  limit?: number;
  search?: string;
  field?: string; // 'user', 'order', 'admin'
  type?: string; // 'refunds', 'bans', 'bybit', 'all'
  from?: string;
  to?: string;
}

export async function getAdminLogs(options: GetAdminLogsOptions = {}): Promise<{ logs: AdminLogEntry[]; total: number }> {
  const { page = 1, limit = 50, search, field, type, from, to } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.LogWhereInput = {};

  // Date filtering
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Type filtering (Action)
  if (type) {
    if (type === "refunds") {
      where.action = { in: ["order_refund", "order_refund_initiated"] };
    } else if (type === "bans") {
      where.action = { in: ["BAN", "UNBAN"] };
    }
  }

  // Search filtering
  if (search) {
    if (field === "user") {
      where.OR = [
        { userId: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { user: { firstName: { contains: search, mode: "insensitive" } } },
      ];
    } else if (field === "admin") {
       // Search in details for initiatorUserId
       where.details = { contains: `"initiatorUserId":"${search}"` };
    } else if (field === "order") {
       // Search in details for orderId
       where.details = { contains: `"orderId":"${search}"` };
    } else {
       // General search
       where.OR = [
         { userId: { contains: search, mode: "insensitive" } },
         { user: { username: { contains: search, mode: "insensitive" } } },
         { details: { contains: search, mode: "insensitive" } },
       ];
    }
  }

  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.log.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.username ?? log.user?.firstName ?? null,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  };
}

// Dashboard Stats
export async function getDashboardStats() {
  const [totalOrders, totalUsers, totalVolume, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.aggregate({
      _sum: {
        price: true
      },
      where: {
        status: 'completed'
      }
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return {
    totalOrders,
    totalUsers,
    totalVolume: totalVolume._sum.price || 0,
    recentOrders: recentOrders.map(mapOrder)
  };
}

export interface DetailedStatsData {
  totalRevenue: number
  totalProfit: number
  ordersCount: number
  usersCount: number
  bannedUsersCount: number
  activeUsersCount: number
  ordersByStatus: { status: string; count: number }[]
  topBuyers: { userId: string; username: string; totalSpent: number }[]
  dailyStats: { date: string; revenue: number; profit: number; orders: number }[]
  paymentsByMethod: { method: string; count: number; amount: number }[]
}

export async function getDetailedStats(): Promise<DetailedStatsData> {
  const [
    totalRevenueAgg,
    ordersCount,
    usersCount,
    bannedUsersCount,
    ordersByStatusAgg,
    topBuyersAgg,
    dailyStatsAgg,
    paymentsByMethodAgg
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { price: true, cost: true },
      where: { status: 'completed' }
    }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.order.groupBy({
      by: ['userId'],
      _sum: { price: true },
      where: { status: 'completed' },
      orderBy: { _sum: { price: 'desc' } },
      take: 5
    }),
    prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date, 
        SUM("price") as revenue, 
        SUM("price" - "cost") as profit,
        COUNT("id") as orders
      FROM "orders"
      WHERE "status" = 'completed' AND "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    ` as Promise<{ date: Date, revenue: number, profit: number, orders: bigint }[]>,
    prisma.payment.groupBy({
      by: ['method'],
      _count: { id: true },
      _sum: { amount: true },
      where: { status: 'paid' }
    })
  ]);

  // Fetch usernames for top buyers
  const topBuyerIds = topBuyersAgg.map(b => b.userId);
  const topBuyerUsers = await prisma.user.findMany({
    where: { id: { in: topBuyerIds } },
    select: { id: true, username: true, firstName: true }
  });

  const topBuyers = topBuyersAgg.map(b => {
    const user = topBuyerUsers.find(u => u.id === b.userId);
    return {
      userId: b.userId,
      username: user?.username || user?.firstName || 'Unknown',
      totalSpent: b._sum.price || 0
    };
  });

  return {
    totalRevenue: totalRevenueAgg._sum.price || 0,
    totalProfit: (totalRevenueAgg._sum.price || 0) - (totalRevenueAgg._sum.cost || 0),
    ordersCount,
    usersCount,
    bannedUsersCount,
    activeUsersCount: usersCount - bannedUsersCount,
    ordersByStatus: ordersByStatusAgg.map(s => ({ status: s.status, count: s._count.id })),
    topBuyers,
    dailyStats: dailyStatsAgg.map(d => ({ 
      date: new Date(d.date).toISOString(), 
      revenue: d.revenue,
      profit: d.profit,
      orders: Number(d.orders)
    })),
    paymentsByMethod: paymentsByMethodAgg.map(p => ({
      method: p.method,
      count: p._count.id,
      amount: p._sum.amount || 0
    }))
  };
}

// Aliases and Helpers for compatibility
export const addOrder = createOrder;

export async function getOrderRefundInfo(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
    }
  });

  if (!order) return null;

  // Fetch logs related to this order refund
  const refundLogs = await prisma.log.findMany({
    where: {
      details: { contains: orderId },
      action: { in: ['order_refund', 'order_refund_initiated'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    order: mapOrder(order),
    user: mapUser(order.user),
    logs: refundLogs
  };
}

export async function getUserOrders(userId: string, page: number = 1, limit: number = 50) {
  return getOrders({ userId, page, limit });
}

export async function searchOrders(query: string, page: number = 1, limit: number = 50) {
  return getOrders({ search: query, page, limit });
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });
}
