import { NextRequest, NextResponse } from "next/server"
import { getAdminLogs } from "@/lib/db"

function filterLogs(
  type: string,
  query: string,
  from: string,
  to: string,
  field: string,
) {
  return (log: Awaited<ReturnType<typeof getAdminLogs>>[number]) => {
    if (type === "refunds") {
      if (!(log.action === "order_refund" || log.action === "order_refund_initiated")) {
        return false
      }
    } else if (type === "bans") {
      if (!(log.action === "BAN" || log.action === "UNBAN")) {
        return false
      }
    }

    if (query) {
      if (field === "order") {
        if (!log.details || !log.details.includes(`"orderId":"${query}"`)) {
          return false
        }
      } else if (field === "admin") {
        if (!log.details || !log.details.includes(`"initiatorUserId":"${query}"`)) {
          return false
        }
      } else {
        const lower = query.toLowerCase()
        const matchesUserId = log.userId.toLowerCase().includes(lower)
        const matchesUserName = (log.userName ?? "").toLowerCase().includes(lower)
        if (!matchesUserId && !matchesUserName) {
          return false
        }
      }
    }

    if (from) {
      const fromDate = new Date(from)
      if (!Number.isNaN(fromDate.getTime())) {
        if (new Date(log.createdAt) < fromDate) {
          return false
        }
      }
    }

    if (to) {
      const toDate = new Date(to)
      if (!Number.isNaN(toDate.getTime())) {
        const endOfDay = new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
          23,
          59,
          59,
          999,
        )
        if (new Date(log.createdAt) > endOfDay) {
          return false
        }
      }
    }

    return true
  }
}

function toCsvValue(value: string | null | undefined): string {
  const v = value ?? ""
  const escaped = v.replace(/"/g, '""')
  return `"${escaped}"`
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const type = searchParams.get("type") ?? "all"
  const query = searchParams.get("q")?.trim() ?? ""
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const field = searchParams.get("field") ?? "user"

  const logs = await getAdminLogs()
  const filtered = logs.filter(filterLogs(type, query, from, to, field))

  const header = ["id", "userId", "userName", "action", "details", "createdAt"]
  const lines: string[] = []
  lines.push(header.map((value) => toCsvValue(value)).join(","))

  for (const log of filtered) {
    lines.push(
      [
        toCsvValue(log.id),
        toCsvValue(log.userId),
        toCsvValue(log.userName ?? ""),
        toCsvValue(log.action),
        toCsvValue(log.details ?? ""),
        toCsvValue(log.createdAt),
      ].join(","),
    )
  }

  const csv = lines.join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-logs.csv"',
    },
  })
}
