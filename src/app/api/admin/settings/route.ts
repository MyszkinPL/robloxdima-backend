import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getSettings, updateSettings } from "@/lib/settings"
import { getUser } from "@/lib/db"

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

    const settings = await getSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("GET /api/admin/settings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = (await req.json()) as Record<string, unknown>
    const settings = await updateSettings(body)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    )
  }
}
