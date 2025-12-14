"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"
import { Loader2 } from "lucide-react"

type DetailedStockItem = {
  product: string
  robuxAvailable: number
  robuxReserved: number
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export function DetailedStock() {
  const { data, error: swrError, isLoading } = useSWR<{ success?: boolean; stock?: any, error?: string }>(
    `${getBackendBaseUrl()}/api/admin/rbx/stock/detailed`,
    fetcher,
    { refreshInterval: 10000 }
  )

  // Handle different response structures
  let items: DetailedStockItem[] = []
  const stockData = data?.stock

  if (Array.isArray(stockData)) {
    items = stockData
  } else if (stockData && Array.isArray(stockData.items)) {
    items = stockData.items
  }

  const error = swrError?.message || data?.error

  return (
    <Card>
      <CardHeader>
        <CardTitle>Подробный склад RBXCrate</CardTitle>
        <CardDescription>
          Доступные и зарезервированные Robux по продуктам.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {!isLoading && error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}
        
        {!isLoading && !error && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Нет данных о складе.
          </p>
        )}
        
        {!isLoading && !error && items.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Продукт</TableHead>
                  <TableHead className="text-right">Доступно (Robux)</TableHead>
                  <TableHead className="text-right">Зарезервировано (Robux)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product || `Пакет #${index + 1}`}</TableCell>
                    <TableCell className="text-right">{item.robuxAvailable}</TableCell>
                    <TableCell className="text-right">{item.robuxReserved}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
