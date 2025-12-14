import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { getAuthenticatedRbxClient } from "@/lib/api-client"

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

    if (order.status !== "pending" && order.status !== "processing") {
      return NextResponse.json({ error: "Можно отменить только заказы в ожидании или в обработке" }, { status: 400 })
    }

    // If processing, try to cancel on RbxCrate first
    if (order.status === "processing") {
       try {
         const client = await getAuthenticatedRbxClient()
         // Note: RbxCrate might throw if order cannot be cancelled
         await client.orders.cancel({ orderId })
       } catch (error) {
         // If it's 404, we can assume it's safe to cancel locally
         // If it's other error (e.g. "Already completed"), we should not cancel
         const isNotFound = error instanceof Error && error.message.includes("not found")
         // We can check error types if we imported them, but message check is often enough
         // actually we can import RbxCrateNotFoundError
         
         // For now, if cancel fails, we assume we cannot cancel it
         // But wait, if it's "not found", it means we can refund it?
         // Let's assume strict behaviour: if RbxCrate errors, we abort cancel.
         console.error("RbxCrate cancel failed:", error)
         return NextResponse.json({ error: "Не удалось отменить заказ на стороне провайдера. Возможно, он уже выполняется." }, { status: 400 })
       }
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
