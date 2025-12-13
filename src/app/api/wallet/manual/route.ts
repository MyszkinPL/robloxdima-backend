import { NextRequest, NextResponse } from "next/server"
import { createPayment, Payment, getUser } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { rateLimit } from "@/lib/ratelimit"
import { getSettings } from "@/lib/settings"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { getRubToUsdtRate } from "@/lib/crypto-bot"

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

    let providerData = body.providerData || {}

    // If method is bybit_manual, calculate USDT amount for auto-verification
    if (method === "bybit_manual") {
      try {
        const rate = await getRubToUsdtRate()
        let baseUsdt = amount * rate
        // Round to 2 decimals
        baseUsdt = Math.floor(baseUsdt * 100) / 100

        // Find a unique amount by adding small jitter
        // Try up to 20 times to find a unique amount slot
        let uniqueUsdt = baseUsdt
        let isUnique = false
        
        // Check against pending payments in the last 30 minutes
        const recentPending = await prisma.payment.findMany({
          where: {
            method: "bybit_manual",
            status: "pending",
            createdAt: {
              gte: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            }
          }
        })

        const usedAmounts = new Set(
          recentPending.map(p => {
            try {
              const data = typeof p.providerData === 'string' ? JSON.parse(p.providerData) : p.providerData
              return data?.amountUsdt
            } catch {
              return null
            }
          }).filter(a => a)
        )

        for (let i = 0; i < 50; i++) {
          // Add random jitter between 0.00 and 0.10
          const jitter = i === 0 ? 0 : Number((Math.random() * 0.10).toFixed(2))
          const candidate = Number((baseUsdt + jitter).toFixed(2))
          
          if (!usedAmounts.has(candidate)) {
            uniqueUsdt = candidate
            isUnique = true
            break
          }
        }

        if (!isUnique) {
          // Fallback if too many collisions (unlikely)
          uniqueUsdt = baseUsdt + Number((Math.random() * 0.50).toFixed(2))
        }

        providerData = {
          ...providerData,
          amountUsdt: uniqueUsdt,
          targetUid: settings.bybitStoreUid,
          rate: rate
        }
      } catch (e) {
        console.error("Error calculating USDT amount:", e)
        // Fallback to manual without auto-check details if rate fails
      }
    }

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
