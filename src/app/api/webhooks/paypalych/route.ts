import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import crypto from "crypto"
import { Payment } from "@/lib/db"

// PayPalych Postback Data
interface PaypalychPostback {
  Status: string
  InvId: string
  Commission: string
  CurrencyIn: string
  OutSum: string
  custom?: string
  SignatureValue: string
}

export async function POST(req: NextRequest) {
  try {
    const settings = await getSettings()
    if (!settings.isPaypalychEnabled || !settings.paypalychToken) {
      return NextResponse.json({ error: "Paypalych disabled or not configured" }, { status: 400 })
    }

    const body = await req.json() as PaypalychPostback
    
    const { Status, InvId, OutSum, SignatureValue } = body

    // Validate Signature
    // strtoupper(md5($OutSum . ":" . $InvId . ":" . $apiToken))
    const signatureString = `${OutSum}:${InvId}:${settings.paypalychToken}`
    const expectedSignature = crypto.createHash("md5").update(signatureString).digest("hex").toUpperCase()

    if (SignatureValue !== expectedSignature) {
      console.error("Invalid Paypalych signature", { received: SignatureValue, expected: expectedSignature, body })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Find payment by InvId (which is our Payment.id)
    const payment = await prisma.payment.findUnique({
      where: { id: InvId },
      include: { user: true }
    })

    if (!payment) {
      console.error("Payment not found", InvId)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status === "paid") {
      return NextResponse.json({ status: "OK" })
    }

    if (Status === "SUCCESS") {
      // Update payment status
      await prisma.$transaction(async (tx) => {
        // Mark payment as paid
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "paid",
            providerData: JSON.stringify(body)
          }
        })

        // Add balance to user
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            balance: { increment: payment.amount }
          }
        })

        // Log transaction
        await tx.log.create({
          data: {
            userId: payment.userId,
            action: "PURCHASE",
            details: `Пополнение баланса через Paypalych: ${payment.amount} RUB (ID: ${payment.id})`
          }
        })

        // Handle referral system (simplified version of what's in crypto-bot webhook)
        if (payment.user.referrerId) {
            const referrer = await tx.user.findUnique({
                where: { id: payment.user.referrerId }
            })
            
            if (referrer) {
                const bonus = payment.amount * (settings.referralPercent / 100)
                await tx.user.update({
                    where: { id: referrer.id },
                    data: {
                        referralBalance: { increment: bonus }
                    }
                })
            }
        }
      })
    } else if (Status === "FAIL") {
       await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "cancelled", // or failed
          providerData: JSON.stringify(body)
        }
      })
    }

    return NextResponse.json({ status: "OK" })
  } catch (error) {
    console.error("Paypalych webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
