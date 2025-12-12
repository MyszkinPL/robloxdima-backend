import { PurchaseForm } from "@/components/shop/purchase-form"
import { ActiveOrders } from "@/components/shop/active-orders"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { StockResponse } from "@/lib/rbxcrate"
import { Activity, DollarSign, Package } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { getSessionUser } from "@/lib/session"
import { getUserOrders } from "@/lib/db"
import { RobuxIcon } from "@/components/robux-icon"
import type { Order } from "@/lib/db"

export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  let stock = 0
  const settings = await getSettings()
  const user = await getSessionUser()
  
  let userOrders: Order[] = []
  if (user) {
    userOrders = await getUserOrders(user.id)
  }
  
  try {
    const client = await getAuthenticatedRbxClient();
    const stockData = await client.stock.getSummary().catch(() => ({ robuxAvailable: 0 } as StockResponse));
    stock = stockData.robuxAvailable || 0;
  } catch {
    stock = 0
  }

  const isMaintenance = settings.maintenance

  if (isMaintenance) {
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Статус системы</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Активен</div>
            <p className="text-xs text-muted-foreground">
              Все системы работают штатно
            </p>
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
            <PurchaseForm rate={settings.rate} user={user} botName={settings.telegramBotUsername} />
          </CardContent>
        </Card>
        
        <ActiveOrders orders={userOrders} />
      </div>
    </div>
  )
}
