import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUsers, getUser } from "@/lib/db"
import { prisma } from "@/lib/prisma"
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

    const users = await getUsers()

    const stats = await prisma.order.groupBy({
      by: ["userId"],
      _sum: {
        price: true,
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    })

    const statsMap = new Map(stats.map((s) => [s.userId, s]))

    const usersWithStats = users.map((u) => {
      const stat = statsMap.get(u.id)

      return {
        id: u.id,
        username: u.username || `User ${u.id}`,
        totalSpent: stat?._sum.price ?? 0,
        ordersCount: stat?._count.id ?? 0,
        lastActive: stat?._max.createdAt ? stat._max.createdAt.toISOString() : u.createdAt,
        status: u.isBanned ? "banned" : "active",
        role: u.role,
        balance: u.balance,
        bybitUid: u.bybitUid || null,
      }
    })

    return NextResponse.json({ users: usersWithStats })
  } catch (error) {
    console.error("GET /api/admin/users error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    )
  }
}
