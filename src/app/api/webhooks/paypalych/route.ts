import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import { sendTelegramNotification, escapeHtml } from "@/lib/telegram"
import crypto from "crypto"
import { Prisma } from "@prisma/client"

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

    // 🛑 ДОБАВИТЬ ЭТУ ПРОВЕРКУ: Сравниваем суммы
    // Paypalych может прислать строку "500.00", поэтому парсим
    const paidAmount = parseFloat(OutSum);
    const expectedAmount = Number(payment.amount); // В базе decimal/float

    // Допускаем небольшую погрешность (epsilon) для float сравнений
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error(`Fraud attempt? Paid: ${paidAmount}, Expected: ${expectedAmount}`);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    if (payment.status === "paid") {
      return NextResponse.json({ status: "OK" })
    }

    if (Status === "SUCCESS") {
      let didApply = false

      await prisma.$transaction(async (tx) => {
        const dbPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { user: true },
        })

        if (!dbPayment) return

        const updateResult = await tx.payment.updateMany({
          where: { id: dbPayment.id, status: { not: "paid" } },
          data: {
            status: "paid",
            providerData: JSON.stringify(body),
          },
        })

        if (updateResult.count === 0) return

        didApply = true

        await tx.user.update({
          where: { id: dbPayment.userId },
          data: {
            balance: { increment: dbPayment.amount },
          },
        })

        await tx.log.create({
          data: {
            userId: dbPayment.userId,
            action: "PURCHASE",
            details: `Пополнение баланса через Paypalych: ${new Prisma.Decimal(dbPayment.amount).toFixed(2)} RUB (ID: ${dbPayment.id})`,
          },
        })

        const referrerId = dbPayment.user.referrerId
        if (referrerId) {
          const bonus = new Prisma.Decimal(dbPayment.amount).mul(
            new Prisma.Decimal(settings.referralPercent).div(100),
          )
          if (bonus.gt(0)) {
            await tx.user.update({
              where: { id: referrerId },
              data: { referralBalance: { increment: bonus } },
            })
            await tx.log.create({
              data: {
                userId: referrerId,
                action: "referral_bonus",
                details: JSON.stringify({
                  paymentId: dbPayment.id,
                  fromUserId: dbPayment.userId,
                  amount: new Prisma.Decimal(dbPayment.amount).toFixed(2),
                  bonus: bonus.toFixed(2),
                  method: "paypalych",
                }),
              },
            })
          }
        }
      })

      // Уведомление пользователю
      if (didApply) {
        const text = `💎 <b>Баланс пополнен!</b>\n\n💰 <b>Сумма:</b> <code>${escapeHtml(payment.amount.toFixed(2))} ₽</code>\n💳 <b>Способ:</b> Paypalych\n\n✨ Теперь вы можете оплатить покупки!`
        await sendTelegramNotification(payment.userId, text)
      }

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
