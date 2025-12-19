import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getPayments, getUser } from "@/lib/db"
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
    const userId = searchParams.get("userId") || undefined
    const method = searchParams.get("method") || undefined
    const status = searchParams.get("status") || undefined
    const sortBy = searchParams.get("sort_by") || undefined
    const sortOrder = (searchParams.get("sort_order") as "asc" | "desc") || undefined

    const { payments, total } = await getPayments({ page, limit, userId, method, status, sortBy, sortOrder })
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({ payments, total, totalPages, page, limit })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    )
  }
}
