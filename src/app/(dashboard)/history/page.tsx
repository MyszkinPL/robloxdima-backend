
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSessionUser } from "@/lib/session"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { RobuxIcon } from "@/components/robux-icon"
import { useEffect, useState } from "react"
import type { Order } from "@/lib/db"
import { getBackendBaseUrl } from "@/lib/api"
import { Loader2, RotateCcw, XCircle } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function HistoryPage() {
  const [userLoaded, setUserLoaded] = useState(false)
  const [hasUser, setHasUser] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const baseUrl = getBackendBaseUrl()

  useEffect(() => {
    const checkUser = async () => {
      const user = await getSessionUser()
      if (user) {
        setHasUser(true)
      }
      setUserLoaded(true)
    }
    checkUser()
  }, [])

  const { data: ordersData, mutate } = useSWR<{ orders?: Order[] }>(
    hasUser ? `${baseUrl}/api/orders/my` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  const orders = ordersData?.orders ?? []

  const handleResend = async (orderId: string) => {
    if (!confirm("Отправить заказ повторно? Используйте это, если заказ долго не приходит.")) {
      return
    }

    setResendingId(orderId)
    try {
      const res = await fetch(`${baseUrl}/api/rbx/orders/resend`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId }),
        credentials: "include",
      })
      
      const json = await res.json()
      if (res.ok && json.success) {
        alert("Запрос отправлен! Ожидайте обновления статуса.")
        mutate() // Refresh data
      } else {
        alert(json.error || "Не удалось отправить повторно")
      }
    } catch (e) {
      alert("Произошла ошибка")
    } finally {
      setResendingId(null)
    }
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm("Вы уверены, что хотите отменить этот заказ? Средства вернутся на баланс.")) {
      return
    }

    setCancellingId(orderId)
    try {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
        method: "POST",
        credentials: "include",
      })
      
      if (res.ok) {
        mutate() // Refresh data immediately
      } else {
        const json = await res.json()
        alert(json.error || "Не удалось отменить заказ")
      }
    } catch (e) {
      alert("Произошла ошибка при отмене заказа")
    } finally {
      setCancellingId(null)
    }
  }

  if (!userLoaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>История заказов</CardTitle>
            <CardDescription>Загружаем историю ваших заказов.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!hasUser) {
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
            <div className="space-y-4">
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID заказа</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Никнейм</TableHead>
                      <TableHead>Сумма (<RobuxIcon className="w-3 h-3" />)</TableHead>
                      <TableHead>Стоимость (₽)</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium truncate max-w-[120px]">
                          {order.id}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", {
                            locale: ru,
                          })}
                        </TableCell>
                        <TableCell>{order.username}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {order.amount} <RobuxIcon className="w-4 h-4" />
                        </TableCell>
                        <TableCell>{order.price} ₽</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : order.status === "processing"
                                ? "secondary"
                                : (order.status === "failed" || order.status === "cancelled")
                                ? "destructive"
                                : "outline"
                            }
                            className={
                              order.status === "completed"
                                ? "bg-green-500 hover:bg-green-600"
                                : ""
                            }
                          >
                            {order.status === "completed" && "Выполнен"}
                            {order.status === "processing" && "В обработке"}
                            {order.status === "pending" && "Ожидает"}
                            {(order.status === "failed" || order.status === "cancelled") && "Отменен"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(order.status === "pending" || order.status === "processing") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={resendingId === order.id}
                                onClick={() => handleResend(order.id)}
                                title="Отправить повторно"
                              >
                                {resendingId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {order.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={cancellingId === order.id}
                                onClick={() => handleCancel(order.id)}
                              >
                                {cancellingId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span className="sr-only">Отменить</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border bg-card p-3 text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[160px]">
                          {order.id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "d MMM yyyy, HH:mm", {
                            locale: ru,
                          })}
                        </span>
                      </div>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "processing"
                            ? "secondary"
                            : (order.status === "failed" || order.status === "cancelled")
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          order.status === "completed"
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                      >
                        {order.status === "completed" && "Выполнен"}
                        {order.status === "processing" && "В обработке"}
                        {order.status === "pending" && "Ожидает"}
                        {(order.status === "failed" || order.status === "cancelled") && "Отменен"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        <span className="block">Никнейм</span>
                        <span className="font-medium text-foreground">
                          {order.username}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <span className="block">Сумма</span>
                        <span className="font-medium text-foreground flex items-center justify-end gap-1">
                          {order.amount}
                          <RobuxIcon className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Стоимость</span>
                      <span className="font-medium text-foreground">
                        {order.price} ₽
                      </span>
                    </div>
                    {order.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        disabled={cancellingId === order.id}
                        onClick={() => handleCancel(order.id)}
                      >
                        {cancellingId === order.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                        )}
                        Отменить заказ
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
