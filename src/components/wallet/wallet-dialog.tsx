"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ExternalLink, Plus } from "lucide-react"
import { toast } from "sonner"
import { Payment } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WalletDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialAmount?: number
}

export function WalletDialog({ children, open, onOpenChange, initialAmount }: WalletDialogProps) {
  const [activeTab, setActiveTab] = useState("top-up")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Кошелек</DialogTitle>
          <DialogDescription>
            Пополнение баланса и история операций.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="top-up" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="top-up">Пополнить</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>
          <TabsContent value="top-up" className="space-y-4 py-4">
             <TopUpTabContent initialAmount={initialAmount} />
          </TabsContent>
          <TabsContent value="history" className="py-4">
             <HistoryTabContent active={activeTab === 'history'} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function TopUpTabContent({ initialAmount }: { initialAmount?: number }) {
  const [amount, setAmount] = useState(initialAmount ? initialAmount.toString() : "")
  
  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount.toString())
    }
  }, [initialAmount])

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

  /* Removed manual check handler
  const handleCheckPayment = async () => {
    // ...
  }
  */

  if (paymentData) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="p-4 border rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground mb-1">Сумма к оплате</p>
          <p className="text-3xl font-bold">{amount} ₽</p>
        </div>
        
        <Button asChild className="w-full" variant="outline">
          <a href={paymentData.paymentUrl} target="_blank" rel="noopener noreferrer">
            Оплатить в Crypto Bot <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>

        <div className="flex flex-col gap-2">
           <div className="flex items-center justify-center text-sm text-muted-foreground animate-pulse py-2">
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             Ожидание оплаты...
           </div>
          <Button 
            variant="ghost" 
            onClick={() => setPaymentData(null)}
          >
            Отмена
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleCreateInvoice} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="amount">
          Сумма пополнения (₽)
        </label>
        <div className="relative">
            <Input 
                id="amount" 
                placeholder="100" 
                type="number" 
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="pl-9"
            />
            <span className="absolute left-3 top-2.5 text-muted-foreground">₽</span>
        </div>
        <p className="text-[0.8rem] text-muted-foreground">
          Минимальная сумма: 1 ₽
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Создать счет
      </Button>
    </form>
  )
}

function HistoryTabContent({ active }: { active: boolean }) {
  const [history, setHistory] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (active) {
        const fetchHistory = async () => {
             setLoading(true)
             try {
               const res = await fetch("/api/wallet/history")
               const data = await res.json()

               if (res.ok && data.success && data.payments) {
                 setHistory(data.payments)
               }
             } catch (error) {
               console.error("Error loading payment history:", error)
             } finally {
                setLoading(false)
             }
        }
        fetchHistory()
    }
  }, [active])

  if (loading && history.length === 0) {
    return (
        <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    )
  }

  if (history.length === 0) {
      return (
          <div className="text-center py-8 text-muted-foreground text-sm">
              История операций пуста
          </div>
      )
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
            {history.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <div className="grid gap-1">
                        <div className="font-medium flex items-center gap-2">
                            Пополнение
                            {getStatusBadge(payment.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleString('ru-RU')}
                        </div>
                    </div>
                    <div className="font-bold">
                        +{payment.amount} ₽
                    </div>
                </div>
            ))}
        </div>
    </ScrollArea>
  )
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'paid':
            return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Успешно</Badge>
        case 'pending':
            return <Badge variant="secondary">Ожидание</Badge>
        case 'expired':
            return <Badge variant="destructive">Истек</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}
