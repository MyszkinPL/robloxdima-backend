import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getOrders, getUser } from "@/lib/db"
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

    const orders = await getOrders()
    const ordersCount = orders.length
    const uniqueClients = new Set(orders.map((o) => o.username))
    const clientsCount = uniqueClients.size

    const monthlyRevenue = Array.from({ length: 12 }, () => 0)
    let salesThisMonth = 0
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    for (const order of orders) {
      const date = new Date(order.createdAt)
      const month = date.getMonth()

      if (month >= 0 && month < 12) {
        monthlyRevenue[month] += order.price
      }

      if (month === currentMonth && date.getFullYear() === currentYear) {
        salesThisMonth += 1
      }
    }

    return NextResponse.json({
      orders,
      summary: {
        ordersCount,
        clientsCount,
        salesThisMonth,
        monthlyRevenue,
      },
    })
  } catch (error) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    )
  }
}
