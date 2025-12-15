import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { refundOrder, getOrder } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { orderId } = body as { orderId?: string }

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId обязателен" },
        { status: 400 },
      )
    }

    const localOrder = await getOrder(orderId)
    if (!localOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const targetId = localOrder.rbxOrderId || localOrder.id

    const client = await getAuthenticatedRbxClient()
    let result: unknown

    try {
      result = await client.orders.cancel({ orderId: targetId })
    } catch (error) {
      // If order is not found on RBX (404), we can force cancel locally
      const err = error as { statusCode?: number; name?: string; message?: string }
      if (err.statusCode === 404 || err.name === 'RbxCrateNotFoundError') {
        console.log(`[Cancel] Order ${targetId} not found on RbxCrate, forcing refund locally.`)
        result = { status: "Force Cancelled (Not Found)" }
      } else {
        // Re-throw other errors (e.g. rate limit, or cannot cancel completed order)
        throw error
      }
    }

    const refundResult = await refundOrder(orderId, {
      source: "admin_cancel",
      initiatorUserId: user.id,
      externalStatus: String((result as { status?: unknown })?.status ?? ""),
      externalError: String(
        (result as { error?: { message?: unknown } })?.error?.message ?? "Admin cancelled via API",
      ),
    })

    return NextResponse.json({
      success: true,
      result,
      refunded: refundResult.refunded,
      refundReason: refundResult.reason,
    })
  } catch (error) {
    console.error("POST /api/admin/rbx/orders/cancel error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
