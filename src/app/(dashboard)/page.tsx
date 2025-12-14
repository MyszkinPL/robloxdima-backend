"use client"

import { PurchaseForm } from "@/components/shop/purchase-form"
import { ActiveOrders } from "@/components/shop/active-orders"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, DollarSign, Package } from "lucide-react"
import { RobuxIcon } from "@/components/robux-icon"
import type { Order, User } from "@/lib/db"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

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
  const baseUrl = getBackendBaseUrl()

  const { data: userData, mutate: mutateUser } = useSWR<{ user?: User }>(
    `${baseUrl}/api/me`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: settingsData } = useSWR<{
    rate?: number
    maintenance?: boolean
    telegramBotUsername?: string
  }>(`${baseUrl}/api/settings/public`, fetcher, { refreshInterval: 10000 })

  const user = userData?.user ?? null
  
  const settings = settingsData ? {
    rate: settingsData.rate ?? 0.5,
    maintenance: settingsData.maintenance ?? false,
    telegramBotUsername: settingsData.telegramBotUsername ?? "",
  } : null

  const { data: ordersData, mutate: mutateOrders } = useSWR<{ orders?: Order[] }>(
    user ? `${baseUrl}/api/orders/my` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: stockData } = useSWR<{
    success?: boolean
    robuxAvailable?: number
  }>(`${baseUrl}/api/rbx/stock/summary`, fetcher, { refreshInterval: 10000 })

  const stock = stockData?.robuxAvailable ?? 0
  const orders = ordersData?.orders ?? []

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
              onSuccess={() => {
                mutateOrders()
                mutateUser()
              }}
            />
          </CardContent>
        </Card>

        <ActiveOrders orders={orders} onOrderUpdated={() => mutateOrders()} />
      </div>
    </div>
  )
}
