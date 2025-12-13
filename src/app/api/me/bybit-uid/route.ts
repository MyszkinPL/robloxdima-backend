import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function PATCH(req: NextRequest) {
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

    const body = (await req.json()) as { bybitUid?: string | null }
    const raw = body.bybitUid ?? null
    const trimmed = raw && typeof raw === "string" ? raw.trim() : null
    const value = trimmed && trimmed.length > 0 ? trimmed : null

    await prisma.user.update({
      where: { id: userId },
      data: {
        bybitUid: value,
      },
    })

    await logAction(userId, "BYBIT_UID_UPDATE", JSON.stringify({
      targetUserId: userId,
      initiatorUserId: userId,
      bybitUid: value,
    }))

    return NextResponse.json({ success: true, bybitUid: value })
  } catch {
    return NextResponse.json(
      { error: "Failed to update Bybit UID" },
      { status: 500 },
    )
  }
}
