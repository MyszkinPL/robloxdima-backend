import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = sessionUser.id

    // Fix: Race Condition - Use transaction for read and update
    const transferredAmount = await prisma.$transaction(async (tx) => {
        // 1. Block and read fresh balance inside transaction
        const user = await tx.user.findUnique({
            where: { id: userId }
        })
        
        if (!user || user.referralBalance.lte(0)) {
            return 0
        }

        const amount = user.referralBalance

        // 2. Zero out and credit
        await tx.user.update({
            where: { id: userId },
            data: {
                referralBalance: 0, // Set to exactly 0
                balance: { increment: amount }
            }
        })
        
        // 3. Log action (optional but good practice)
        await tx.log.create({
            data: {
                userId,
                action: "REF_TRANSFER",
                details: `Transfer ${amount} from referral balance`
            }
        })

        return amount
    })

    if (transferredAmount === 0) {
        return NextResponse.json({ error: "No funds to transfer" }, { status: 400 })
    }

    return NextResponse.json({ success: true, transferred: transferredAmount })

  } catch (error) {
    console.error("POST /api/referrals/transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
