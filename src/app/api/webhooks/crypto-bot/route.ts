import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSettings } from "@/lib/settings"
import { getPayment, addToUserBalance, addToReferralBalance } from "@/lib/db"
import { prisma } from "@/lib/prisma"

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
    const bodyText = await req.text()
    const signature = req.headers.get("crypto-pay-api-signature")
    const settings = await getSettings()

    if (!settings.cryptoBotToken) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }

    const secret = crypto
      .createHash("sha256")
      .update(settings.cryptoBotToken)
      .digest()
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex")

    if (!signature || signature !== computedSignature) {
      console.error("Invalid signature", {
        received: signature,
        computed: computedSignature,
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const body = JSON.parse(bodyText)

    if (body.update_type === "invoice_paid") {
      const invoice = body.payload
      const paymentId = invoice.invoice_id.toString()

      const updated = await prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: "pending",
        },
        data: {
          status: "paid",
        },
      })

      if (updated.count > 0) {
        const payment = await getPayment(paymentId)
        if (payment) {
          await addToUserBalance(payment.userId, payment.amount)
          const text = `💎 <b>Ваш баланс пополнен!</b>\n\n💰 Сумма: <code>${payment.amount.toFixed(2)} ₽</code>\n✨ Теперь вы можете оплатить свои покупки!`
          await sendTelegramNotification(
            settings.telegramBotToken,
            payment.userId,
            text,
          )
          console.log(
            `Success deposit: ${payment.amount} to user ${payment.userId}`,
          )
          
          // Referral Bonus
          const user = await prisma.user.findUnique({ where: { id: payment.userId } })
          if (user && user.referrerId) {
             const bonus = payment.amount * (settings.referralPercent / 100)
             if (bonus > 0) {
                await addToReferralBalance(user.referrerId, bonus)
                await sendTelegramNotification(
                  settings.telegramBotToken,
                  user.referrerId,
                  `💸 <b>Реферальный бонус!</b>\n\nВам начислено <code>${bonus.toFixed(2)} ₽</code> за активность вашего реферала ${user.firstName}. Так держать! 🚀`
                )
              }
          }
        }
      } else {
        console.log("Invoice already processed or not found")
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 },
    )
  }
}
