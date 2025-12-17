import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUser } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"

export const dynamic = 'force-dynamic' // Запрещаем кэширование на уровне Next.js

export async function GET(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let userId: string | null = null

    // 1. Быстрая проверка авторизации
    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      userId = String(telegramId)
    } else {
      const sessionUser = await getSessionUser()
      if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = sessionUser.id
    }

    // 2. ЗАПУСКАЕМ ВСЕ ЗАПРОСЫ ПАРАЛЛЕЛЬНО (Promise.all)
    // Это критически важно для скорости
    const [dbUser, referralsCount, totalOrders, totalSpentResult] = await Promise.all([
      getUser(userId),
      
      prisma.user.count({
        where: { referrerId: userId }
      }),
      
      prisma.order.count({
        where: {
          userId: userId!,
          status: { not: "cancelled" }
        }
      }),
      
      prisma.order.aggregate({
        where: {
          userId: userId!,
          status: { not: "cancelled" }
        },
        _sum: {
          price: true
        }
      })
    ])

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const totalSpent = totalSpentResult._sum.price || 0

    return NextResponse.json({ 
      user: {
        ...dbUser,
        totalOrders,
        totalSpent,
        _count: { referrals: referralsCount }
      } 
    })
  } catch (error) {
    console.error("GET /api/me error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
