"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export function TopUpForm() {
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<{ paymentUrl: string; paymentId: string } | null>(null)

  // Polling for payment status
  useEffect(() => {
    if (!paymentData) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wallet/status/${paymentData.paymentId}`)
        const data = await res.json()

        if (res.ok && data.success && data.status === "paid") {
          toast.success("Оплата прошла успешно! Баланс пополнен.")
          setPaymentData(null)
          setAmount("")
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [paymentData])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    setIsLoading(true)
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: Number(amount) }),
      })

      const data = await res.json()

      if (res.ok && data.success && data.paymentUrl && data.paymentId) {
        setPaymentData({ paymentUrl: data.paymentUrl, paymentId: data.paymentId })
        toast.success("Счет создан! Оплатите его по ссылке.")
      } else {
        toast.error(data.error || "Ошибка создания счета")
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      toast.error("Произошла ошибка при создании счета")
    } finally {
      setIsLoading(false)
    }
  }

  /* Removed manual check
  const handleCheckPayment = async () => {
     // ...
  }
  */

  if (paymentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Оплата счета</CardTitle>
          <CardDescription>
            Перейдите в бот для оплаты. Статус обновится автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-2">Сумма к оплате</p>
            <p className="text-2xl font-bold">{amount} ₽</p>
          </div>
          
          <Button asChild className="w-full" variant="outline">
            <a href={paymentData.paymentUrl} target="_blank" rel="noopener noreferrer">
              Оплатить в Crypto Bot <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
           <div className="flex items-center justify-center text-sm text-muted-foreground animate-pulse py-2">
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             Ожидание оплаты...
           </div>
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setPaymentData(null)}
          >
            Отмена
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пополнение баланса</CardTitle>
        <CardDescription>
          Введите сумму для пополнения через Crypto Bot.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleCreateInvoice}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="100" 
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Создать счет"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
