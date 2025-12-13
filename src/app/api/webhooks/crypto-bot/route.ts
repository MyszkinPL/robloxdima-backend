import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSettings } from "@/lib/settings"
import { getPayment, addToUserBalance } from "@/lib/db"
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
          const text = `Ваш баланс пополнен на ${payment.amount.toFixed(
            2,
          )} ₽.`
          await sendTelegramNotification(
            settings.telegramBotToken,
            payment.userId,
            text,
          )
          console.log(
            `Success deposit: ${payment.amount} to user ${payment.userId}`,
          )
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
