import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAdminLogs } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Filter, Download, ListOrdered } from "lucide-react"

export const dynamic = "force-dynamic"

function describeDetails(action: string, details: string | null, userId?: string) {
  if (!details) {
    return ""
  }

  if (action === "BAN" || action === "UNBAN") {
    return (
      <div className="flex flex-col gap-1">
        <span>{details}</span>
        {userId && (
          <Link
            href={{
              pathname: "/admin/users",
              query: { userId },
            }}
            className="text-xs text-primary hover:underline"
          >
            Перейти к пользователю {userId}
          </Link>
        )}
      </div>
    )
  }

  try {
    const parsed = JSON.parse(details) as {
      orderId?: string
      amount?: number
      source?: string
      initiatorUserId?: string
      externalStatus?: string
      externalError?: string
    }

    if (action === "order_refund" || action === "order_refund_initiated") {
      const metaParts: string[] = []
      if (typeof parsed.amount === "number") {
        metaParts.push(`Сумма ${parsed.amount.toFixed(2)} ₽`)
      }
      if (parsed.source) {
        metaParts.push(`Источник ${parsed.source}`)
      }
      if (parsed.externalStatus) {
        metaParts.push(`Статус RBXCrate: ${parsed.externalStatus}`)
      }
      if (parsed.externalError) {
        metaParts.push(`Ошибка: ${parsed.externalError}`)
      }

      return (
        <div className="flex flex-col gap-1">
          {parsed.orderId && (
            <Link
              href={{
                pathname: "/admin/orders",
                query: {
                  orderId: parsed.orderId,
                  userId: userId,
                },
              }}
              className="text-xs text-primary hover:underline"
            >
              Заказ {parsed.orderId}
            </Link>
          )}
          {userId && (
            <Link
              href={{
                pathname: "/admin/orders",
                query: {
                  userId: userId,
                },
              }}
              className="text-xs text-primary hover:underline"
            >
              Все заказы пользователя
            </Link>
          )}
          {metaParts.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {metaParts.join(" • ")}
            </span>
          )}
          {parsed.initiatorUserId && (
            <Link href="/admin/users" className="text-xs text-primary hover:underline">
              Инициатор {parsed.initiatorUserId}
            </Link>
          )}
        </div>
      )
    }

    return details
  } catch {
    return details
  }
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams?: { type?: string; q?: string; from?: string; to?: string; field?: string }
}) {
  const type = searchParams?.type ?? "all"
  const query = searchParams?.q?.trim() ?? ""
  const from = searchParams?.from ?? ""
  const to = searchParams?.to ?? ""
  const field = searchParams?.field ?? "user"

  const logs = await getAdminLogs()

  const exportParams = new URLSearchParams()
  exportParams.set("type", type)
  if (query) {
    exportParams.set("q", query)
  }
  if (field) {
    exportParams.set("field", field)
  }
  if (from) {
    exportParams.set("from", from)
  }
  if (to) {
    exportParams.set("to", to)
  }
  const exportHref = `/admin/logs/export?${exportParams.toString()}`

  const filtered = logs.filter((log) => {
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
  })

  const refundCount = logs.filter(
    (log) => log.action === "order_refund" || log.action === "order_refund_initiated",
  ).length
  const banCount = logs.filter((log) => log.action === "BAN" || log.action === "UNBAN").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Всего записей</CardTitle>
            <CardDescription>Последние события аудита</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Рефанды</CardTitle>
            <CardDescription>order_refund / order_refund_initiated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Баны</CardTitle>
            <CardDescription>BAN / UNBAN</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border bg-card text-card-foreground shadow">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div>
              <CardTitle>Аудит действий</CardTitle>
              <CardDescription>Логи по рефандам, банам и другим операциям</CardDescription>
            </div>
            <form className="flex flex-wrap items-center gap-2" action="/admin/logs" method="get">
              <select
                name="field"
                defaultValue={field}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="user">Пользователь</option>
                <option value="order">Заказ</option>
                <option value="admin">Админ</option>
              </select>
              <Input
                name="q"
                placeholder="Поиск"
                className="w-[220px]"
                defaultValue={query}
              />
              <Input
                type="date"
                name="from"
                className="w-[150px]"
                defaultValue={from}
              />
              <Input
                type="date"
                name="to"
                className="w-[150px]"
                defaultValue={to}
              />
              <input type="hidden" name="type" value={type} />
              <Button type="submit" variant="outline" size="icon" aria-label="Фильтровать">
                <Filter className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="icon" aria-label="Экспорт CSV">
              <a href={exportHref} download="admin-logs.csv">
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Link
              href={{
                pathname: "/admin/logs",
                query: { type: "all", q: query || undefined, from: from || undefined, to: to || undefined },
              }}
            >
              <Badge variant={type === "all" ? "default" : "outline"}>Все</Badge>
            </Link>
            <Link
              href={{
                pathname: "/admin/logs",
                query: { type: "refunds", q: query || undefined, from: from || undefined, to: to || undefined },
              }}
            >
              <Badge variant={type === "refunds" ? "default" : "outline"}>Рефанды</Badge>
            </Link>
            <Link
              href={{
                pathname: "/admin/logs",
                query: { type: "bans", q: query || undefined, from: from || undefined, to: to || undefined },
              }}
            >
              <Badge variant={type === "bans" ? "default" : "outline"}>Баны</Badge>
            </Link>
            <Link
              href={{
                pathname: "/admin/orders",
                query: { refunded: "yes" },
              }}
            >
              <Button variant="outline" size="icon" aria-label="Заказы с рефандом">
                <ListOrdered className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Детали</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Нет записей.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{log.userName || "Неизвестно"}</span>
                        <span className="text-xs text-muted-foreground">{log.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {describeDetails(log.action, log.details, log.userId)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
