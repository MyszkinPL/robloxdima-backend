import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = sessionUser.id

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.referralBalance <= 0) {
        return NextResponse.json({ error: "No funds to transfer" }, { status: 400 })
    }

    const amount = user.referralBalance

    // Transaction to ensure atomicity
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                referralBalance: { set: 0 },
                balance: { increment: amount }
            }
        })
    ])

    return NextResponse.json({ success: true, transferred: amount })

  } catch (error) {
    console.error("POST /api/referrals/transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
