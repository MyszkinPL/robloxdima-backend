import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/db"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { refundOrder } from "@/lib/db"
import { RbxCrateNotFoundError } from "@/lib/rbxcrate/core/errors"

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
        // Handle 404 (Order not found on RbxCrate)
        if (error instanceof RbxCrateNotFoundError) {
          const timeSinceCreation = Date.now() - order.createdAt.getTime()
          const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

          // If order is older than 15 minutes and not found on RbxCrate, mark as failed/refund
          if (timeSinceCreation > TIMEOUT_MS) {
             console.log(`Order ${order.id} not found on RbxCrate and > 15m old. Marking as failed.`)
             const result = await refundOrder(order.id, {
               source: "system",
               externalStatus: "not_found",
               externalError: "Order not found on RbxCrate after 15m",
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
          } else {
             console.warn(`Order ${order.id} not found on RbxCrate, but < 15m old. Skipping.`)
          }
        } else {
           console.error(`Error syncing order ${order.id}:`, error)
        }
      }
    }

    return NextResponse.json({ updates })
  } catch (error) {
    console.error("POST /api/bot/sync-orders error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
