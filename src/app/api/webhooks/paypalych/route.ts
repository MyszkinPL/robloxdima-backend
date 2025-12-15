import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import { sendTelegramNotification, escapeHtml } from "@/lib/telegram"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const settings = await getSettings()
    if (!settings.isPaypalychEnabled || !settings.paypalychToken) {
      return NextResponse.json({ error: "Paypalych disabled or not configured" }, { status: 400 })
    }

    // ИСПРАВЛЕНИЕ: Paypalych шлет x-www-form-urlencoded, а не JSON
    const contentType = req.headers.get("content-type") || ""
    let body: Record<string, string> = {}

    if (contentType.includes("application/json")) {
        body = await req.json()
    } else {
        const formData = await req.formData()
        formData.forEach((value, key) => {
            body[key] = value.toString()
        })
    }
    
    const { Status, InvId, OutSum, SignatureValue } = body

    // Проверка наличия данных
    if (!InvId || !OutSum || !SignatureValue) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate Signature
    // strtoupper(md5($OutSum . ":" . $InvId . ":" . $apiToken))
    // Issue 5a Fix: Use OutSum from request body, not from DB payment.amount
    const signatureString = `${OutSum}:${InvId}:${settings.paypalychToken}`
    const expectedSignature = crypto.createHash("md5").update(signatureString).digest("hex").toUpperCase()

    if (SignatureValue.toUpperCase() !== expectedSignature) {
      console.error("Invalid Paypalych signature", { received: SignatureValue, expected: expectedSignature, body })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: InvId },
      include: { user: true }
    })

    if (!payment) {
      console.error("Payment not found", InvId)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status === "paid") {
      return NextResponse.json({ status: "OK" })
    }

    if (Status === "SUCCESS") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "paid",
            providerData: JSON.stringify(body)
          }
        })

        await tx.user.update({
          where: { id: payment.userId },
          data: {
            balance: { increment: payment.amount }
          }
        })

        await tx.log.create({
          data: {
            userId: payment.userId,
            action: "PURCHASE",
            details: `Пополнение баланса через Paypalych: ${payment.amount} RUB (ID: ${payment.id})`
          }
        })

        // Referral logic
        if (payment.user.referrerId) {
            const referrer = await tx.user.findUnique({
                where: { id: payment.user.referrerId }
            })
            if (referrer) {
                const bonus = payment.amount.mul(settings.referralPercent / 100)
                await tx.user.update({
                    where: { id: referrer.id },
                    data: { referralBalance: { increment: bonus } }
                })
                // Отправка уведомления рефереру (выносим из транзакции или используем внутри, если функция не асинхронная долгая)
            }
        }
      })

      // Уведомление пользователю
      const text = `💎 <b>Баланс пополнен!</b>\n\n💰 <b>Сумма:</b> <code>${escapeHtml(payment.amount.toFixed(2))} ₽</code>\n💳 <b>Способ:</b> Paypalych\n\n✨ Теперь вы можете оплатить покупки!`
      await sendTelegramNotification(payment.userId, text)

    } else if (Status === "FAIL") {
       await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "expired", // Используем expired или failed
          providerData: JSON.stringify(body)
        }
      })
    }

    return NextResponse.json({ status: "OK" })
  } catch (error) {
    console.error("Paypalych webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
