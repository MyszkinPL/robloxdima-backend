import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Payment, mapPayment } from './types';

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
