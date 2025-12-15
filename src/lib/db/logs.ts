import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Log } from './types';

// Logs
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
       where.details = { contains: search };
    } else if (field === "order") {
       // Search in details for orderId
       where.details = { contains: search };
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
