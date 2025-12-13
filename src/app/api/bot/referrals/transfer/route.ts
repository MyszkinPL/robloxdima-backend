import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    if (!botToken || !telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getSettings()
    if (settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: telegramId } })
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.referralBalance <= 0) {
        return NextResponse.json({ error: "No funds to transfer" }, { status: 400 })
    }

    const amount = user.referralBalance

    // Transaction to ensure atomicity
    await prisma.$transaction([
        prisma.user.update({
            where: { id: telegramId },
            data: {
                referralBalance: { set: 0 },
                balance: { increment: amount }
            }
        })
    ])

    return NextResponse.json({ success: true, transferred: amount })

  } catch (error) {
    console.error("POST /api/bot/referrals/transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
