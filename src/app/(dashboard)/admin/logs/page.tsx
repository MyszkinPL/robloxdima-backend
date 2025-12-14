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
import { Filter, Download, ListOrdered, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/api"
import { useMemo, useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, AlertTriangle, Ban, RefreshCcw, Info, Wallet } from "lucide-react"
import useSWR from "swr"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

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
      [key: string]: any
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

export default function AdminLogsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const type = searchParams.get("type") || "all"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const query = searchParams.get("q") || ""
  const field = searchParams.get("field") || "user"
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""

  const queryString = searchParams.toString()
  
  const { data, isLoading, mutate } = useSWR<{
    logs: {
      id: string
      userId: string
      userName?: string | null
      action: string
      details: string | null
      createdAt: string
    }[]
    total: number
    summary: {
      total: number
      refundCount: number
      banCount: number
    }
  }>(`${getBackendBaseUrl()}/api/admin/logs?${queryString}`, fetcher, { 
    refreshInterval: 10000,
    keepPreviousData: true 
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const summary = data?.summary || { total: 0, refundCount: 0, banCount: 0 }

  const updateSearch = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    // Reset page to 1 on filter change
    if (!newParams.page) {
        params.set("page", "1")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const [localQuery, setLocalQuery] = useState(query)
  const [localField, setLocalField] = useState(field)

  // Sync local state with URL params
  useEffect(() => {
    setLocalQuery(query)
  }, [query])
  
  useEffect(() => {
    setLocalField(field)
  }, [field])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearch({ q: localQuery, field: localField })
  }

  const exportHref = useMemo(() => {
    return `${getBackendBaseUrl()}/api/admin/logs/export?${queryString}`
  }, [queryString])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Последние события аудита</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Рефанды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.refundCount}</div>
            <p className="text-xs text-muted-foreground">order_refund / order_refund_initiated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Баны</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.banCount}</div>
            <p className="text-xs text-muted-foreground">BAN / UNBAN</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border bg-card text-card-foreground shadow">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Аудит действий</CardTitle>
              <CardDescription>Логирование операций и действий пользователей</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={exportHref} download="admin-logs.csv">
                  <Download className="h-4 w-4" />
                  Экспорт
                </a>
              </Button>
              <Link
                  href={{
                    pathname: "/admin/orders",
                    query: { refunded: "yes" },
                  }}
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <ListOrdered className="h-4 w-4" />
                    Заказы с рефандом
                  </Button>
                </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-muted/50 p-4 rounded-lg">
             <div className="flex flex-wrap gap-2">
                <Button 
                    variant={type === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSearch({ type: "all" })}
                >
                    Все
                </Button>
                <Button 
                    variant={type === "refunds" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSearch({ type: "refunds" })}
                >
                    Рефанды
                </Button>
                <Button 
                    variant={type === "bans" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSearch({ type: "bans" })}
                >
                    Баны
                </Button>
                <Button 
                    variant={type === "bybit" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => updateSearch({ type: "bybit" })}
                >
                    Bybit
                </Button>
             </div>
             
             <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={localField} onValueChange={setLocalField}>
                    <SelectTrigger className="h-9 w-[130px] text-xs">
                        <SelectValue placeholder="Поле" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="user">Пользователь</SelectItem>
                        <SelectItem value="order">Заказ</SelectItem>
                        <SelectItem value="admin">Админ</SelectItem>
                        <SelectItem value="all">Везде</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative flex-1 md:w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Поиск..."
                        className="w-full pl-9 h-9"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                    />
                </div>
                <Input
                    type="date"
                    className="w-auto h-9"
                    value={from}
                    onChange={(e) => updateSearch({ from: e.target.value })}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                    type="date"
                    className="w-auto h-9"
                    value={to}
                    onChange={(e) => updateSearch({ to: e.target.value })}
                />
                <Button type="submit" size="sm" variant="secondary">
                    Найти
                </Button>
             </form>
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
                {isLoading && logs.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Загрузка...
                        </TableCell>
                     </TableRow>
                )}
                {!isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Нет записей.
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="align-top text-sm text-muted-foreground whitespace-nowrap">
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
          
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
                Показано {logs.length} из {total} записей (Стр. {page} из {totalPages || 1})
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSearch({ page: String(Math.max(1, page - 1)) })}
                    disabled={page <= 1 || isLoading}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSearch({ page: String(page + 1) })}
                    disabled={page >= totalPages || isLoading}
                >
                    Вперед
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}