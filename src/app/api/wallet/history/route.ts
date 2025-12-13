import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUserPayments } from "@/lib/db"
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

    const payments = await getUserPayments(userId)
    return NextResponse.json({ success: true, payments })
  } catch (error) {
    console.error("GET /api/wallet/history error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 },
    )
  }
}
