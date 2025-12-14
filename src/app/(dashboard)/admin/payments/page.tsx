"use client"

import { useMemo, useState } from "react"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, Bitcoin } from "lucide-react"
import { toast } from "sonner"

type AdminPayment = {
  id: string
  userId: string
  amount: number
  currency: string
  status: "pending" | "paid" | "expired"
  invoiceUrl?: string
  createdAt: string
  method: string
  providerData?: string | null
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

function StatusBadge({ status }: { status: AdminPayment["status"] }) {
  if (status === "paid") {
    return <Badge className="bg-green-500 hover:bg-green-600">Успешно</Badge>
  }
  if (status === "pending") {
    return <Badge variant="secondary">Ожидание</Badge>
  }
  if (status === "expired") {
    return <Badge variant="destructive">Истек</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

function MethodLabel({ method }: { method: string }) {
  if (method === "bybit_uid") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
        <Wallet className="h-3 w-3" /> Bybit UID
      </Badge>
    )
  }
  if (method === "bybit_manual") {
    return (
      <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
        <Wallet className="h-3 w-3" /> Bybit Manual
      </Badge>
    )
  }
  if (method === "bybit_pay") {
    return (
      <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
        <Wallet className="h-3 w-3" /> Bybit Pay
      </Badge>
    )
  }
  if (method === "cryptobot") {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
        <Bitcoin className="h-3 w-3" /> Crypto Bot
      </Badge>
    )
  }
  return <Badge variant="outline">{method}</Badge>
}

export default function AdminPaymentsPage() {
  const [methodFilter, setMethodFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("")

  const { data: paymentsData, isLoading: loading } = useSWR<{ payments?: AdminPayment[] }>(
    `${getBackendBaseUrl()}/api/admin/payments`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const payments = paymentsData?.payments ?? []

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) {
        return false
      }
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false
      }
      if (userFilter && !p.userId.includes(userFilter.trim())) {
        return false
      }
      return true
    })
  }, [payments, methodFilter, statusFilter, userFilter])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Платежи</CardTitle>
          <CardDescription>
            История всех пополнений баланса. Видно, каким методом и по какому пользователю прошел платеж.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Метод</div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Метод" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="cryptobot">Crypto Bot</SelectItem>
                    <SelectItem value="bybit_pay">Bybit Pay</SelectItem>
                    <SelectItem value="bybit_manual">Bybit Manual (Old)</SelectItem>
                    <SelectItem value="bybit_uid">Bybit UID (Archive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Статус</div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="paid">Успешно</SelectItem>
                    <SelectItem value="pending">Ожидание</SelectItem>
                    <SelectItem value="expired">Истек</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 w-full md:w-auto">
              <div className="text-xs text-muted-foreground">Фильтр по Telegram ID</div>
              <Input
                placeholder="Например, 123456789"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full md:w-[220px]"
              />
            </div>
          </div>

          {loading && payments.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Загрузка платежей...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Платежи не найдены под текущие фильтры
            </div>
          ) : (
            <ScrollArea className="h-[480px] pr-3">
              <div className="space-y-3">
                {filtered.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-3 rounded-lg border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium break-all">
                          Платеж {payment.id}
                        </span>
                        <StatusBadge status={payment.status} />
                        <MethodLabel method={payment.method} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Пользователь:{" "}
                        <span className="font-mono break-all">{payment.userId}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Дата: {new Date(payment.createdAt).toLocaleString("ru-RU")}
                      </div>
                      {payment.method === "bybit_uid" && payment.providerData && (
                        <BybitUidInfo providerData={payment.providerData} />
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-2 pt-1 md:block md:text-right">
                      <div className="text-lg font-semibold">
                        +{payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      {payment.invoiceUrl && (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                        >
                          Открыть счет
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type BybitUidInfoProps = {
  providerData: string
}

function BybitUidInfo({ providerData }: BybitUidInfoProps) {
  let uid = ""
  try {
    const parsed = JSON.parse(providerData) as { address?: string }
    uid = parsed.address ?? ""
  } catch {
  }

  if (!uid) {
    return null
  }

  return (
    <div className="mt-1 inline-flex items-center rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
      Bybit UID: <span className="ml-1 font-mono">{uid}</span>
    </div>
  )
}
