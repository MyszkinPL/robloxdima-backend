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

export default function AdminPage() {
  const [balance, setBalance] = useState("0")
  const [stock, setStock] = useState("0")
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersCount, setOrdersCount] = useState(0)
  const [clientsCount, setClientsCount] = useState(0)
  const [salesThisMonth, setSalesThisMonth] = useState(0)
  const [chartData, setChartData] = useState<{ month: string; revenue: number }[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const baseUrl = getBackendBaseUrl()
      const [balanceRes, stockRes, ordersRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/rbx/balance`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${baseUrl}/api/rbx/stock/summary`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${baseUrl}/api/admin/orders`, {
          method: "GET",
          credentials: "include",
        }),
      ])

      if (!balanceRes.ok || !stockRes.ok || !ordersRes.ok) {
        return
      }

      const balanceJson = (await balanceRes.json()) as {
        success?: boolean
        balance?: number
      }
      const stockJson = (await stockRes.json()) as {
        success?: boolean
        robuxAvailable?: number
      }

      const ordersJson = (await ordersRes.json()) as {
        orders?: Order[]
        summary?: {
          ordersCount?: number
          clientsCount?: number
          salesThisMonth?: number
          monthlyRevenue?: number[]
        }
      }

      if (cancelled) return

      setBalance((balanceJson.balance ?? 0).toString())
      setStock((stockJson.robuxAvailable ?? 0).toString())

      const ordersData = ordersJson.orders ?? []
      const summary = ordersJson.summary ?? {}

      setOrders(ordersData)
      setOrdersCount(summary.ordersCount ?? 0)
      setClientsCount(summary.clientsCount ?? 0)
      setSalesThisMonth(summary.salesThisMonth ?? 0)

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

      setChartData(
        months.map((month, index) => ({
          month,
          revenue: monthlyRevenue[index] ?? 0,
        })),
      )
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
