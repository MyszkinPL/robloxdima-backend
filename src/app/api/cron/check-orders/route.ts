import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { updateOrder, refundOrder } from "@/lib/db"
import { OrderStatus } from "@/lib/rbxcrate/types"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000)

    const orders = await prisma.order.findMany({
      where: {
        status: "processing",
        createdAt: {
          lt: cutoff,
        },
      },
    })

    if (orders.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    const client = await getAuthenticatedRbxClient()

    let processed = 0

    for (const order of orders) {
      try {
        const info = await client.orders.getInfo({ orderId: order.id })
        const status = info.status as OrderStatus | string

        if (status === OrderStatus.Completed) {
          await updateOrder(order.id, { status: "completed" })
          processed += 1
        } else if (status === OrderStatus.Error || status === OrderStatus.Cancelled) {
          const result = await refundOrder(order.id, {
            source: "rbx_webhook",
            externalStatus: status,
            externalError: info.error?.message ?? undefined,
          })
          if (result.refunded) {
            processed += 1
          }
        } else if (
          status === OrderStatus.Pending ||
          status === OrderStatus.Processing ||
          status === OrderStatus.Queued ||
          status === OrderStatus.QueuedDeferred
        ) {
          await updateOrder(order.id, { status: "processing" })
        }
      } catch {
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
