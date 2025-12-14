import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all logs related to order refunds
    // We look for action "order_refund"
    // details should contain orderId
    
    // Since details is JSON string, we can't easily query specific fields in all DBs, 
    // but Prisma supports filtering if JSON, but here it is String.
    // So we fetch logs with action "order_refund"
    
    const logs = await prisma.log.findMany({
      where: {
        action: "order_refund",
      },
      orderBy: { createdAt: "desc" },
    })

    // Map logs to a dictionary: orderId -> RefundInfo
    const refundMap: Record<string, any> = {}

    logs.forEach((log) => {
      try {
        if (!log.details) return
        const parsed = JSON.parse(log.details)
        if (parsed.orderId) {
            // If multiple refunds (shouldn't happen for same order usually, but latest wins)
            if (!refundMap[parsed.orderId]) {
                refundMap[parsed.orderId] = {
                    refunded: true,
                    source: parsed.source,
                    initiatorUserId: parsed.initiatorUserId,
                    createdAt: log.createdAt
                }
            }
        }
      } catch (e) {
        // ignore parse errors
      }
    })

    return NextResponse.json({ refunds: refundMap })
  } catch (error) {
    console.error("GET /api/admin/orders/refunds error:", error)
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 },
    )
  }
}
