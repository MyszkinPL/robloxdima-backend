import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getOrderRefundInfo } from "@/lib/db"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { orderId } = await context.params

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      )
    }

    const refundInfo = await getOrderRefundInfo(orderId)
    return NextResponse.json(refundInfo)
  } catch (error) {
    console.error("GET /api/admin/orders/refund-info error:", error)
    return NextResponse.json(
      { error: "Failed to fetch refund info" },
      { status: 500 },
    )
  }
}

