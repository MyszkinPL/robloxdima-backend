import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAdminLogs, getUser } from "@/lib/db"
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

    const logs = await getAdminLogs()
    const refundCount = logs.filter(
      (log) => log.action === "order_refund" || log.action === "order_refund_initiated",
    ).length
    const banCount = logs.filter(
      (log) => log.action === "BAN" || log.action === "UNBAN",
    ).length

    return NextResponse.json({
      logs,
      summary: {
        total: logs.length,
        refundCount,
        banCount,
      },
    })
  } catch (error) {
    console.error("GET /api/admin/logs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    )
  }
}
