import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUserPayments } from "@/lib/db"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payments = await getUserPayments(user.id)
    return NextResponse.json({ success: true, payments })
  } catch (error) {
    console.error("GET /api/wallet/history error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 },
    )
  }
}
