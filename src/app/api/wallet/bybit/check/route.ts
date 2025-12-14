import { NextRequest, NextResponse } from "next/server"
import { getPayment, prisma } from "@/lib/db"
import { queryBybitOrder } from "@/lib/bybit/service"
import { sendTelegramNotification } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { paymentId } = body
    
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 })
    }

    const payment = await getPayment(paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status === "paid") {
      return NextResponse.json({ success: true, alreadyPaid: true })
    }

    // Only handle bybit_pay method
    if (payment.method !== "bybit_pay") {
       return NextResponse.json({ error: "Invalid payment method for this endpoint" }, { status: 400 })
    }

    interface BybitProviderData {
      merchantTradeNo?: string;
      finalStatus?: string;
      [key: string]: unknown;
    }

    let providerData: BybitProviderData = {}
    try {
      providerData = typeof payment.providerData === 'string' 
        ? JSON.parse(payment.providerData) 
        : payment.providerData || {}
    } catch {
      // ignore
    }

    const merchantTradeNo = providerData.merchantTradeNo
    if (!merchantTradeNo) {
      return NextResponse.json({ error: "Missing merchantTradeNo" }, { status: 400 })
    }

    // Check Bybit Pay Status
    const response = await queryBybitOrder(merchantTradeNo)
    
    // Status can be: INITIAL, PROCESS, SUCCESS, CLOSED, REFUND, etc.
    // Based on snippet 4: status: "INITIAL"
    // Snippet 10: status: "PAY_SUCCESS"
    const orderStatus = response.result?.order?.status
    
    if (orderStatus === "PAY_SUCCESS" || orderStatus === "SUCCESS") {
       // Mark as paid
       await prisma.$transaction(async (tx) => {
         providerData.finalStatus = orderStatus
         
         await tx.payment.update({
           where: { id: payment.id },
           data: {
             status: "paid",
             providerData: JSON.stringify(providerData)
           }
         })

         await tx.user.update({
           where: { id: payment.userId },
           data: {
             balance: { increment: payment.amount }
           }
         })
         
         await tx.log.create({
            data: {
              userId: payment.userId,
              action: "payment_success",
              details: JSON.stringify({
                paymentId: payment.id,
                amount: payment.amount,
                method: "bybit_pay",
                bybitStatus: orderStatus
              })
            }
         })

         // Send notification
         const text = `💎 <b>Баланс пополнен!</b>\n\n💰 <b>Сумма:</b> <code>${payment.amount.toFixed(2)} ₽</code>\n💳 <b>Способ:</b> Bybit\n\n✨ Теперь вы можете оплатить покупки!`
         await sendTelegramNotification(payment.userId, text)
       })

       return NextResponse.json({ success: true, paid: true })
    }

    return NextResponse.json({ success: false, paid: false, status: orderStatus })

  } catch (error) {
    console.error("Check Bybit payment error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
