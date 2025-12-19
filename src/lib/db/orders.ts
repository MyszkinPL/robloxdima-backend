import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from '../settings';
import { RbxCrateClient } from '../rbxcrate/client';
import { Order, mapOrder, mapUser } from './types';

// Orders
export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  status?: string;
  refunded?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getOrders(options: GetOrdersOptions = {}): Promise<{ orders: Order[]; total: number }> {
  const { page = 1, limit = 50, search, userId, status, refunded, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = {};

  if (userId) where.userId = userId;
  if (status && status !== 'all') where.status = status;
  if (refunded !== undefined) {
    if (refunded) {
      where.status = 'failed';
    } else {
      where.status = { not: 'failed' };
    }
  }
  
  if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      
      where.OR = [
          { userId: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
      ];

      if (isUuid) {
          where.OR.push({ id: { equals: search } });
      }
  }

  const orderBy: Prisma.OrderOrderByWithRelationInput = {};
  if (sortBy) {
    orderBy[sortBy as keyof Prisma.OrderOrderByWithRelationInput] = sortOrder;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
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

export async function getOrderByRbxId(rbxOrderId: string): Promise<Order | undefined> {
  const order = await prisma.order.findUnique({
    where: { rbxOrderId }
  });
  return order ? mapOrder(order) : undefined;
}

export async function createOrder(order: Omit<Order, 'createdAt' | 'status'> & { id?: string }): Promise<Order> {
  const settings = await getSettings();
  let cost = order.cost; // Use provided cost

  // If cost is not provided or 0, try to calculate it
  if (cost === undefined || cost === 0) {
    // Try to calculate dynamic cost if API key is present
    if (settings.rbxKey) {
      try {
        const client = new RbxCrateClient(settings.rbxKey);
        const detailedStock = await client.stock.getDetailed();
        
        if (detailedStock && detailedStock.length > 0) {
          // Find best rate (lowest) with available stock
          const availableStock = detailedStock.filter(s => s.totalRobuxAmount > 0);
          availableStock.sort((a, b) => a.rate - b.rate);
          
          const bestOffer = availableStock[0] || detailedStock.sort((a, b) => a.rate - b.rate)[0];
          
          let ratePerOne = bestOffer.rate;
          // Heuristic: if rate > 10, it's likely per 1000 Robux (e.g. 500 RUB)
          // if rate <= 10, it's likely per 1 Robux (e.g. 0.5 RUB)
          if (ratePerOne > 10) {
            ratePerOne = ratePerOne / 1000;
          }
          
          cost = order.amount * ratePerOne;
        } else {
          // Fallback to manual buyRate if stock is empty
          cost = order.amount * (settings.buyRate || 0);
        }
      } catch (error) {
        console.error("Failed to calculate dynamic cost:", error);
        // Fallback to manual buyRate if API fails
        cost = order.amount * (settings.buyRate || 0);
      }
    } else {
      // Fallback to manual buyRate if no API key
      cost = order.amount * (settings.buyRate || 0);
    }
  }

  const created = await prisma.order.create({
    data: {
      id: order.id,
      userId: order.userId,
      username: order.username,
      type: order.type,
      amount: order.amount,
      price: order.price,
      cost: cost,
      status: 'pending',
      placeId: order.placeId,
      rbxOrderId: order.rbxOrderId,
    }
  });
  return mapOrder(created);
}

export type RefundOrderSource = "admin" | "system" | "user_cancel" | "admin_cancel" | "rbx_webhook" | "order_create";
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

    const updateResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { notIn: ["completed", "failed", "cancelled"] },
      },
      data: {
        status: "failed",
      },
    });

    if (updateResult.count === 0) {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      return {
        refunded: false,
        reason: current?.status === "completed" ? ("already_completed" as const) : ("already_failed_or_refunded" as const),
      };
    }

    await tx.user.update({
      where: { id: order.userId },
      data: {
        balance: { increment: order.price },
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
