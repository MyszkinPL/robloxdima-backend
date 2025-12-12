import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getPayment, updatePaymentStatus, addToUserBalance } from "@/lib/db"
import { checkInvoice } from "@/lib/crypto-bot"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await context.params

    const user = await getSessionUser()
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
