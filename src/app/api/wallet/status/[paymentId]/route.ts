import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getPayment, updatePaymentStatus, addToUserBalance, addToReferralBalance, getUser } from "@/lib/db"
import { checkInvoice } from "@/lib/crypto-bot"
import { getSettings } from "@/lib/settings"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
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

    const invoice = await checkInvoice(Number(paymentId))
    const status = (invoice as { status?: string } | undefined)?.status ?? "pending"

    if (status === "paid") {
      await updatePaymentStatus(paymentId, "paid")
      await addToUserBalance(payment.userId, payment.amount)
      
      // Referral Bonus
      if (user.referrerId) {
         const settings = await getSettings()
         const bonus = payment.amount * (settings.referralPercent / 100)
         if (bonus > 0) {
           await addToReferralBalance(user.referrerId, bonus)
         }
      }

      return NextResponse.json({
        success: true,
        status: "paid",
        message: "Payment confirmed!",
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
