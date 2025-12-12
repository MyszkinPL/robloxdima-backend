"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DetailedStockItem = {
  product: string
  robuxAvailable: number
  robuxReserved: number
}

type DetailedStockResponse = {
  items?: DetailedStockItem[]
}

export function DetailedStock() {
  const [data, setData] = useState<DetailedStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/admin/rbx/stock/detailed")
        const json = (await res.json()) as {
          success?: boolean
          stock?: DetailedStockResponse
          error?: string
        }

        if (!res.ok || !json.success) {
          if (!cancelled) {
            setError(json.error || "Не удалось загрузить склад RBXCrate")
          }
          return
        }

        const items = json.stock?.items || []
        if (!cancelled) {
          setData(items)
        }
      } catch (err) {
        console.error("Failed to load detailed stock", err)
        if (!cancelled) {
          setError("Ошибка загрузки складских остатков")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Подробный склад RBXCrate</CardTitle>
        <CardDescription>
          Доступные и зарезервированные Robux по продуктам.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
        {!loading && error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && !error && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Нет данных о складе.
          </p>
        )}
        {!loading && !error && data.length > 0 && (
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
                {data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product}</TableCell>
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

