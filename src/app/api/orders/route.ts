import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getSessionUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { addOrder, Order, refundOrder, getUser, updateOrder } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { getCachedStock } from "@/lib/stock-cache"
import { rateLimit } from "@/lib/ratelimit"
import { getCurrentUserRate } from "@/lib/pricing"

const MIN_ROBUX = 10
const MAX_ROBUX = 100000

export async function POST(req: NextRequest) {
  try {
    if (rateLimit(req, 10, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let userId: string | null = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      userId = String(telegramId)
    } else {
      const sessionUser = await getSessionUser()
      if (!sessionUser) {
        return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
      }
      userId = sessionUser.id
    }

    const settings = await getSettings()
    if (settings.maintenance) {
      return NextResponse.json(
        { error: "Магазин на техническом обслуживании" },
        { status: 503 },
      )
    }

    const user = await getUser(userId)
    if (user?.isBanned) {
      return NextResponse.json(
        { error: "Ваш аккаунт заблокирован. Обратитесь в поддержку." },
        { status: 403 },
      )
    }

    const body = await req.json()
    const robloxUsername = String(body.username || "")
    const amount = Number(body.amount)
    let placeIdRaw = body.placeId

    if (typeof placeIdRaw === "string" && placeIdRaw.includes("roblox.com")) {
      const match = placeIdRaw.match(/\/games\/(\d+)/)
      if (match) {
        placeIdRaw = match[1]
      }
    }

    if (!/^\d+$/.test(String(placeIdRaw))) {
      return NextResponse.json(
        { error: "Некорректный ID плейса. Введите только цифры." },
        { status: 400 },
      )
    }

    const placeId = Number(placeIdRaw)

    if (!robloxUsername || !amount || !placeId) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 })
    }

    if (body.type === "vip") {
      if (robloxUsername.length < 3 || robloxUsername.length > 50) {
        return NextResponse.json(
          { error: "Никнейм должен быть от 3 до 50 символов" },
          { status: 400 },
        )
      }
    } else {
      // Для Gamepass (default) лимит 20 символов согласно документации RBXCrate
      if (robloxUsername.length < 3 || robloxUsername.length > 20) {
        return NextResponse.json(
          { error: "Для Gamepass никнейм должен быть от 3 до 20 символов" },
          { status: 400 },
        )
      }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 })
    }

    if (amount < MIN_ROBUX || amount > MAX_ROBUX) {
      return NextResponse.json(
        { error: `Сумма должна быть от ${MIN_ROBUX} до ${MAX_ROBUX}` },
        { status: 400 },
      )
    }

    // Check for active orders
    const activeOrders = await prisma.order.count({
      where: {
        userId: userId!,
        status: { in: ["pending", "processing"] }
      }
    })

    if (activeOrders >= 3) {
      return NextResponse.json(
        { error: "У вас уже есть 3 активных заказа. Дождитесь их завершения." },
        { status: 400 }
      )
    }

    const currentRate = await getCurrentUserRate()
    const rawPrice = amount * currentRate
    const price = Math.ceil(rawPrice * 100) / 100

    const currentStock = await getCachedStock()
    if (currentStock < amount) {
      return NextResponse.json(
        {
          error: "К сожалению, робуксы только что закончились.",
        },
        { status: 400 },
      )
    }

    const orderId = uuidv4()

    const updateResult = await prisma.user.updateMany({
      where: {
        id: userId,
        balance: { gte: price },
      },
      data: {
        balance: { decrement: price },
      },
    })

    if (updateResult.count === 0) {
      return NextResponse.json(
        {
          error: "Недостаточно средств",
        },
        { status: 400 },
      )
    }

    try {
      // Pass 0 as cost to let db.ts handle calculation (with API check if needed)
      // Or we can rely on manual rate for speed:
      // const cost = Math.ceil((amount * settings.buyRate) * 100) / 100
      
      // We choose 0 to trigger dynamic calculation in createOrder if possible, 
      // but to optimize speed we should probably just use the manual rate here 
      // if we don't want the extra API call in createOrder.
      // However, the user specifically asked to pass 0 to let createOrder handle it 
      // (even though createOrder now checks if cost is 0).
      // Actually, user said: "Давайте передадим 0, чтобы сработала логика в db.ts (с запросом к API), так как точность статистики прибыли важнее 500мс задержки"
      const cost = 0

      const newOrder: Order = {
        id: orderId,
        userId,
        username: robloxUsername,
        type: "gamepass",
        amount,
        price,
        cost,
        status: "processing",
        createdAt: new Date().toISOString(),
        placeId: String(placeId),
      }

      await addOrder(newOrder)

      const client = await getAuthenticatedRbxClient()
      const rbxResponse = await client.orders.createGamepass({
        orderId,
        robloxUsername,
        robuxAmount: amount,
        placeId,
        isPreOrder: true,
      })

      if (rbxResponse.success && rbxResponse.data?.orderId) {
        await updateOrder(orderId, { rbxOrderId: rbxResponse.data.orderId })
      }

      return NextResponse.json({ success: true, orderId })
    } catch (innerError) {
      console.error("RBX order creation failed:", innerError)

      // Issue 4 Fix: Race Condition & Double Refund
      // If client.orders.createGamepass times out but actually creates an order on RBXCrate,
      // and we refund here, the user gets money + robux.
      //
      // Solution:
      // 1. Only refund if we are 100% sure the order WAS NOT created (e.g. validation error).
      // 2. If it's a network error (timeout, 500, etc.), we DO NOT refund immediately.
      //    We leave the order as 'processing' (which is set in addOrder).
      //    The sync-orders cron job will eventually check this order.
      //    If RBXCrate has it -> it will update status to 'completed'/'failed'.
      //    If RBXCrate does NOT have it -> sync-orders will mark as failed and refund after 15m.

      const isNetworkError = 
        String(innerError).includes("timeout") || 
        String(innerError).includes("ECONNRESET") ||
        String(innerError).includes("500") ||
        String(innerError).includes("502") ||
        String(innerError).includes("504");

      if (isNetworkError) {
        console.warn(`Potential network error for order ${orderId}. Skipping immediate refund to avoid race condition.`)
        // Return success to frontend so they don't retry immediately? 
        // Or return error but saying "Order is processing, please wait"?
        return NextResponse.json({ success: true, orderId, message: "Заказ создан, но ответ от поставщика задерживается. Статус обновится автоматически." })
      }

      const errorMessage =
        innerError instanceof Error
          ? innerError.message
          : "Ошибка при создании заказа"

      await refundOrder(orderId, {
        source: "order_create",
        initiatorUserId: userId,
        externalError: errorMessage,
      })

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("POST /api/orders error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
