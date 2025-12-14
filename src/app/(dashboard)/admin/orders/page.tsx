"use client"

import { useEffect, useState, useMemo } from "react"
import { columns, DataTable } from "@/components/data-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { user?: string; userId?: string; orderId?: string; refunded?: string }
}) {
  const backendBaseUrl = getBackendBaseUrl()

  const { data: ordersData, error: ordersError, isLoading } = useSWR<{
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
  }>(`${backendBaseUrl}/api/admin/orders`, fetcher, { refreshInterval: 5000 })

  const { data: logsData } = useSWR<{
    logs?: {
      id: string
      userId: string
      userName?: string | null
      action: string
      details: string | null
      createdAt: string
    }[]
  }>(`${backendBaseUrl}/api/admin/logs`, fetcher, { refreshInterval: 10000 })

  const { data: refundsData } = useSWR<{
    refunds?: Record<string, { refunded: boolean; source?: string; initiatorUserId?: string | null }>
  }>(`${backendBaseUrl}/api/admin/orders/refunds`, fetcher, { refreshInterval: 10000 })

  const orders = ordersData?.orders ?? []
  const adminLogs = logsData?.logs ?? []
  const refundInfos = refundsData?.refunds ?? {}

  const tableData = useMemo(() => {
    return orders.map((o) => {
      const refund = refundInfos[o.id] || { refunded: false }
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
  }, [orders, refundInfos, adminLogs])

  const initialSearch = searchParams?.user || ""
  const filterUserId = searchParams?.userId || ""
  const filterOrderId = searchParams?.orderId || ""
  const refundedFilter = searchParams?.refunded || ""

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
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8" data-loading={isLoading ? "true" : "false"}>
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
