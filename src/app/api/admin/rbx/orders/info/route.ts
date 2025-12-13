import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { getUser } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function POST(req: NextRequest) {
  try {
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

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { orderId } = body as { orderId?: string }

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId обязателен" },
        { status: 400 },
      )
    }

    const client = await getAuthenticatedRbxClient()
    const result = await client.orders.getInfo({ orderId })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("POST /api/admin/rbx/orders/info error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
