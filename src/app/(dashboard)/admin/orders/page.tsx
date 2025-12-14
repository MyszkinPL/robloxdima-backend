"use client"

import { useEffect, useState } from "react"
import { columns, DataTable } from "@/components/data-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBackendBaseUrl } from "@/lib/api"

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { user?: string; userId?: string; orderId?: string; refunded?: string }
}) {
  const [loading, setLoading] = useState(true)
  const [tableData, setTableData] = useState<
    {
      id: string
      userId: string
      username: string
      category: string
      status: "pending" | "completed" | "failed" | "processing"
      price: string
      stock: string
      refunded: boolean
      refundSource?: string
      refundInitiatorUserId?: string | null
      logs: {
        id: string
        userId: string
        userName?: string | null
        action: string
        details: string | null
        createdAt: string
      }[]
    }[]
  >([])

  const initialSearch = searchParams?.user || ""
  const filterUserId = searchParams?.userId || ""
  const filterOrderId = searchParams?.orderId || ""
  const refundedFilter = searchParams?.refunded || ""

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const backendBaseUrl = getBackendBaseUrl()
        const [ordersRes, logsRes] = await Promise.all([
          fetch(`${backendBaseUrl}/api/admin/orders`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${backendBaseUrl}/api/admin/logs`, {
            method: "GET",
            credentials: "include",
          }),
        ])

        if (!ordersRes.ok || !logsRes.ok) {
          return
        }

        const ordersJson = (await ordersRes.json()) as {
          orders?: {
            id: string
            userId: string
            username: string
            type: "gamepass" | "vip"
            amount: number
            price: number
            status: "pending" | "completed" | "failed" | "processing"
            createdAt: string
            placeId: string
          }[]
        }

        const logsJson = (await logsRes.json()) as {
          logs?: {
            id: string
            userId: string
            userName?: string | null
            action: string
            details: string | null
            createdAt: string
          }[]
        }

        const orders = ordersJson.orders ?? []
        const adminLogs = logsJson.logs ?? []

        const refundInfos = await Promise.all(
          orders.map(async (o) => {
            const res = await fetch(
              `${backendBaseUrl}/api/admin/orders/refund-info/${encodeURIComponent(o.id)}`,
              {
                method: "GET",
                credentials: "include",
              },
            )

            if (!res.ok) {
              return { refunded: false } as {
                refunded: boolean
                source?: string
                initiatorUserId?: string | null
              }
            }

            const json = (await res.json()) as {
              refunded: boolean
              source?: string
              initiatorUserId?: string | null
            }

            return json
          }),
        )

        const mapped = orders.map((o, index) => {
          const refund = refundInfos[index]
          const orderLogs = adminLogs.filter(
            (log) => log.details && log.details.includes(`"orderId":"${o.id}"`),
          )
          return {
            id: o.id,
            userId: o.userId,
            username: o.username,
            category: o.type === "vip" ? "VIP сервер" : "Gamepass",
            status: o.status,
            price: o.price.toString(),
            stock: o.amount.toString(),
            refunded: refund.refunded,
            refundSource: refund.source,
            refundInitiatorUserId: refund.initiatorUserId,
            logs: orderLogs,
          }
        })

        if (!cancelled) {
          setTableData(mapped)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredTableData = tableData.filter((row) => {
    if (filterUserId && row.userId !== filterUserId) {
      return false
    }
    if (filterOrderId && row.id !== filterOrderId) {
      return false
    }
    if (refundedFilter === "yes" && !row.refunded) {
      return false
    }
    if (refundedFilter === "no" && row.refunded) {
      return false
    }
    return true
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8" data-loading={loading ? "true" : "false"}>
      <Card className="rounded-xl border bg-card text-card-foreground shadow">
        <CardHeader>
          <CardTitle>Заказы</CardTitle>
          <CardDescription>
            Полный список заказов с фильтрами по статусу, рефанду и сумме.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredTableData} initialSearch={initialSearch} />
        </CardContent>
      </Card>
    </div>
  )
}
