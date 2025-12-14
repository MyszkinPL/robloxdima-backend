import { NextRequest, NextResponse } from "next/server"
import { createPayment, Payment, getUser } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { rateLimit } from "@/lib/ratelimit"
import { getSettings } from "@/lib/settings"
import crypto from "crypto"

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
    const method = body.method || "manual"

    if (!rawAmount || rawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const amount = Math.ceil(rawAmount * 100) / 100

    const providerData = body.providerData || {}

    // Generate a unique ID for manual payment
    const paymentId = crypto.randomUUID()

    const payment: Payment = {
      id: paymentId,
      userId: user.id,
      amount,
      currency: "RUB",
      status: "pending",
      invoiceUrl: undefined,
      createdAt: new Date().toISOString(),
      method: method, 
      providerData: JSON.stringify(providerData),
    }

    await createPayment(payment)

    return NextResponse.json({
      success: true,
      paymentId,
      providerData
    })
  } catch (error) {
    console.error("POST /api/wallet/manual error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Ошибка API: ${message}` },
      { status: 500 },
    )
  }
}
