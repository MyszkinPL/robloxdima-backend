import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Order } from "@/lib/db"

interface RecentSalesProps {
  orders?: Order[]
}

export function RecentSales({ orders = [] }: RecentSalesProps) {
  if (orders.length === 0) {
    return <div className="text-sm text-muted-foreground">Нет недавних продаж.</div>
  }

  return (
    <div className="space-y-8">
      {orders.slice(0, 5).map((order) => (
        <div key={order.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.username}`} alt="Avatar" />
            <AvatarFallback>{order.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{order.username}</p>
            <p className="text-sm text-muted-foreground">
              {order.status}
            </p>
          </div>
          <div className="ml-auto font-medium">+{order.price.toFixed(2)}₽</div>
        </div>
      ))}
    </div>
  )
}
