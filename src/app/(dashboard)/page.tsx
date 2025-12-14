"use client"

import { useEffect, useState } from "react"
import { PurchaseForm } from "@/components/shop/purchase-form"
import { ActiveOrders } from "@/components/shop/active-orders"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, DollarSign, Package } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { getSessionUser } from "@/lib/session"
import { RobuxIcon } from "@/components/robux-icon"
import type { Order, User } from "@/lib/db"
import { getBackendBaseUrl } from "@/lib/api"

function BalanceContent({
  user,
  userBalance,
  approxRobux,
}: {
  user: User | null
  userBalance: number
  approxRobux: number
}) {
  if (user) {
    return (
      <>
        <div className="text-2xl font-bold">{userBalance.toFixed(2)} ₽</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          ≈ {approxRobux.toLocaleString()} <RobuxIcon className="w-3 h-3" />
        </p>
      </>
    )
  }

  return (
    <>
      <div className="text-2xl font-bold">—</div>
      <p className="text-xs text-muted-foreground">
        Авторизуйтесь, чтобы увидеть баланс
      </p>
    </>
  )
}

export default function ShopPage() {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<{
    rate: number
    maintenance: boolean
    telegramBotUsername: string
  } | null>(null)
  const [stock, setStock] = useState(0)
  const [orders, setOrders] = useState<Order[]>([])

  const fetchOrders = async () => {
    const baseUrl = getBackendBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/orders/my`, {
        method: "GET",
        credentials: "include",
      })
      if (res.ok) {
        const json = (await res.json()) as { orders?: Order[] }
        setOrders(json.orders ?? [])
      }
    } catch {
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [settingsData, sessionUser] = await Promise.all([
        getSettings(),
        getSessionUser(),
      ])
      if (cancelled) return

      setSettings({
        rate: settingsData.rate,
        maintenance: settingsData.maintenance,
        telegramBotUsername: settingsData.telegramBotUsername,
      })
      setUser(sessionUser)

      if (sessionUser) {
        await fetchOrders()
      }

      const baseUrl = getBackendBaseUrl()
      try {
        const res = await fetch(`${baseUrl}/api/rbx/stock/summary`, {
          method: "GET",
          credentials: "include",
        })
        if (res.ok) {
          const json = (await res.json()) as {
            success?: boolean
            robuxAvailable?: number
          }
          if (json.success) {
            setStock(json.robuxAvailable ?? 0)
          }
        }
      } catch {
        setStock(0)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!settings) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] gap-4 p-4 text-center">
        <Activity className="h-16 w-16 text-yellow-500 animate-pulse" />
      </div>
    )
  }

  if (settings.maintenance) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] gap-4 p-4 text-center">
        <Activity className="h-16 w-16 text-yellow-500 animate-pulse" />
        <h1 className="text-3xl font-bold">Технические работы</h1>
        <p className="text-muted-foreground max-w-md">
          Магазин временно закрыт на обслуживание. Пожалуйста, зайдите позже.
          Мы работаем над улучшением сервиса.
        </p>
      </div>
    )
  }

  const userBalance = user?.balance ?? 0
  const approxRobux = settings.rate > 0 ? Math.floor(userBalance / settings.rate) : 0

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-x-hidden">
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Доступный сток
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {stock.toLocaleString()} <RobuxIcon className="w-6 h-6" />
              </div>
              <p className="text-xs text-muted-foreground">
                Моментальная отгрузка
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Текущий курс
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settings.rate.toFixed(2)} ₽</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                за 1 <RobuxIcon className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ваш баланс
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceContent
                user={user}
                userBalance={userBalance}
                approxRobux={approxRobux}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden md:grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Доступный сток
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {stock.toLocaleString()} <RobuxIcon className="w-6 h-6" />
            </div>
            <p className="text-xs text-muted-foreground">
              Моментальная отгрузка
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Текущий курс
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.rate.toFixed(2)} ₽</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              за 1 <RobuxIcon className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ваш баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceContent
              user={user}
              userBalance={userBalance}
              approxRobux={approxRobux}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Оформить заказ</CardTitle>
            <CardDescription>
              Введите данные для покупки робуксов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseForm
              rate={settings.rate}
              user={user}
              botName={settings.telegramBotUsername}
            />
          </CardContent>
        </Card>

        <ActiveOrders orders={orders} onOrderUpdated={fetchOrders} />
      </div>
    </div>
  )
}
