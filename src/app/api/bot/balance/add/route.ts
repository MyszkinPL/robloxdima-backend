import { NextRequest, NextResponse } from "next/server"
import { addToUserBalance, createPayment, Payment, getUser } from "@/lib/db"
import { getSettings } from "@/lib/settings"

export async function POST(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")
    if (!botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await getSettings()
    if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, amount, source, paymentId, providerData } = body

    if (!userId || !amount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const user = await getUser(String(userId))
    if (!user) {
        // Create user if not exists (sync)? 
        // Usually bot syncs user before payment, but safe to check.
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 1. Create completed payment record
    const payment: Payment = {
      id: paymentId || `stars_${Date.now()}_${userId}`,
      userId: String(userId),
      amount: Number(amount),
      currency: "RUB",
      status: "paid",
      invoiceUrl: undefined,
      createdAt: new Date().toISOString(),
      method: source || "stars",
      providerData: providerData ? JSON.stringify(providerData) : null
    }

    await createPayment(payment)

    // 2. Add balance
    await addToUserBalance(String(userId), Number(amount))

    return NextResponse.json({ success: true, newBalance: user.balance + Number(amount) })
  } catch (error) {
    console.error("POST /api/bot/balance/add error:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
