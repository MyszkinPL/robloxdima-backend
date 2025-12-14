import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAdminLogs, getUser, prisma } from "@/lib/db"
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
    const search = searchParams.get("q") || undefined
    const field = searchParams.get("field") || undefined
    const type = searchParams.get("type") || undefined
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined

    const { logs, total } = await getAdminLogs({
      page,
      limit,
      search,
      field,
      type,
      from,
      to,
    })
    
    // We need to fetch counts separately if we want to show them in the dashboard cards
    // Or we can just show counts for current filter? 
    // The UI shows "Total", "Refunds", "Bans". These are likely global counts.
    // Let's do a quick separate count for those stats if needed, or just return total of current query.
    // The previous implementation returned global counts. Let's try to preserve that efficiently.
    // Actually, for performance, maybe we only count if requested or just cache it?
    // Let's just count them. It's not too expensive yet.
    
    // Optimisation: Run these in parallel with getAdminLogs? 
    // Or just return the counts based on current filter? 
    // The UI shows "Total records", "Refunds", "Bans". 
    // Let's stick to what the UI expects: global counts.
    
    const [refundCount, banCount] = await Promise.all([
      prisma.log.count({
        where: { action: { in: ["order_refund", "order_refund_initiated"] } },
      }),
      prisma.log.count({
        where: { action: { in: ["BAN", "UNBAN"] } },
      }),
    ])

    return NextResponse.json({
      logs,
      total, // Total for current query
      page,
      limit,
      summary: {
        total: await prisma.log.count(), // Global total
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
