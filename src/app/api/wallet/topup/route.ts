import { NextRequest, NextResponse } from "next/server"
import { createInvoice } from "@/lib/crypto-bot"
import { paypalych } from "@/lib/paypalych"
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

    const body = await req.json()
    const rawAmount = Number(body.amount)
    const method = body.method === "paypalych" ? "paypalych" : "cryptobot"
    const subMethod = body.subMethod // "sbp" | "card" | undefined

    if (!rawAmount || rawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // ИСПРАВЛЕНИЕ: Защита от DDoS базы данных "зависшими" платежами.
    // Ограничиваем количество неоплаченных счетов для одного пользователя.
    const pendingCount = await prisma.payment.count({
        where: {
            userId: user.id,
            status: "pending"
        }
    });

    if (pendingCount >= 3) {
        return NextResponse.json(
            { error: "У вас слишком много неоплаченных счетов. Оплатите или отмените старые." },
            { status: 400 }
        );
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (existingPayment) {
      // Automatically cancel the existing payment to allow creating a new one
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { status: "cancelled" }
      })
    }

    const amount = Math.ceil(rawAmount * 100) / 100
    const description = `Пополнение баланса (${user.username || user.firstName})`

    // Determine Base URL dynamically
    const host = req.headers.get("host") || "rbtrade.org"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    let paymentUrl = ""
    let paymentId = ""
    let amountToPay = amount // Amount to be billed (includes commission)

    if (method === "paypalych") {
      if (!settings.isPaypalychEnabled) {
        return NextResponse.json({ error: "Метод оплаты временно недоступен" }, { status: 400 })
      }
      if (!settings.paypalychShopId || !settings.paypalychToken) {
        return NextResponse.json({ error: "Метод оплаты не настроен" }, { status: 500 })
      }

      // Generate a custom ID for PayPalych order_id
      const orderId = `${userId.slice(0, 5)}-${Date.now()}`
      
      // Calculate amount with commission
      let commission = 0;
      if (subMethod === "sbp") {
        commission = settings.paypalychCommissionSBP;
      } else {
        commission = settings.paypalychCommissionCard; // Default to card or other
      }
      
      amountToPay = Math.ceil((amount + (amount * commission / 100)) * 100) / 100;
      
      const bill = await paypalych.createBill({
        amount: amountToPay,
        shop_id: settings.paypalychShopId,
        order_id: orderId,
        description: description,
        type: "NORMAL",
        currency_in: "RUB",
        payer_pays_commission: 1, // Customer pays commission
        success_url: `${baseUrl}/payment/success`,
        fail_url: `${baseUrl}/payment/fail`,
        payment_method: subMethod === "sbp" ? "SBP" : subMethod === "card" ? "BANK_CARD" : undefined,
      })

      paymentUrl = bill.link_page_url
      paymentId = orderId
    } else {
      // CryptoBot
      if (!settings.isCryptoBotEnabled) {
        return NextResponse.json({ error: "Метод оплаты временно недоступен" }, { status: 400 })
      }

      if (settings.cryptoBotCommission > 0) {
        amountToPay = amount + (amount * settings.cryptoBotCommission / 100)
        amountToPay = Math.ceil(amountToPay * 100) / 100
      }

      const invoice = await createInvoice(
        amountToPay,
        description,
        user.id,
        "viewItem",
        `${baseUrl}/payment/success`
      )
  
      type InvoiceShape = {
        invoice_id: number | string
        bot_invoice_url?: string
        pay_url?: string
      }
  
      const anyInvoice = invoice as InvoiceShape
      paymentUrl = anyInvoice.bot_invoice_url || anyInvoice.pay_url || ""
      paymentId = String(anyInvoice.invoice_id)
    }

    const payment: Payment = {
      id: paymentId,
      userId: user.id,
      amount: amount, // Amount to credit (without commission)
      currency: "RUB",
      status: "pending",
      invoiceUrl: paymentUrl,
      createdAt: new Date().toISOString(),
      method: method,
      providerData: JSON.stringify({ 
        commissionAdded: Math.ceil((amountToPay - amount) * 100) / 100, 
        totalBill: amountToPay 
      }),
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
