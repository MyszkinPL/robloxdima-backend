import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { getOrder, getOrderByRbxId, refundOrder, updateOrder } from "@/lib/db"
import { isValidRbxcrateSign, RBXCRATE_WEBHOOK_IPS } from "@/lib/rbxcrate/utils/verify"
import { OrderStatus, RbxCrateWebhook } from "@/lib/rbxcrate/types"
import { sendTelegramNotification, escapeHtml } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  try {
    // Read raw text for correct signature verification
    const rawBody = await req.text()
    
    let body: RbxCrateWebhook
    try {
        body = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown"

    // Log incoming webhook for debugging
    console.log(`[Webhook] Received from IP: ${ip}, Body: ${rawBody}`)

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

    // We verify using the parsed body because isValidRbxcrateSign handles the logic
    // of removing 'sign' and re-stringifying.
    // While there's a theoretical risk of key reordering, this is the standard way
    // unless we manually parse the raw string which is error prone.
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

    // Check by rbxOrderId if not found
    if (!order) {
      order = await getOrderByRbxId(orderId)
      if (order) orderId = order.id
    }
    
    if (!order && body.uuid) {
      // Try the uuid field
      order = await getOrder(body.uuid)
      if (order) orderId = body.uuid
      
      // Try the uuid field as rbxOrderId
      if (!order) {
        order = await getOrderByRbxId(body.uuid)
        if (order) orderId = order.id
      }
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

    // Try finding by ID directly from the body if it differs (some providers send different fields)
    if (!order && typeof body.orderId === 'string') {
        // Try exact match again just in case
         order = await getOrder(body.orderId)
    }

    if (!order) {
      console.error(`[Webhook] Error: Order not found for IDs: orderId=${body.orderId}, uuid=${body.uuid}`)
      // Return 200 OK to stop RBXCrate from retrying if we really can't find it, 
      // otherwise they will spam us. But usually 404 is correct. 
      // However, if we can't find it, we can't process it.
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      )
    }

    // Idempotency check: If order is already in a final state, don't process again
    // ИСПРАВЛЕНИЕ: Мы убрали предварительную проверку статуса для CANCELLED/ERROR, 
    // чтобы предотвратить гонку состояний (Double Refund). 
    // Теперь мы сразу вызываем refundOrder, который атомарно (в транзакции) проверит статус.
    if (
      (status !== OrderStatus.Error && status !== OrderStatus.Cancelled) && 
      (order.status === "completed" ||
      order.status === "cancelled" ||
      order.status === "failed")
    ) {
      console.log(`[Webhook] Order ${orderId} is already ${order.status}. Ignoring webhook update to ${status}.`)
      return NextResponse.json({
        success: true,
        orderId,
        status: order.status,
        alreadyProcessed: true
      })
    }

    let refunded = false
    let refundReason: string | null = null
    let notifyStatus: "completed" | "refunded" | "processing" | null = null

    if (status === OrderStatus.Error || status === OrderStatus.Cancelled) {
      // ИСПРАВЛЕНИЕ: Не проверяем order.status здесь. Доверяем refundOrder и его транзакции.
      const refundResult = await refundOrder(orderId, {
        source: "rbx_webhook",
        externalStatus: status,
        externalError: body.error?.message ?? undefined,
      })

      refunded = refundResult.refunded
      refundReason = refundResult.reason
      if (refundResult.refunded) {
        notifyStatus = "refunded"
      } else {
          // Если возврат не прошел (например, уже отменен), логируем это, но отвечаем OK вебхуку
          console.log(`[Webhook] Refund skipped for ${orderId}: ${refundResult.reason}`);
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
      if (order.status !== "processing") {
        await updateOrder(orderId, { status: "processing" })
        notifyStatus = "processing"
      }
    }

    if (notifyStatus) {
      const order = await getOrder(orderId)
      if (order) {
        let text = ""
        if (notifyStatus === "completed") {
           text = `✅ <b>Заказ выполнен!</b>\n\n🆔 <b>ID:</b> <code>${escapeHtml(order.id)}</code>\n📦 <b>Робуксы:</b> <code>${order.amount}</code>\n💰 <b>Сумма:</b> <code>${order.price} ₽</code>\n\n🎉 Робуксы успешно отправлены! Спасибо за покупку!`
        } else if (notifyStatus === "refunded") {
           text = `❌ <b>Заказ отменен</b>\n\n🆔 <b>ID:</b> <code>${escapeHtml(order.id)}</code>\n💰 <b>Возврат:</b> <code>${order.price} ₽</code>\n\n⚠️ Причина: ${escapeHtml(refundReason || "Ошибка выполнения")}\nСредства возвращены на баланс.`
        } else if (notifyStatus === "processing") {
           text = `⏳ <b>Заказ в обработке</b>\n\n🆔 <b>ID:</b> <code>${escapeHtml(order.id)}</code>\n📦 <b>Робуксы:</b> <code>${order.amount}</code>\n\n🚀 Мы начали выполнение заказа. Ожидайте поступления!`
        }
        
        if (text) {
          await sendTelegramNotification(
            order.userId,
            text,
          )
        }
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
