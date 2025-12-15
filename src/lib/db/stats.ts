import { prisma } from '@/lib/prisma';
import { mapOrder } from './types';

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
  newUsersDaily: { date: string; count: number }[]
  topProducts: { amount: number; count: number }[]
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
    paymentsByMethodAgg,
    newUsersDailyAgg,
    topProductsAgg
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
    }),
    prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date, 
        COUNT("id") as count
      FROM "users"
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    ` as Promise<{ date: Date, count: bigint }[]>,
    prisma.order.groupBy({
      by: ['amount'],
      _count: { id: true },
      where: { status: 'completed' },
      orderBy: { _count: { id: 'desc' } },
      take: 10
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
      totalSpent: b._sum.price ? b._sum.price.toNumber() : 0
    };
  });

  return {
    totalRevenue: totalRevenueAgg._sum.price ? totalRevenueAgg._sum.price.toNumber() : 0,
    totalProfit: (totalRevenueAgg._sum.price?.toNumber() || 0) - (totalRevenueAgg._sum.cost?.toNumber() || 0),
    ordersCount,
    usersCount,
    bannedUsersCount,
    activeUsersCount: usersCount - bannedUsersCount,
    ordersByStatus: ordersByStatusAgg.map(s => ({ status: s.status, count: s._count.id })),
    topBuyers,
    dailyStats: dailyStatsAgg.map(d => ({ 
      date: new Date(d.date).toISOString(), 
      revenue: Number(d.revenue),
      profit: Number(d.profit),
      orders: Number(d.orders)
    })),
    paymentsByMethod: paymentsByMethodAgg.map(p => ({
      method: p.method,
      count: p._count.id,
      amount: p._sum.amount ? p._sum.amount.toNumber() : 0
    })),
    newUsersDaily: newUsersDailyAgg.map(d => ({
      date: new Date(d.date).toISOString(),
      count: Number(d.count)
    })),
    topProducts: topProductsAgg.map(p => ({
      amount: p.amount,
      count: p._count.id
    }))
  };
}
