"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/api"
import type { Payment } from "@/lib/db"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function TopupsPage() {
  const [isBybitChecking, setIsBybitChecking] = useState(false)
  const [bybitCooldown, setBybitCooldown] = useState(0)

  const { data: historyData, isLoading: loading, mutate } = useSWR<{ success?: boolean; payments?: Payment[] }>(
    `${getBackendBaseUrl()}/api/wallet/history`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const history = historyData?.payments ?? []

  useEffect(() => {
    if (bybitCooldown <= 0) {
      return
    }
    const interval = setInterval(() => {
      setBybitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [bybitCooldown])

  const handleBybitQuickCheck = async () => {
    if (bybitCooldown > 0 || isBybitChecking) {
      return
    }
    setIsBybitChecking(true)
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/wallet/bybit/check`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()

      if (res.ok) {
        mutate()
      }

      if (res.status === 429) {
        console.error(data.error || "Слишком часто. Попробуйте позже.")
      }
    } finally {
      setIsBybitChecking(false)
      setBybitCooldown(15)
    }
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>История пополнений</CardTitle>
            <CardDescription>Все пополнения баланса через Crypto Bot и Bybit.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBybitQuickCheck}
              disabled={isBybitChecking || bybitCooldown > 0}
            >
              {isBybitChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bybitCooldown > 0
                ? `Проверить пополнения Bybit (через ${bybitCooldown} c)`
                : "Проверить пополнения Bybit"}
              <RefreshCw className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              История пополнений пуста.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden md:block rounded-md border">
                <div className="divide-y text-sm">
                  {sorted.map((payment) => (
                    <div
                      key={payment.id}
                      className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 px-4 py-2"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Пополнение</span>
                          <StatusBadge status={payment.status} />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString("ru-RU")}
                        </div>
                      </div>
                      <div className="flex items-center text-sm font-semibold">
                        +{payment.amount} ₽
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground uppercase tracking-wide">
                        {payment.method === "bybit_uid" ? "Bybit UID" : "Crypto Bot"}
                      </div>
                      <div className="flex items-center justify-end text-[11px] text-muted-foreground">
                        {payment.method === "cryptobot" &&
                          payment.status === "pending" &&
                          payment.invoiceUrl && (
                          <a
                            href={payment.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Открыть счет
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {sorted.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-lg border bg-card p-3 text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">Пополнение</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">+{payment.amount} ₽</div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {payment.method === "bybit_uid" ? "Bybit UID" : "Crypto Bot"}
                      </div>
                    </div>
                    {payment.method === "cryptobot" &&
                      payment.status === "pending" &&
                      payment.invoiceUrl && (
                      <a
                        href={payment.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] text-primary underline"
                      >
                        Открыть счет
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  if (status === "paid") {
    return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">Оплачен</Badge>
  }
  if (status === "pending") {
    return <Badge variant="outline">В ожидании</Badge>
  }
  return <Badge variant="outline">Просрочен</Badge>
}
