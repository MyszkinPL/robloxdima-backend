"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { RussianRuble } from "lucide-react"
import { TelegramLogin } from "@/components/auth/telegram-login"
import { WalletDialog } from "@/components/wallet/wallet-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getBackendBaseUrl } from "@/lib/api"

interface User {
  id: string
  balance: number
}

import { RobuxIcon } from "@/components/robux-icon"

interface PurchaseFormProps {
  rate: number
  user: User | null
  botName: string
}

export function PurchaseForm({ rate, user, botName }: PurchaseFormProps) {
  const [amount, setAmount] = useState<number>(100)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [orderType, setOrderType] = useState<"gamepass" | "vip">("gamepass")
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  
  const price = amount * rate
  const balance = user?.balance || 0
  const missingAmount = Math.max(0, price - balance)

  useEffect(() => {
    if (user) return
    if (typeof window === "undefined") return

    const tg = (
      window as typeof window & {
        Telegram?: { WebApp?: { initData?: string } }
      }
    ).Telegram?.WebApp
    if (!tg || !tg.initData) return

    setIsTelegramMiniApp(true)

    let cancelled = false

    const authorize = async () => {
      const baseUrl = getBackendBaseUrl()
      if (!baseUrl) {
        toast.error("BACKEND_URL не настроен для миниаппы")
        return
      }
      const url = `${baseUrl}/api/auth/telegram-mini`
      try {
        setIsAuthorizing(true)
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ initData: tg.initData }),
        })

        const data = await res.json()

        if (!cancelled && res.ok && data.success) {
          window.location.reload()
        } else if (!cancelled) {
          toast.error(data.error || "Не удалось авторизоваться через миниаппу")
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("Ошибка авторизации через Telegram")
        }
      } finally {
        if (!cancelled) {
          setIsAuthorizing(false)
        }
      }
    }

    authorize()

    return () => {
      cancelled = true
    }
  }, [user])

  async function handleSubmit(formData: FormData) {
    if (!user) {
      toast.error("Пожалуйста, войдите в аккаунт")
      return
    }

    if (missingAmount > 0) {
      setIsWalletOpen(true)
      return
    }

    try {
      setIsPending(true)

      const username = formData.get("username")
      const amountValue = Number(formData.get("amount"))
      let placeIdRaw = formData.get("placeId")

      if (!username || !amountValue || !placeIdRaw) {
        toast.error("Заполните все поля")
        return
      }

      if (typeof placeIdRaw === "string" && placeIdRaw.includes("roblox.com")) {
        const match = placeIdRaw.match(/\/games\/(\d+)/)
        if (match) {
          placeIdRaw = match[1]
        }
      }

      if (!/^\d+$/.test(String(placeIdRaw))) {
        toast.error("Некорректный ID плейса. Введите только цифры.")
        return
      }

      const payload = {
        username,
        amount: amountValue,
        placeId: placeIdRaw,
      }

      const baseUrl = getBackendBaseUrl()
      if (!baseUrl) {
        toast.error("Бэкенд недоступен. Проверьте конфигурацию BACKEND_URL.")
        return
      }
      const path = orderType === "vip" ? "/api/orders/vip-server" : "/api/orders"
      const endpoint = `${baseUrl}${path}`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || "Ошибка создания заказа")
      } else {
        toast.success("Заказ успешно создан! ID: " + data.orderId)
        window.location.reload()
      }
    } catch (error) {
      console.error("Error creating order:", error)
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка"
      toast.error(`Ошибка: ${message}`)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Никнейм Roblox</Label>
            <Input 
              id="username" 
              name="username" 
              placeholder="Username" 
              required 
              minLength={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Количество Robux</Label>
            <Input 
              id="amount" 
              name="amount" 
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              required 
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Минимум 10 <RobuxIcon className="w-3 h-3" />
            </p>
          </div>

          <div className="space-y-2">
            <Label>Тип заказа</Label>
            <Tabs
              value={orderType}
              onValueChange={(value) => {
                if (!value) return
                setOrderType(value as "gamepass" | "vip")
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="gamepass">
                  Gamepass
                </TabsTrigger>
                <TabsTrigger value="vip">
                  VIP сервер
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gamepass">
                <p className="text-xs text-muted-foreground">
                  Заказ Robux через Gamepass.
                </p>
              </TabsContent>
              <TabsContent value="vip">
                <p className="text-xs text-muted-foreground">
                  Заказ Robux через VIP сервер.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="placeId">ID Плейса (Place ID)</Label>
            <Input 
              id="placeId" 
              name="placeId" 
              type="text"
              inputMode="numeric"
              placeholder="123456789" 
              required 
            />
            <p className="text-xs text-muted-foreground">
              ID плейса, на который будет создан Gamepass или VIP сервер.{" "}
              <a
                href="https://www.youtube.com/watch?v=GcyrXowokno"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Как получить Place ID
              </a>
            </p>
          </div>

          <div className="pt-4 flex justify-between items-center border-t">
          <span className="font-medium">Итого к оплате:</span>
          <div className="flex items-center text-xl font-bold text-primary">
            {price.toFixed(2)} <RussianRuble className="size-5 ml-1" />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {user ? (
            <p>
              Оплата спишется с вашего <b>баланса на сайте</b>. 
              <br />
              Текущий баланс: <b>{user.balance.toFixed(2)} ₽</b>
              {missingAmount > 0 && (
                <>
                  <br />
                  <span className="text-destructive font-semibold">Не хватает: {missingAmount.toFixed(2)} ₽</span>
                </>
              )}
            </p>
          ) : (
            <p>
              Для совершения покупки необходимо авторизоваться.
              <br />
              После входа вы сможете пополнить баланс и оформить заказ.
            </p>
          )}
        </div>
      </div>
      
      {user ? (
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          variant={missingAmount > 0 ? "secondary" : "default"}
        >
          {isPending
            ? "Обработка..."
            : missingAmount > 0
              ? `Пополнить баланс (+${missingAmount.toFixed(2)} ₽)`
              : "Купить (с баланса)"}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-center p-2 border rounded-lg bg-background">
            {isTelegramMiniApp ? (
              <span className="text-sm text-muted-foreground">
                {isAuthorizing
                  ? "Авторизация через Telegram..."
                  : "Ожидание авторизации через Telegram"}
              </span>
            ) : (
              <TelegramLogin botName={botName} />
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Нажимая кнопку, вы соглашаетесь с правилами сервиса
          </p>
        </div>
      )}
    </form>

    <WalletDialog 
      open={isWalletOpen} 
      onOpenChange={setIsWalletOpen}
      initialAmount={missingAmount > 0 ? missingAmount : 100}
    />
  </>
  )
}
