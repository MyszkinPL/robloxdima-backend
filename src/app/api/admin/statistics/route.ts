import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getDetailedStats } from "@/lib/db"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const stats = await getDetailedStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/admin/statistics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
