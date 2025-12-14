import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getSessionUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { addOrder, Order, refundOrder, getUser } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { getCachedStock } from "@/lib/stock-cache"
import { rateLimit } from "@/lib/ratelimit"

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

    if (robloxUsername.length < 3 || robloxUsername.length > 50) {
      return NextResponse.json(
        { error: "Никнейм должен быть от 3 до 50 символов" },
        { status: 400 },
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 })
    }

    const rawPrice = amount * settings.rate
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
      // Calculate cost
      const cost = Math.ceil((amount * settings.buyRate) * 100) / 100

      const newOrder: Order = {
        id: orderId,
        userId: userId,
        username: robloxUsername,
        type: "vip",
        amount,
        price,
        cost,
        status: "processing",
        createdAt: new Date().toISOString(),
        placeId: String(placeId),
      }

      await addOrder(newOrder)

      const client = await getAuthenticatedRbxClient()
      await client.orders.createVipServer({
        orderId,
        robloxUsername,
        robuxAmount: amount,
        placeId,
      })

      return NextResponse.json({ success: true, orderId })
    } catch (innerError) {
      console.error("RBX VIP server order creation failed:", innerError)

      const errorMessage =
        innerError instanceof Error
          ? innerError.message
          : "Ошибка при создании VIP сервера"

      await refundOrder(orderId, {
        source: "order_create",
        initiatorUserId: userId,
        externalError: errorMessage,
      })

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("POST /api/orders/vip-server error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
