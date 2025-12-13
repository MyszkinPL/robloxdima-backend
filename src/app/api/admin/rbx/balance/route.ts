import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
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

    const client = await getAuthenticatedRbxClient()
    const balance = await client.balance.get()

    type BalanceShape = {
      balance?: number
      usd?: number
      [key: string]: unknown
    }

    const anyBalance = balance as BalanceShape
    const numericBalance =
      typeof anyBalance.usd === "number"
        ? anyBalance.usd
        : typeof anyBalance.balance === "number"
          ? anyBalance.balance
          : 0

    return NextResponse.json({
      success: true,
      balance: numericBalance,
    })
  } catch (error) {
    console.error("GET /api/admin/rbx/balance error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
