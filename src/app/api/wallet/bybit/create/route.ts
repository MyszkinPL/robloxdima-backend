import { NextRequest, NextResponse } from "next/server"
import { prisma, logAction } from "@/lib/db"
import { createBybitPayment } from "@/lib/bybit/service"
import { getRubToUsdtRate } from "@/lib/crypto-bot"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, telegramId } = body // amount in RUB

    if (!amount || !telegramId) {
      return NextResponse.json({ error: "Missing amount or telegramId" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: String(telegramId) }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Convert RUB to USDT
    const rate = await getRubToUsdtRate()
    const amountUsdt = Number((amount * rate).toFixed(2))

    if (amountUsdt < 1) {
        return NextResponse.json({ error: "Minimum amount is 1 USDT" }, { status: 400 })
    }

    // Create Bybit Pay Order
    let orderResult
    try {
        orderResult = await createBybitPayment(amountUsdt, user.id, `Topup ${amount} RUB`)
    } catch (e: any) {
        console.error("Bybit Pay creation failed:", e)
        return NextResponse.json({ error: e.message || "Failed to create Bybit order" }, { status: 500 })
    }

    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        id: orderResult.merchantTradeNo, // Use our generated UUID
        userId: user.id,
        amount: amount, // Store in RUB as that's the base currency for balance
        currency: "RUB",
        method: "bybit_pay",
        status: "pending",
        providerData: JSON.stringify(orderResult)
      }
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      payUrl: orderResult.webUrl || orderResult.appUrl, // Need to verify what Bybit returns
      qrCode: orderResult.qrCode, // Hypothetical
      amountUsdt,
      ...orderResult
    })

  } catch (error) {
    console.error("Create Bybit payment error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
