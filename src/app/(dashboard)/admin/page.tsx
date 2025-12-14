"use client"

import { useEffect, useState } from "react"
import { Overview } from "@/components/admin/overview"
import { RecentSales } from "@/components/admin/recent-sales"
import { DetailedStock } from "@/components/admin/detailed-stock"
import { SectionCards } from "@/components/section-cards"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Info } from "lucide-react"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"

type Order = {
  id: string
  userId: string
  username: string
  type: "gamepass" | "vip"
  amount: number
  price: number
  status: "pending" | "completed" | "failed" | "processing"
  createdAt: string
  placeId: string
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function AdminPage() {
  const baseUrl = getBackendBaseUrl()

  const { data: balanceData } = useSWR<{ success?: boolean; balance?: number }>(
    `${baseUrl}/api/admin/rbx/balance`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: stockData } = useSWR<{ success?: boolean; robuxAvailable?: number }>(
    `${baseUrl}/api/rbx/stock/summary`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const { data: ordersData } = useSWR<{
    orders?: Order[]
    summary?: {
      ordersCount?: number
      clientsCount?: number
      salesThisMonth?: number
      monthlyRevenue?: number[]
    }
  }>(`${baseUrl}/api/admin/orders`, fetcher, { refreshInterval: 5000 })

  const balance = (balanceData?.balance ?? 0).toString()
  const stock = (stockData?.robuxAvailable ?? 0).toString()
  const orders = ordersData?.orders ?? []
  const summary = ordersData?.summary ?? {}
  
  const ordersCount = summary.ordersCount ?? 0
  const clientsCount = summary.clientsCount ?? 0
  const salesThisMonth = summary.salesThisMonth ?? 0

  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ]

  const monthlyRevenue = Array.isArray(summary.monthlyRevenue)
    ? summary.monthlyRevenue
    : []

  const chartData = months.map((month, index) => ({
    month,
    revenue: monthlyRevenue[index] ?? 0,
  }))

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Alert className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
        <Info className="h-4 w-4" />
        <AlertTitle>Информация для администратора</AlertTitle>
        <AlertDescription>
          Не забудьте проверить баланс на RBXCrate перед запуском рекламы. Текущий курс закупки
          стабилен.
        </AlertDescription>
      </Alert>

      <SectionCards
        balance={balance}
        stock={stock}
        ordersCount={ordersCount}
        clientsCount={clientsCount}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Обзор выручки</CardTitle>
            <CardDescription>График доходов по месяцам.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={chartData} />
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Недавние продажи</CardTitle>
            <CardDescription>
              Вы совершили {salesThisMonth} продаж в этом месяце.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 md:pt-4">
            <RecentSales orders={orders} />
          </CardContent>
        </Card>
      </div>

      <DetailedStock />
    </div>
  )
}
