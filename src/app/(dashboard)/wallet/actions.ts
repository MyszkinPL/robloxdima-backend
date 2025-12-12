'use server'

import { createInvoice, checkInvoice } from "@/lib/crypto-bot";
import { createPayment, updatePaymentStatus, getPayment, addToUserBalance, Payment, getUserPayments } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getUserPaymentHistory() {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }
  
  try {
    const payments = await getUserPayments(user.id);
    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return { success: false, error: "Failed to fetch history" };
  }
}

export async function createTopUpInvoice(amount: number) {
  try {
    const user = await getSessionUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    const description = `Пополнение баланса (${user.username || user.firstName})`;
    // Pass user.id as payload for extra verification in webhook
    const invoice = await createInvoice(amount, description, user.id);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentUrl = (invoice as any).bot_invoice_url || (invoice as any).pay_url; 
    
    const payment: Payment = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (invoice as any).invoice_id.toString(),
      userId: user.id,
      amount,
      currency: 'RUB',
      status: 'pending',
      invoiceUrl: paymentUrl,
      createdAt: new Date().toISOString(),
    };

    await createPayment(payment);
    revalidatePath('/wallet');
    
    return { success: true, paymentUrl, paymentId: payment.id };
  } catch (error: unknown) {
    console.error("Error creating invoice:", error);
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    return { success: false, error: `Ошибка API: ${message}` };
  }
}

export async function checkPaymentStatus(paymentId: string) {
  try {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.status === 'paid') {
      return { success: true, status: 'paid', message: "Already paid" };
    }

    const invoice = await checkInvoice(Number(paymentId));
    const status = (invoice as { status?: string } | undefined)?.status || 'pending';
    
    if (status === 'paid') {
      await updatePaymentStatus(paymentId, 'paid');
      await addToUserBalance(payment.userId, payment.amount);
      revalidatePath('/wallet');
      return { success: true, status: 'paid', message: "Payment confirmed!" };
    }

    return { success: true, status, message: "Payment pending..." };
  } catch (error) {
    console.error("Error checking payment:", error);
    return { success: false, error: "Failed to check status" };
  }
}
