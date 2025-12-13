import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getCurrencies, getMe } from "@/lib/crypto-bot"
import { getUser } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function GET(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let user = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const [me, currencies] = await Promise.all([getMe(), getCurrencies()])

    return NextResponse.json({
      success: true,
      me,
      currencies,
    })
  } catch (error) {
    console.error("GET /api/admin/crypto-bot/check error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

