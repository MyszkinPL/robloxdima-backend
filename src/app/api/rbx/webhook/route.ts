import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { getOrder, refundOrder, updateOrder } from "@/lib/db"
import { isValidRbxcrateSign, RBXCRATE_WEBHOOK_IPS } from "@/lib/rbxcrate/utils/verify"
import { OrderStatus, RbxCrateWebhook } from "@/lib/rbxcrate/types"

async function sendTelegramNotification(
  token: string | null | undefined,
  chatId: string,
  text: string,
) {
  if (!token) {
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })
  } catch (error) {
    console.error("Failed to send Telegram notification:", error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RbxCrateWebhook
    const ip = req.headers.get("x-forwarded-for") || "unknown"

    // Log incoming webhook for debugging
    console.log(`[Webhook] Received from IP: ${ip}, Body: ${JSON.stringify(body)}`)

    // Verify signature first - this is the most secure check
    const settings = await getSettings()
    const apiKey = settings.rbxKey

    if (!apiKey) {
      console.error("[Webhook] Error: API key is not configured")
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      )
    }

    const isValid = isValidRbxcrateSign(body, apiKey)
    if (!isValid) {
      console.error(`[Webhook] Error: Invalid signature for order ${body.orderId}`)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      )
    }

    // IP Check (Optional since signature is valid)
    // We only warn if IP is not whitelisted, but we proceed because signature is valid.
    const isAllowedIp = RBXCRATE_WEBHOOK_IPS.some(allowedIp => ip.includes(allowedIp))
    if (!isAllowedIp) {
      // Check if it's a Cloudflare IP (simplified check or just suppress for now)
      // Since signature is valid, we trust this request.
      // console.warn(`[Webhook] Info: Request from non-whitelisted IP: ${ip} (Signature Valid)`)
    }

    const status = body.status
    // Try to find the correct order ID
    // RBXCrate might return the orderId as a UUID without dashes, or in the 'uuid' field
    let orderId = body.orderId
    
    // Helper to format UUID if it's stripped of dashes
    const formatUuid = (id: string) => {
      if (id && id.length === 32 && /^[0-9a-fA-F]+$/.test(id)) {
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
      }
      return id
    }

    // Try finding the order
    let order = await getOrder(orderId)
    
    if (!order && body.uuid) {
      // Try the uuid field
      order = await getOrder(body.uuid)
      if (order) orderId = body.uuid
    }

    if (!order) {
      // Try formatting orderId as UUID
      const formattedId = formatUuid(orderId)
      if (formattedId !== orderId) {
        order = await getOrder(formattedId)
        if (order) orderId = formattedId
      }
    }

    if (!order && body.uuid) {
      // Try formatting uuid field as UUID
      const formattedUuid = formatUuid(body.uuid)
      if (formattedUuid !== body.uuid) {
        order = await getOrder(formattedUuid)
        if (order) orderId = formattedUuid
      }
    }

    if (!order) {
      console.error(`[Webhook] Error: Order not found for IDs: orderId=${body.orderId}, uuid=${body.uuid}`)
      // Return 200 to prevent retries if we can't find the order (it might have been deleted)
      // Or return 404? RBXCrate might retry on 404. 
      // Better to return 200 with success: false to stop retries if it's a permanent error?
      // But maybe it's a sync issue. Let's return 404.
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      )
    }

    let refunded = false
    let refundReason: string | null = null
    let notifyStatus: "completed" | "refunded" | null = null

    if (status === OrderStatus.Error || status === OrderStatus.Cancelled) {
      const refundResult = await refundOrder(orderId, {
        source: "rbx_webhook",
        externalStatus: status,
        externalError: body.error?.message ?? undefined,
      })

      refunded = refundResult.refunded
      refundReason = refundResult.reason
      if (refundResult.refunded) {
        notifyStatus = "refunded"
      }
    } else if (status === OrderStatus.Completed) {
      await updateOrder(orderId, { status: "completed" })
      notifyStatus = "completed"
    } else if (
      status === OrderStatus.Pending ||
      status === OrderStatus.Processing ||
      status === OrderStatus.Queued ||
      status === OrderStatus.QueuedDeferred
    ) {
      await updateOrder(orderId, { status: "processing" })
    }

    if (notifyStatus && settings.telegramBotToken) {
      const order = await getOrder(orderId)
      if (order) {
        const text =
          notifyStatus === "completed"
            ? `✅ <b>Заказ выполнен!</b>\n\n🆔 <b>Заказ:</b> <code>${order.id}</code>\n📦 Робуксы будут начислены в ближайшее время.`
            : `❌ <b>Заказ отменён</b>\n\n🆔 <b>Заказ:</b> <code>${order.id}</code>\n💰 Средства возвращены на баланс.`
        await sendTelegramNotification(
          settings.telegramBotToken,
          order.userId,
          text,
        )
      }
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
