import { ShoppingCart, Users, Package, Coins } from "lucide-react"
import { RobuxIcon } from "@/components/robux-icon"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  balance?: string;
  stock?: string;
  ordersCount?: number;
  clientsCount?: number;
}

export function SectionCards({ 
  balance = "...", 
  stock = "...", 
  ordersCount = 0, 
  clientsCount = 0 
}: SectionCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Баланс API
          </CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">{balance} <RobuxIcon className="w-6 h-6" /></div>
          <p className="text-xs text-muted-foreground">
            Доступно для вывода
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Всего заказов
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ordersCount}</div>
          <p className="text-xs text-muted-foreground">
            За все время работы
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Активные клиенты
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clientsCount}</div>
          <p className="text-xs text-muted-foreground">
            Уникальные покупатели
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Сток (Запасы)
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">{stock} <RobuxIcon className="w-6 h-6" /></div>
          <p className="text-xs text-muted-foreground">
            Общий резерв робуксов
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
