import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { getUser, prisma } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let user = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      user = await getUser(String(telegramId))
    } else {
      user = await getSessionUser()
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse body
    const body = await req.json()
    const { orderId } = body as {
      orderId?: string
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId обязателен" },
        { status: 400 },
      )
    }

    // 3. Verify ownership and get placeId
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
    }

    // Check ownership (allow admins to bypass ownership check if needed, but for this route let's stick to user ownership or admin role)
    if (order.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 })
    }

    if (!order.placeId) {
       return NextResponse.json({ error: "В заказе отсутствует placeId" }, { status: 400 })
    }

    // 4. Call RbxCrate API
    const client = await getAuthenticatedRbxClient()
    const result = await client.orders.resendGamepass({
      orderId,
      placeId: Number(order.placeId),
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("POST /api/rbx/orders/resend error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
