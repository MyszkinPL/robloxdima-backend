import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
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

    // Pagination
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const referrals = await prisma.user.findMany({
      where: {
        referrerId: userId
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        createdAt: true,
        photoUrl: true,
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    })

    // Calculate total earnings from each referral (approximate or accurate?)
    // Accurate calculation requires summing payments from this user * referralPercent at that time.
    // But we don't store historical referralPercent per payment.
    // So we can only show "Total Spent" by the referral, and maybe "Estimated Earnings".
    
    // Let's just return the users for now. The user asked for "full referral system", usually implies seeing who you invited.

    // Enrich with total spent if needed, but it might be N+1 query problem.
    // Use aggregation if possible or just skip for performance if list is long.
    // For now let's just return the list.
    
    return NextResponse.json({ referrals })

  } catch (error) {
    console.error("GET /api/referrals/list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
