"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Filter, Download, ListOrdered } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/api"
import { useEffect, useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, AlertTriangle, Ban, RefreshCcw, Info, Wallet } from "lucide-react"

function formatAction(action: string) {
  switch (action) {
    case "BAN":
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" /> БАН
        </Badge>
      )
    case "UNBAN":
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
          <CheckCircle2 className="h-3 w-3" /> РАЗБАН
        </Badge>
      )
    case "order_refund":
      return (
        <Badge variant="destructive" className="gap-1">
          <RefreshCcw className="h-3 w-3" /> ВОЗВРАТ
        </Badge>
      )
    case "order_refund_initiated":
      return (
        <Badge variant="secondary" className="gap-1">
          <RefreshCcw className="h-3 w-3" /> ЗАПРОС ВОЗВРАТА
        </Badge>
      )
    case "bybit_deposit":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
          <Wallet className="h-3 w-3" /> BYBIT
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Info className="h-3 w-3" /> {action}
        </Badge>
      )
  }
}

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

    const entries = Object.entries(parsed as Record<string, unknown>)
    if (!entries.length) {
      return details
    }

    const labelForKey = (key: string) => {
      if (key === "orderId") return "ID заказа"
      if (key === "amount") return "Сумма"
      if (key === "status") return "Статус"
      if (key === "previousStatus") return "Старый статус"
      if (key === "newStatus") return "Новый статус"
      if (key === "initiatorUserId") return "Админ"
      if (key === "source") return "Источник"
      if (key === "externalStatus") return "Статус провайдера"
      if (key === "externalError") return "Ошибка провайдера"
      if (key === "reason") return "Причина"
      if (key === "message") return "Сообщение"
      if (key === "bybitUid") return "Bybit UID"
      if (key === "originalAmount") return "Сумма (Bybit)"
      if (key === "originalCoin") return "Валюта (Bybit)"
      if (key === "txId") return "TX ID"
      return key
    }

    return (
      <div className="flex flex-col gap-1 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-1">
            <span className="font-medium">{labelForKey(key)}:</span>
            <span className="text-muted-foreground break-words">
              {typeof value === "string" ? value : JSON.stringify(value)}
            </span>
          </div>
        ))}
      </div>
    )
  } catch {
    return details
  }
}

export default function AdminLogsPage({
  searchParams,
}: {
  searchParams?: { type?: string; q?: string; from?: string; to?: string; field?: string }
}) {
  const initialType = searchParams?.type ?? "all"
  const initialQuery = searchParams?.q?.trim() ?? ""
  const initialFrom = searchParams?.from ?? ""
  const initialTo = searchParams?.to ?? ""
  const initialField = searchParams?.field ?? "user"

  const [logs, setLogs] = useState<
    {
      id: string
      userId: string
      userName?: string | null
      action: string
      details: string | null
      createdAt: string
    }[]
  >([])
  const [type] = useState(initialType)
  const [query, setQuery] = useState(initialQuery)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [field, setField] = useState(initialField)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const baseUrl = getBackendBaseUrl()
      const res = await fetch(`${baseUrl}/api/admin/logs`, {
        method: "GET",
        credentials: "include",
      })
      if (!res.ok) {
        return
      }
      const json = (await res.json()) as {
        logs?: {
          id: string
          userId: string
          userName?: string | null
          action: string
          details: string | null
          createdAt: string
        }[]
      }
      if (!cancelled) {
        setLogs(json.logs ?? [])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const baseUrl = getBackendBaseUrl()
  const exportHref = useMemo(() => {
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
    return `${baseUrl}/api/admin/logs/export?${exportParams.toString()}`
  }, [baseUrl, field, from, query, to, type])

  const filtered = logs.filter((log) => {
    if (type === "refunds") {
      if (!(log.action === "order_refund" || log.action === "order_refund_initiated")) {
        return false
      }
    } else if (type === "bans") {
      if (!(log.action === "BAN" || log.action === "UNBAN")) {
        return false
      }
    } else if (type === "bybit") {
      if (log.action !== "bybit_deposit") {
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 w-full md:max-w-xl">
            <div>
              <CardTitle>Аудит действий</CardTitle>
              <CardDescription>Логи по рефандам, банам и другим операциям</CardDescription>
            </div>
            <form className="flex flex-wrap items-center gap-2" action="/admin/logs" method="get">
              <input type="hidden" name="field" value={field} />
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Поле" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="order">Заказ</SelectItem>
                  <SelectItem value="admin">Админ</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="q"
                placeholder="Поиск"
                className="w-[220px] max-w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Input
                type="date"
                name="from"
                className="w-[150px]"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                name="to"
                className="w-[150px]"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <input type="hidden" name="type" value={type} />
              <Button type="submit" variant="outline" size="icon" aria-label="Фильтровать">
                <Filter className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
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
                pathname: "/admin/logs",
                query: { type: "bybit", q: query || undefined, from: from || undefined, to: to || undefined },
              }}
            >
              <Badge variant={type === "bybit" ? "default" : "outline"}>Bybit</Badge>
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
          <div className="space-y-4">
            <div className="hidden md:block rounded-md border">
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
                        {formatAction(log.action)}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {describeDetails(log.action, log.details, log.userId)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filtered.length === 0 && (
                <div className="rounded-md border bg-card p-3 text-center text-sm text-muted-foreground">
                  Нет записей.
                </div>
              )}
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border bg-card p-3 text-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[180px]">
                        {log.userName || "Неизвестно"}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {log.userId}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {formatAction(log.action)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                  </div>
                  <div className="text-xs break-words">
                    {describeDetails(log.action, log.details, log.userId)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
