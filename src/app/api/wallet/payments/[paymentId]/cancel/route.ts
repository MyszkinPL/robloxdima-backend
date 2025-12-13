import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getPayment, updatePaymentStatus } from "@/lib/db"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { paymentId } = await context.params

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

    if (payment.method !== "cryptobot" || payment.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Нельзя отменить этот платеж" },
        { status: 400 },
      )
    }

    await updatePaymentStatus(paymentId, "expired")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/wallet/payments/[paymentId]/cancel error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cancel payment" },
      { status: 500 },
    )
  }
}

