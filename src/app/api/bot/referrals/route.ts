import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    if (!botToken) {
      return NextResponse.json({ error: "Missing bot token" }, { status: 401 })
    }

    const settings = await getSettings()
    if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userId = req.headers.get("x-telegram-id")
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralBalance: true,
        _count: {
          select: { referrals: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      referralBalance: user.referralBalance,
      referralsCount: user._count.referrals,
      referralPercent: settings.referralPercent
    })

  } catch (error) {
    console.error("GET /api/bot/referrals error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
