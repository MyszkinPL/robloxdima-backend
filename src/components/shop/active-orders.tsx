
import { Order } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package } from "lucide-react"
import { RobuxIcon } from "@/components/robux-icon"

interface ActiveOrdersProps {
  orders: Order[]
}

export function ActiveOrders({ orders }: ActiveOrdersProps) {
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing')

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Активные заказы</CardTitle>
        <CardDescription>
          Заказы, которые находятся в обработке
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-20 mb-2" />
            <p>Нет активных заказов</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-md border p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none flex items-center gap-1">
                    {order.amount} <RobuxIcon className="w-3 h-3" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <Badge variant="outline" className="capitalize">
                  {order.status === 'pending' ? 'Ожидание' : 'В процессе'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {order.username}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
