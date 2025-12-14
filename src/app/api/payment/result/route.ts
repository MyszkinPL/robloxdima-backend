import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSettings } from "@/lib/settings"
import { getPayment, addToUserBalance, addToReferralBalance } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { sendTelegramNotification } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    
    // Check for CryptoBot signature
    const cryptoSignature = req.headers.get("crypto-pay-api-signature")
    if (cryptoSignature) {
        const settings = await getSettings()
        
        if (!settings.cryptoBotToken) {
             console.error("CryptoBot token not configured")
             return NextResponse.json({ error: "Not configured" }, { status: 500 })
        }

        const secret = crypto.createHash("sha256").update(settings.cryptoBotToken).digest()
        const computedSignature = crypto.createHmac("sha256", secret).update(bodyText).digest("hex")

        if (cryptoSignature !== computedSignature) {
            console.error("Invalid CryptoBot signature")
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
                  const text = `💎 <b>Баланс пополнен!</b>\n\n💰 <b>Сумма:</b> <code>${payment.amount.toFixed(2)} ₽</code>\n\n✨ Теперь вы можете оплатить покупки!`
                  await sendTelegramNotification(
                    payment.userId,
                    text,
                  )
                  console.log(
                    `Success deposit (Result URL): ${payment.amount} to user ${payment.userId}`,
                  )
                  
                  // Referral Bonus
                  const user = await prisma.user.findUnique({ where: { id: payment.userId } })
                  if (user && user.referrerId) {
                     const bonus = payment.amount * (settings.referralPercent / 100)
                     if (bonus > 0) {
                        await addToReferralBalance(user.referrerId, bonus)
                        await sendTelegramNotification(
                          user.referrerId,
                          `💸 <b>Реферальный бонус!</b>\n\n💰 <b>Сумма:</b> <code>${bonus.toFixed(2)} ₽</code>\n👤 <b>Реферал:</b> ${user.firstName}\n\n🚀 Спасибо, что приглашаете друзей!`
                        )
                      }
                  }
                }
              }
        }
        return NextResponse.json({ ok: true })
    }

    const contentType = req.headers.get("content-type") || ""
    let body: any = {}

    if (contentType.includes("application/json")) {
      try {
        body = JSON.parse(bodyText)
      } catch (e) {
        body = {}
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(bodyText)
      body = Object.fromEntries(params.entries())
    } else {
      body = bodyText
    }

    console.log("Payment Result Callback:", body)
    
    // TODO: Implement specific payment provider verification here
    // Example: verify signature, find payment by ID, update status
    
    // Most providers expect "OK" or 200 status
    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("Payment Result Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
    return POST(req)
}
