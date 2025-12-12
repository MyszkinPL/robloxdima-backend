import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAuthenticatedRbxClient } from "@/lib/api-client"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await getAuthenticatedRbxClient()
    const stock = await client.stock.getDetailed()

    return NextResponse.json({ success: true, stock })
  } catch (error) {
    console.error("GET /api/admin/rbx/stock/detailed error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
