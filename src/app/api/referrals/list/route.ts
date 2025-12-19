import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
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

    // Pagination
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const [referrals, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          referrerId: userId
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          createdAt: true,
          photoUrl: true,
        },
        orderBy: {
          createdAt: "desc"
        },
        take: limit,
        skip: offset
      }),
      prisma.user.count({
        where: {
          referrerId: userId
        }
      })
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))
    
    return NextResponse.json({ referrals, total, totalPages, page, limit })

  } catch (error) {
    console.error("GET /api/referrals/list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
