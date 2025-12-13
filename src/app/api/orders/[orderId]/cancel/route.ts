import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params
    
    // Auth check (Bot or Session)
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
      const user = await getSessionUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending orders" }, { status: 400 })
    }

    // Refund logic
    // 1. Mark order as cancelled
    // 2. Refund balance to user
    
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: orderId },
            data: { status: "cancelled" }
        })

        await tx.user.update({
            where: { id: userId! },
            data: { balance: { increment: order.price } }
        })
        
        // Log transaction
        await tx.log.create({
            data: {
                userId: userId!,
                action: "order_cancelled_refund",
                details: JSON.stringify({ orderId, amount: order.price, reason: "user_cancel" })
            }
        })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/orders/[orderId]/cancel error:", error)
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 },
    )
  }
}
