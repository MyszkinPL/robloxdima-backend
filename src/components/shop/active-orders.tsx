
import { useState } from "react"
import { Order } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Package, XCircle, RefreshCw } from "lucide-react"
import { RobuxIcon } from "@/components/robux-icon"
import { getBackendBaseUrl } from "@/lib/api"
import { toast } from "sonner"

interface ActiveOrdersProps {
  orders: Order[]
  onOrderUpdated?: () => void
}

export function ActiveOrders({ orders, onOrderUpdated }: ActiveOrdersProps) {
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const handleCancel = async (orderId: string) => {
    if (!confirm("Вы уверены, что хотите отменить этот заказ? Средства вернутся на баланс.")) {
      return
    }

    setCancellingId(orderId)
    try {
      const baseUrl = getBackendBaseUrl()
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
        method: "POST",
        credentials: "include",
      })
      
      if (res.ok) {
        toast.success("Заказ успешно отменен")
        if (onOrderUpdated) {
            onOrderUpdated()
        }
        // Use router.refresh() if possible, but window.location.reload() is safer for now
        // actually onOrderUpdated calls fetchOrders which updates state
      } else {
        const json = await res.json()
        toast.error(json.error || "Не удалось отменить заказ")
      }
    } catch (e) {
      toast.error("Произошла ошибка при отмене заказа")
    } finally {
      setCancellingId(null)
    }
  }

  const handleResend = async (orderId: string) => {
    setResendingId(orderId)
    try {
      const baseUrl = getBackendBaseUrl()
      const res = await fetch(`${baseUrl}/api/rbx/orders/resend`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId }),
        credentials: "include",
      })

      const data = await res.json()
      if (res.ok && data.success) {
          toast.success("Заказ отправлен на повторную обработку")
      } else {
          toast.error(data.error || "Ошибка при отправке")
      }
    } catch (e) {
        toast.error("Ошибка соединения")
    } finally {
        setResendingId(null)
    }
  }

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
            <div key={order.id} className="flex flex-col gap-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
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
              
              <div className="flex gap-2">
                {order.status === 'processing' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        disabled={resendingId === order.id}
                        onClick={() => handleResend(order.id)}
                    >
                        {resendingId === order.id ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-3 w-3" />
                        )}
                        Повторить
                    </Button>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 text-xs text-muted-foreground hover:text-destructive ${order.status === 'pending' ? 'w-full' : 'flex-1'}`}
                  disabled={cancellingId === order.id}
                  onClick={() => handleCancel(order.id)}
                >
                    {cancellingId === order.id ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                        <XCircle className="mr-2 h-3 w-3" />
                    )}
                    Отменить
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
