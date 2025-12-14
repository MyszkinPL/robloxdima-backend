import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getAdminLogs } from "@/lib/db"

function toCsvValue(value: string | null | undefined): string {
  let v = value ?? ""
  if (/^[=\+\-@]/.test(v)) {
    v = "'" + v
  }
  const escaped = v.replace(/"/g, '""')
  return `"${escaped}"`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type") || undefined
    const query = searchParams.get("q") || undefined
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const field = searchParams.get("field") || undefined

    const { logs } = await getAdminLogs({
      page: 1,
      limit: 10000, // Large limit for export
      search: query,
      field,
      type,
      from,
      to,
    })

    const header = ["id", "userId", "userName", "action", "details", "createdAt"]
    const lines: string[] = []
    lines.push(header.join(","))

    for (const log of logs) {
      const row = [
        toCsvValue(log.id),
        toCsvValue(log.userId),
        toCsvValue(log.userName),
        toCsvValue(log.action),
        toCsvValue(log.details),
        toCsvValue(log.createdAt),
      ]
      lines.push(row.join(","))
    }

    const csv = lines.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-logs.csv"',
      },
    })
  } catch (error) {
    console.error("GET /api/admin/logs/export error:", error)
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 },
    )
  }
}

