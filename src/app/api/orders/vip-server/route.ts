import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getSessionUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { addOrder, getUser, Order, refundOrder, updateUserBalance } from "@/lib/db"
import { getAuthenticatedRbxClient } from "@/lib/api-client"

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
    }

    const body = await req.json()
    const robloxUsername = String(body.username || "")
    const amount = Number(body.amount)
    const placeId = Number(body.placeId)

    if (!robloxUsername || !amount || !placeId) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 })
    }

    if (!Number.isFinite(placeId)) {
      return NextResponse.json({ error: "Некорректный ID плейса" }, { status: 400 })
    }

    const settings = await getSettings()
    const price = amount * settings.rate

    const freshUser = await getUser(sessionUser.id)
    const currentBalance = freshUser ? freshUser.balance : 0

    if (currentBalance < price) {
      return NextResponse.json(
        {
          error: `Недостаточно средств. Ваш баланс: ${currentBalance} ₽. Требуется: ${price.toFixed(
            2,
          )} ₽`,
        },
        { status: 400 },
      )
    }

    const orderId = uuidv4()

    await updateUserBalance(sessionUser.id, currentBalance - price)

    try {
      const newOrder: Order = {
        id: orderId,
        userId: sessionUser.id,
        username: robloxUsername,
        type: "vip",
        amount,
        price,
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
        initiatorUserId: sessionUser.id,
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
