import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUserOrders } from "@/lib/db"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orders = await getUserOrders(user.id)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("GET /api/orders/my error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    )
  }
}

