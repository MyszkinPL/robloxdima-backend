import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { syncBybitInternalDeposits } from "@/lib/bybit"
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

    const body = await req.json().catch(() => ({} as { startTime?: number; endTime?: number }))
    const { startTime, endTime } = body as { startTime?: number; endTime?: number }

    const result = await syncBybitInternalDeposits({ startTime, endTime })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("POST /api/admin/bybit/sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync Bybit deposits" },
      { status: 500 },
    )
  }
}
