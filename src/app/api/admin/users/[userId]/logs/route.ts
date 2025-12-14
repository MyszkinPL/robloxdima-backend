import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUserLogs } from "@/lib/db"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getSessionUser()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = await context.params
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const { logs, total } = await getUserLogs(userId, page, limit)
    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error("GET /api/admin/users/[userId]/logs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    )
  }
}

