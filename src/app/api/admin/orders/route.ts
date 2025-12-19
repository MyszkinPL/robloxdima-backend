import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getOrders, getUser, getDashboardStats, prisma } from "@/lib/db"
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
    const sortBy = searchParams.get("sort_by") || undefined
    const sortOrder = (searchParams.get("sort_order") as 'asc' | 'desc') || undefined

    const [ordersResult, stats] = await Promise.all([
      getOrders({ page, limit, search, userId, status, refunded, sortBy, sortOrder }),
      getDashboardStats()
    ])

    const totalPages = Math.max(1, Math.ceil(ordersResult.total / limit))

    // Enrich with refund info
    const orderIds = ordersResult.orders.map(o => o.id)
    let refundsMap: Record<string, any> = {}

    if (orderIds.length > 0) {
      const refundLogs = await prisma.log.findMany({
        where: {
          action: "order_refund",
          OR: orderIds.map(id => ({
            details: { contains: id }
          }))
        }
      })

      refundLogs.forEach(log => {
        try {
          if (!log.details) return
          const parsed = JSON.parse(log.details)
          if (parsed.orderId && orderIds.includes(parsed.orderId)) {
             if (!refundsMap[parsed.orderId] || new Date(refundsMap[parsed.orderId].createdAt) < log.createdAt) {
                refundsMap[parsed.orderId] = {
                    refunded: true,
                    source: parsed.source,
                    initiatorUserId: parsed.initiatorUserId,
                    createdAt: log.createdAt
                }
             }
          }
        } catch {}
      })
    }

    const ordersWithRefunds = ordersResult.orders.map(order => ({
        ...order,
        refundInfo: refundsMap[order.id] || null
    }))

    return NextResponse.json({
      orders: ordersWithRefunds,
      total: ordersResult.total,
      totalPages,
      page,
      limit,
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
