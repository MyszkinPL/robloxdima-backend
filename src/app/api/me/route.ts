import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUser } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"

export async function GET(req: NextRequest) {
  try {
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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = sessionUser.id
    }

    const dbUser = await getUser(userId)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate stats
    const totalOrders = await prisma.order.count({
      where: {
        userId: userId!,
        status: { not: "cancelled" }
      }
    })

    const totalSpentResult = await prisma.order.aggregate({
      where: {
        userId: userId!,
        status: { not: "cancelled" }
      },
      _sum: {
        price: true
      }
    })
    
    const totalSpent = totalSpentResult._sum.price || 0

    return NextResponse.json({ 
      user: {
        ...dbUser,
        totalOrders,
        totalSpent
      } 
    })
  } catch (error) {
    console.error("GET /api/me error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

