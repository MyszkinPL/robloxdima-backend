
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getUserOrders } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { RobuxIcon } from "@/components/robux-icon"

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const user = await getSessionUser()
  
  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle>История заказов</CardTitle>
             <CardDescription>Войдите, чтобы просмотреть историю ваших заказов.</CardDescription>
           </CardHeader>
        </Card>
      </div>
    )
  }

  const orders = await getUserOrders(user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>История заказов</CardTitle>
          <CardDescription>Список всех ваших покупок робуксов.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              У вас пока нет заказов.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID заказа</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Никнейм</TableHead>
                  <TableHead>Сумма (<RobuxIcon className="w-3 h-3" />)</TableHead>
                  <TableHead>Стоимость (₽)</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium truncate max-w-[100px]">{order.id}</TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </TableCell>
                    <TableCell>{order.username}</TableCell>
                    <TableCell className="flex items-center gap-1">{order.amount} <RobuxIcon className="w-4 h-4" /></TableCell>
                    <TableCell>{order.price} ₽</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default" // shadcn default is effectively success-like usually, or primary
                            : order.status === "processing"
                            ? "secondary"
                            : order.status === "failed"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                            order.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""
                        }
                      >
                        {order.status === "completed" && "Выполнен"}
                        {order.status === "processing" && "В обработке"}
                        {order.status === "pending" && "Ожидает"}
                        {order.status === "failed" && "Отменен"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
