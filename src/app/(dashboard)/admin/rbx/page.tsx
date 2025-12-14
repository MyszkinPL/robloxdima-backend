"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getBackendBaseUrl } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface DetailedStockItem {
  rate: number
  accountsCount: number
  maxInstantOrder: number
  totalRobuxAmount: number
}

export default function AdminRbxPage() {
  const [loading, setLoading] = useState(true)
  const [stock, setStock] = useState<DetailedStockItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const backendBaseUrl = getBackendBaseUrl()
        const res = await fetch(`${backendBaseUrl}/api/admin/rbx/stock/detailed`, {
          method: "GET",
          credentials: "include",
        })

        if (!res.ok) {
          throw new Error("Failed to fetch stock data")
        }

        const data = await res.json()
        if (data.error) {
          throw new Error(data.error)
        }
        
        setStock(data.stock || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <h1 className="text-2xl font-bold">RBXCRATE Сток и Курс</h1>
      
      {stock.length === 0 ? (
        <div className="text-muted-foreground">Нет данных о стоке.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stock.map((item, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Пакет #{idx + 1}
                </CardTitle>
                <Badge variant={item.totalRobuxAmount > 0 ? "default" : "destructive"}>
                  {item.totalRobuxAmount > 0 ? "В наличии" : "Пусто"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.totalRobuxAmount.toLocaleString()} R$</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Курс выкупа: <span className="font-semibold text-foreground">{item.rate}</span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                   <div>
                      <div className="text-muted-foreground text-xs">Макс. мгновенно</div>
                      <div className="font-medium">{item.maxInstantOrder.toLocaleString()} R$</div>
                   </div>
                   <div>
                      <div className="text-muted-foreground text-xs">Аккаунтов</div>
                      <div className="font-medium">{item.accountsCount}</div>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
