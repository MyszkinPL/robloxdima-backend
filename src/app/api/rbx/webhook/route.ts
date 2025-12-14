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
    console.log(`[Webhook] Received from IP: ${ip}, Order: ${body.orderId}, Status: ${body.status}`)

    // Optional: Check IP whitelist (warn only for now to avoid blocking legitimate requests behind proxies)
    const isAllowedIp = RBXCRATE_WEBHOOK_IPS.some(allowedIp => ip.includes(allowedIp))
    if (!isAllowedIp) {
      console.warn(`[Webhook] Warning: Request from unauthorized IP: ${ip}`)
    }

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
      // We don't log the expected signature to avoid security risks, but we log that it failed.
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      )
    }

    const status = body.status
    const orderId = body.orderId

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
