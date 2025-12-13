import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const settings = await getSettings()
    if (!settings.telegramBotToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      select: { id: true },
      where: { isBanned: false } // Don't message banned users
    })

    let sentCount = 0
    let failCount = 0
    
    // Simple loop with rate limiting
    // Note: In a production serverless environment (Vercel), this might timeout if there are many users.
    // A queue system (Redis/Bull) is recommended for large scale.
    for (const user of users) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.id,
            text: message,
            parse_mode: "HTML"
          })
        })
        
        if (res.ok) {
          sentCount++
        } else {
          failCount++
          // If 403 (blocked), maybe mark user as inactive?
        }

        // Rate limit: 20 msgs/sec => 50ms delay
        await new Promise(r => setTimeout(r, 50))
      } catch (e) {
        failCount++
      }
    }

    return NextResponse.json({ sent: sentCount, failed: failCount })
  } catch (error) {
    console.error("Broadcast error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
