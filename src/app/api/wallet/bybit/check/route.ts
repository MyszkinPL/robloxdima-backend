import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { rateLimit } from "@/lib/ratelimit"
import { syncBybitInternalDeposits } from "@/lib/bybit"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"

export async function POST(req: NextRequest) {
  try {
    if (rateLimit(req, 1, 15000)) {
      return NextResponse.json(
        { success: false, error: "Слишком частые запросы. Попробуйте позже." },
        { status: 429 },
      )
    }

    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let userId: string | null = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        )
      }
      userId = String(telegramId)
    } else {
      const sessionUser = await getSessionUser()
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        )
      }
      userId = sessionUser.id
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      )
    }

    const bybitUid = (user as any).bybitUid as string | null | undefined

    if (!bybitUid) {
      return NextResponse.json(
        { success: false, error: "Bybit UID не указан" },
        { status: 400 },
      )
    }

    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const startTime = now - oneHour
    const endTime = now

    const result = await syncBybitInternalDeposits({ startTime, endTime })

    return NextResponse.json({
      success: true,
      processed: result.processed,
    })
  } catch (error) {
    console.error("POST /api/wallet/bybit/check error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
