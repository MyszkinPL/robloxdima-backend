import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getOrders, getUser, getDashboardStats } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function GET(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let user = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("q") || undefined
    const userId = searchParams.get("userId") || undefined
    const status = searchParams.get("status") || undefined
    const refundedParam = searchParams.get("refunded")
    const refunded = refundedParam === "yes" ? true : refundedParam === "no" ? false : undefined

    const [ordersResult, stats] = await Promise.all([
      getOrders({ page, limit, search, userId, status, refunded }),
      getDashboardStats()
    ])

    return NextResponse.json({
      orders: ordersResult.orders,
      total: ordersResult.total,
      summary: stats,
    })
  } catch (error) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    )
  }
}
