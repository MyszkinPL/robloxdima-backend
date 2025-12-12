import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { refundOrder, updateOrder } from "@/lib/db"
import { isValidRbxcrateSign } from "@/lib/rbxcrate/utils/verify"
import { OrderStatus, RbxCrateWebhook } from "@/lib/rbxcrate/types"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RbxCrateWebhook

    const settings = await getSettings()
    const apiKey =
      settings.rbxKey || process.env.RBXCRATE_API_KEY || ""

    if (!apiKey) {
      console.error("RBXCrate webhook received but API key is not configured")
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      )
    }

    const isValid = isValidRbxcrateSign(body, apiKey)
    if (!isValid) {
      console.error("Invalid RBXCrate webhook signature for order", body.orderId)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      )
    }

    const status = body.status
    const orderId = body.orderId

    let refunded = false
    let refundReason: string | null = null

    if (status === OrderStatus.Error || status === OrderStatus.Cancelled) {
      const refundResult = await refundOrder(orderId, {
        source: "rbx_webhook",
        externalStatus: status,
        externalError: body.error?.message ?? undefined,
      })

      refunded = refundResult.refunded
      refundReason = refundResult.reason
    } else if (status === OrderStatus.Completed) {
      await updateOrder(orderId, { status: "completed" })
    } else if (
      status === OrderStatus.Pending ||
      status === OrderStatus.Processing ||
      status === OrderStatus.Queued ||
      status === OrderStatus.QueuedDeferred
    ) {
      await updateOrder(orderId, { status: "processing" })
    }

    return NextResponse.json({
      success: true,
      orderId,
      status,
      refunded,
      refundReason,
    })
  } catch (error) {
    console.error("POST /api/rbx/webhook error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

