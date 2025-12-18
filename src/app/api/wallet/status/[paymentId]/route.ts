import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getPayment, getUser } from "@/lib/db"
import { checkInvoice } from "@/lib/crypto-bot"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/ratelimit"
import { Prisma } from "@prisma/client"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
    if (rateLimit(req, 30, 60000)) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    }

    const { paymentId } = await context.params

    // Try session auth
    let user = await getSessionUser()
    
    // Try bot auth if no session
    if (!user) {
        const botToken = req.headers.get("x-bot-token")
        const telegramId = req.headers.get("x-telegram-id")
        
        if (botToken && telegramId) {
             const settings = await getSettings()
             if (settings.telegramBotToken === botToken) {
                user = (await getUser(telegramId)) || null
            }
        }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const payment = await getPayment(paymentId)

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      )
    }

    if (payment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      )
    }

    if (payment.status === "paid") {
      return NextResponse.json({
        success: true,
        status: "paid",
        message: "Already paid",
      })
    }

    // Fix: Check payment method to avoid NaN error for string IDs (Paypalych)
    if (payment.method === "paypalych") {
        // For Paypalych, we rely on webhooks updating the status in DB.
        // We just return the current status from DB.
        return NextResponse.json({ success: true, status: payment.status })
    }

    // Logic for CryptoBot
    const invoice = await checkInvoice(Number(paymentId))
    const status = (invoice as { status?: string } | undefined)?.status ?? "pending"

    if (status === "paid") {
      const settings = await getSettings()

      await prisma.$transaction(async (tx) => {
        const dbPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: { user: true },
        })

        if (!dbPayment) return

        const existingProviderDataRaw = dbPayment.providerData
        const existingProviderData =
          typeof existingProviderDataRaw === "string" ? existingProviderDataRaw : null
        const providerDataObj =
          existingProviderData ? (JSON.parse(existingProviderData) as Record<string, unknown>) : {}

        const updateResult = await tx.payment.updateMany({
          where: { id: paymentId, status: { not: "paid" } },
          data: {
            status: "paid",
            providerData: JSON.stringify({
              ...providerDataObj,
              paidVia: "cryptobot",
              paidAt: new Date().toISOString(),
            }),
          },
        })

        if (updateResult.count === 0) return

        await tx.user.update({
          where: { id: dbPayment.userId },
          data: { balance: { increment: dbPayment.amount } },
        })

        await tx.log.create({
          data: {
            userId: dbPayment.userId,
            action: "PURCHASE",
            details: `Пополнение баланса через CryptoBot: ${dbPayment.amount.toFixed(2)} RUB (ID: ${dbPayment.id})`,
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
                  amount: dbPayment.amount.toFixed(2),
                  bonus: bonus.toFixed(2),
                  method: "cryptobot",
                }),
              },
            })
          }
        }
      })

      return NextResponse.json({
        success: true,
        status: "paid",
        message: "Payment confirmed!",
      })
    }

    if (status === "expired") {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: { not: "paid" } },
        data: { status: "expired" },
      })
      return NextResponse.json({
        success: true,
        status: "expired",
        message: "Invoice expired",
      })
    }

    return NextResponse.json({
      success: true,
      status,
      message: "Payment pending...",
    })
  } catch (error) {
    console.error("GET /api/wallet/status error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check status" },
      { status: 500 },
    )
  }
}
