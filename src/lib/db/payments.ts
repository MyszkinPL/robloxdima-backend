import { prisma } from '@/lib/prisma';
import { Payment, mapPayment } from './types';

export interface GetPaymentsOptions {
  page?: number;
  limit?: number;
  userId?: string;
  method?: string | string[];
  status?: string | string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Payments
export async function getPayments(options: GetPaymentsOptions = {}): Promise<{ payments: Payment[]; total: number }> {
  const { page = 1, limit = 50, userId, method, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (userId) where.userId = { contains: userId, mode: 'insensitive' };
  
  if (method) {
    const methods = Array.isArray(method) ? method : method.split(',');
    if (methods.length === 1) where.method = methods[0];
    else where.method = { in: methods };
  }

  if (status) {
    const statuses = Array.isArray(status) ? status : status.split(',');
    if (statuses.length === 1) where.status = statuses[0];
    else where.status = { in: statuses };
  }

  const orderBy: any = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy,
      skip,
      take: limit
    }),
    prisma.payment.count({ where })
  ]);

  return { payments: payments.map(mapPayment), total };
}

export async function getUserPayments(userId: string, page: number = 1, limit: number = 50): Promise<{ payments: Payment[], total: number }> {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.payment.count({ where: { userId } })
  ]);
  return { payments: payments.map(mapPayment), total };
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
