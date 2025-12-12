'use server'

import { getAuthenticatedRbxClient } from "@/lib/api-client";
import { addOrder, Order, getUser, refundOrder, updateUserBalance, searchOrders } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function checkOrderStatus(formData: FormData) {
  const query = formData.get("search") as string;
  if (!query || query.length < 3) {
    return { error: "Введите минимум 3 символа" };
  }
  
  try {
    const orders = await searchOrders(query);
    return { orders };
  } catch (error) {
    console.error("Search failed:", error);
    return { error: "Ошибка поиска" };
  }
}

export async function createOrder(formData: FormData) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Необходима авторизация" };
  }

  const robloxUsername = formData.get("username") as string;
  const amountStr = formData.get("amount") as string;
  const placeIdStr = formData.get("placeId") as string;

  if (!robloxUsername || !amountStr || !placeIdStr) {
    return { error: "Заполните все поля" };
  }

  const amount = parseInt(amountStr);
  const placeId = parseInt(placeIdStr);

  if (isNaN(amount) || amount <= 0) {
    return { error: "Некорректная сумма" };
  }

  if (isNaN(placeId)) {
    return { error: "Некорректный ID плейса" };
  }

  const settings = await getSettings();
  const price = amount * settings.rate;

  // Check balance (fetch fresh)
  const freshUser = await getUser(user.id);
  const currentBalance = freshUser ? freshUser.balance : 0;

  if (currentBalance < price) {
    return { error: `Недостаточно средств. Ваш баланс: ${currentBalance} ₽. Требуется: ${price.toFixed(2)} ₽` };
  }

  const orderId = uuidv4();

  await updateUserBalance(user.id, currentBalance - price);

  try {
    const newOrder: Order = {
      id: orderId,
      userId: user.id, // Telegram ID
      username: robloxUsername, // Roblox Username
      type: 'gamepass',
      amount,
      price,
      status: 'processing',
      createdAt: new Date().toISOString(),
      placeId: placeIdStr,
    };

    await addOrder(newOrder);

    const client = await getAuthenticatedRbxClient();
    await client.orders.createGamepass({
      orderId: orderId,
      robloxUsername: robloxUsername,
      robuxAmount: amount,
      placeId: placeId,
    });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/wallet'); 
    return { success: true, orderId };

  } catch (error: unknown) {
    console.error("Order creation failed:", error);

    const errorMessage = error instanceof Error ? error.message : "Ошибка при создании заказа";

    await refundOrder(orderId, {
      source: "order_create",
      initiatorUserId: user.id,
      externalError: errorMessage,
    });

    return { error: errorMessage };
  }
}
