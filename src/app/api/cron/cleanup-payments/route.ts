import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const result = await prisma.payment.updateMany({
      where: {
        status: "pending",
        createdAt: {
          lt: cutoff,
        },
      },
      data: {
        status: "expired",
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

