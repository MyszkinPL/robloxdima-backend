import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/db"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { refundOrder } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    if (!botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await getSettings()
    if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all pending and processing orders
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["pending", "processing"] },
      },
    })

    const updates = []
    const client = await getAuthenticatedRbxClient()

    for (const order of orders) {
      try {
        const info = await client.orders.getInfo({ orderId: order.id })
        
        // RbxCrate status: "Processing", "Done", "Error", "Cancelled"
        const rbxStatus = String(info.status).toLowerCase()
        let newStatus: "completed" | "failed" | null = null

        if (rbxStatus === "done" || rbxStatus === "completed") {
          newStatus = "completed"
        } else if (rbxStatus === "error" || rbxStatus === "cancelled" || rbxStatus === "failed") {
          newStatus = "failed"
        }

        if (newStatus && newStatus !== order.status) {
          if (newStatus === "completed") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "completed" },
            })
            updates.push({
              userId: order.userId,
              orderId: order.id,
              status: "completed",
              amount: order.amount,
            })
          } else if (newStatus === "failed") {
            // Refund
            const result = await refundOrder(order.id, {
              source: "system",
              externalStatus: rbxStatus,
              externalError: info.error?.message || "Unknown error",
            })
            if (result.refunded) {
              updates.push({
                userId: order.userId,
                orderId: order.id,
                status: "failed",
                amount: order.amount,
                refunded: true,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error)
        // If 404, maybe it doesn't exist on RbxCrate? 
        // If it's been 'processing' for too long (e.g. 24h), maybe fail it?
        // For now, just log.
      }
    }

    return NextResponse.json({ updates })
  } catch (error) {
    console.error("POST /api/bot/sync-orders error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
