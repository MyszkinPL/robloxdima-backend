import { NextRequest, NextResponse } from "next/server"
import { createInvoice } from "@/lib/crypto-bot"
import { createPayment, Payment, getUser } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { rateLimit } from "@/lib/ratelimit"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    if (rateLimit(req, 5, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const botToken = req.headers.get("x-bot-token")
    const telegramId = req.headers.get("x-telegram-id")

    let userId: string | null = null

    if (botToken && telegramId) {
      const settings = await getSettings()
      if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      userId = String(telegramId)
    } else {
      const sessionUser = await getSessionUser()
      if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = sessionUser.id
    }

    const settings = await getSettings()
    if (settings.maintenance) {
      return NextResponse.json(
        { error: "Магазин на техническом обслуживании" },
        { status: 503 },
      )
    }

    const user = await getUser(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Ваш аккаунт заблокирован. Обратитесь в поддержку." },
        { status: 403 },
      )
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        status: "pending",
        method: "cryptobot",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "У вас уже есть ожидающий счет. Сначала оплатите или отмените его.",
          existingPayment: {
            id: existingPayment.id,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            status: existingPayment.status,
            invoiceUrl: existingPayment.invoiceUrl,
            createdAt: existingPayment.createdAt.toISOString(),
          },
        },
        { status: 409 },
      )
    }

    const body = await req.json()
    const rawAmount = Number(body.amount)

    if (!rawAmount || rawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const amount = Math.ceil(rawAmount * 100) / 100

    const description = `Пополнение баланса (${user.username || user.firstName})`
    // User requested to use the specific success page
    const invoice = await createInvoice(
      amount,
      description,
      user.id,
      "viewItem",
      "https://rbtrade.org/payment/success"
    )

    type InvoiceShape = {
      invoice_id: number | string
      bot_invoice_url?: string
      pay_url?: string
    }

    const anyInvoice = invoice as InvoiceShape
    const paymentUrl = anyInvoice.bot_invoice_url || anyInvoice.pay_url || ""
    const paymentId = String(anyInvoice.invoice_id)

    const payment: Payment = {
      id: paymentId,
      userId: user.id,
      amount,
      currency: "RUB",
      status: "pending",
      invoiceUrl: paymentUrl,
      createdAt: new Date().toISOString(),
      method: "cryptobot",
      providerData: null,
    }

    await createPayment(payment)

    return NextResponse.json({
      success: true,
      paymentUrl,
      paymentId,
    })
  } catch (error) {
    console.error("POST /api/wallet/topup error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Ошибка API: ${message}` },
      { status: 500 },
    )
  }
}
