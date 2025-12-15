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

    // Fix: Race Condition - Use transaction for read and update
    const transferredAmount = await prisma.$transaction(async (tx) => {
        // 1. Block and read fresh balance inside transaction
        const user = await tx.user.findUnique({
            where: { id: telegramId }
        })
        
        if (!user || user.referralBalance.lte(0)) {
            return 0
        }

        const amount = user.referralBalance

        // 2. Zero out and credit
        await tx.user.update({
            where: { id: telegramId },
            data: {
                referralBalance: 0, // Set to exactly 0
                balance: { increment: amount }
            }
        })

        // 3. Log action (optional)
        await tx.log.create({
            data: {
                userId: telegramId,
                action: "REF_TRANSFER",
                details: `Transfer ${amount} from referral balance (BOT)`
            }
        })

        return amount
    })

    if (transferredAmount === 0) {
        return NextResponse.json({ error: "No funds to transfer" }, { status: 400 })
    }

    return NextResponse.json({ success: true, transferred: transferredAmount })

  } catch (error) {
    console.error("POST /api/bot/referrals/transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
