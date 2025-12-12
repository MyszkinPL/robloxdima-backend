import { NextRequest, NextResponse } from "next/server"
import { createInvoice } from "@/lib/crypto-bot"
import { createPayment, Payment } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const amount = Number(body.amount)

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const description = `Пополнение баланса (${user.username || user.firstName})`
    const invoice = await createInvoice(amount, description, user.id)

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
