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
import { Loader2, ExternalLink, Plus, RussianRuble, CreditCard, X } from "lucide-react"
import { toast } from "sonner"
import { User } from "@/lib/db"
import { getBackendBaseUrl } from "@/lib/api"
import { getSessionUser } from "@/lib/session"

interface WalletDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialAmount?: number
}

export function WalletDialog({ children, open, onOpenChange, initialAmount }: WalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-full px-4">
        <DialogHeader>
          <DialogTitle>Кошелек</DialogTitle>
          <DialogDescription>
            Пополнение баланса.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <TopUpTabContent initialAmount={initialAmount} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

type TopUpTabContentProps = {
  initialAmount?: number
}

function TopUpTabContent({ initialAmount }: TopUpTabContentProps) {
  const [amount, setAmount] = useState(initialAmount ? initialAmount.toString() : "")
  
  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount.toString())
    }
  }, [initialAmount])

  const [isLoading, setIsLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<{ paymentUrl: string; paymentId: string } | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isUserLoading, setIsUserLoading] = useState(true)
  const [bybitUidDraft, setBybitUidDraft] = useState("")
  const [isSavingBybitUid, setIsSavingBybitUid] = useState(false)
  const [rubToUsdtRate, setRubToUsdtRate] = useState<number | null>(null)
  const [isRateLoading, setIsRateLoading] = useState(false)
  const [usdtAmount, setUsdtAmount] = useState("")
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [paymentCheckCooldown, setPaymentCheckCooldown] = useState(0)
  const [lastTopupSuccessAmount, setLastTopupSuccessAmount] = useState<number | null>(null)
  const [isBybitChecking, setIsBybitChecking] = useState(false)
  const [bybitCooldown, setBybitCooldown] = useState(0)
  const [methodTab, setMethodTab] = useState<"cryptobot" | "bybit">("cryptobot")
  const [storeBybitUid, setStoreBybitUid] = useState<string | null>(null)
  const [bybitStep, setBybitStep] = useState<1 | 2 | 3 | 4>(1)

  const normalizedBybitAmount = amount.replace(",", ".")
  const bybitAmountNumber = Number(normalizedBybitAmount)
  const hasValidBybitAmount = Number.isFinite(bybitAmountNumber) && bybitAmountNumber > 0
  const hasStoreBybitUid = !!storeBybitUid && storeBybitUid.length > 0
  const hasUserBybitUid = !!currentUser?.bybitUid

  useEffect(() => {
    let cancelled = false
    const loadUser = async () => {
      setIsUserLoading(true)
      try {
        const user = await getSessionUser()
        if (!cancelled) {
          setCurrentUser(user)
          setBybitUidDraft(user?.bybitUid || "")
        }
      } finally {
        if (!cancelled) {
          setIsUserLoading(false)
        }
      }
    }
    loadUser()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const maxStep: 1 | 2 | 3 | 4 =
      hasValidBybitAmount && hasUserBybitUid && hasStoreBybitUid
        ? 4
        : hasValidBybitAmount && hasUserBybitUid
        ? 3
        : hasValidBybitAmount
        ? 2
        : 1

    setBybitStep((prev) => (prev > maxStep ? maxStep : prev))
  }, [hasValidBybitAmount, hasUserBybitUid, hasStoreBybitUid])

  const canGoNext =
    (bybitStep === 1 && hasValidBybitAmount) ||
    (bybitStep === 2 && hasValidBybitAmount && hasUserBybitUid) ||
    (bybitStep === 3 && hasValidBybitAmount && hasUserBybitUid && hasStoreBybitUid)

  const handleNextStep = () => {
    if (!canGoNext) return
    setBybitStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))
  }

  const handlePrevStep = () => {
    setBybitStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))
  }

  useEffect(() => {
    if (paymentCheckCooldown <= 0) {
      return
    }
    const interval = setInterval(() => {
      setPaymentCheckCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [paymentCheckCooldown])
  useEffect(() => {
    let cancelled = false
    const loadSettings = async () => {
      try {
        const backendBaseUrl = getBackendBaseUrl()
        const res = await fetch(`${backendBaseUrl}/api/settings/public`, {
          credentials: "include",
        })
        if (!res.ok) {
          return
        }
        const data = await res.json()
        if (cancelled) {
          return
        }
        const value =
          typeof data.bybitStoreUid === "string" && data.bybitStoreUid.trim().length > 0
            ? data.bybitStoreUid.trim()
            : ""
        setStoreBybitUid(value)
      } catch {
      }
    }
    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadRate = async () => {
      setIsRateLoading(true)
      try {
        const backendBaseUrl = getBackendBaseUrl()
        const res = await fetch(`${backendBaseUrl}/api/wallet/rate`, {
          credentials: "include",
        })
        const data = await res.json()
        if (!cancelled && res.ok && data.success && typeof data.rate === "number") {
          setRubToUsdtRate(data.rate)
        }
      } catch (error) {
        console.error("Error loading RUB→USDT rate:", error)
      } finally {
        if (!cancelled) {
          setIsRateLoading(false)
        }
      }
    }
    loadRate()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const normalized = amount.replace(",", ".")
    const value = Number(normalized)
    if (!rubToUsdtRate || !Number.isFinite(value) || value <= 0) {
      setUsdtAmount("")
      return
    }
    const usdt = value * rubToUsdtRate
    setUsdtAmount(usdt.toFixed(2))
  }, [amount, rubToUsdtRate])

  const handleSaveBybitUid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setIsSavingBybitUid(true)
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const value = bybitUidDraft.trim()
      const res = await fetch(`${backendBaseUrl}/api/me/bybit-uid`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bybitUid: value.length > 0 ? value : null,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const updated: User = {
          ...currentUser,
          bybitUid: data.bybitUid ?? undefined,
        }
        setCurrentUser(updated)
        toast.success("Bybit UID сохранен")
      } else {
        toast.error(data.error || "Не удалось сохранить Bybit UID")
      }
    } catch (error) {
      console.error("Error saving Bybit UID:", error)
      toast.error("Ошибка при сохранении Bybit UID")
    } finally {
      setIsSavingBybitUid(false)
    }
  }

  useEffect(() => {
    if (bybitCooldown <= 0) {
      return
    }
    const interval = setInterval(() => {
      setBybitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [bybitCooldown])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return

    setIsLoading(true)
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/wallet/topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount: Number(amount) }),
      })

      const data = await res.json()

      if (res.ok && data.success && data.paymentUrl && data.paymentId) {
        setPaymentData({ paymentUrl: data.paymentUrl, paymentId: data.paymentId })
        setPaymentCheckCooldown(5)
        toast.success("Счет создан! Оплатите его по ссылке.")
      } else if (res.status === 409 && data.existingPayment) {
        const existing = data.existingPayment as {
          id: string
          amount: number
          invoiceUrl?: string | null
        }
        setAmount(String(existing.amount))
        if (existing.invoiceUrl) {
          setPaymentData({ paymentUrl: existing.invoiceUrl, paymentId: existing.id })
        }
        toast.message("У вас уже есть ожидающий счет. Сначала оплатите или отмените его.")
      } else {
        toast.error(data.error || "Ошибка создания счета")
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка"
      toast.error(`Ошибка: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckPayment = async () => {
    if (!paymentData) return
    setIsCheckingPayment(true)
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/wallet/status/${paymentData.paymentId}`, {
        credentials: "include",
      })
      const data = await res.json()

      if (res.ok && data.success && data.status === "paid") {
        toast.success("Оплата прошла успешно! Баланс пополнен.")
        setLastTopupSuccessAmount(Number(amount) || null)
        setPaymentData(null)
        setAmount("")
        window.location.reload()
      } else if (res.ok && data.success) {
        toast.message("Платеж пока не оплачен", {
          description: "Попробуйте чуть позже, после завершения оплаты в боте.",
        })
      } else {
        toast.error(data.error || "Не удалось проверить статус платежа")
      }
    } catch (error) {
      console.error("Error checking payment status:", error)
      toast.error("Ошибка при проверке статуса платежа")
    } finally {
      setIsCheckingPayment(false)
    }
  }

  const handleCancelCurrentPayment = async () => {
    if (!paymentData) return
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(
        `${backendBaseUrl}/api/wallet/payments/${paymentData.paymentId}/cancel`,
        {
          method: "POST",
          credentials: "include",
        },
      )
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Платеж отменен. Теперь можно создать новый счет.")
        setPaymentData(null)
        setPaymentCheckCooldown(0)
      } else {
        toast.error(data.error || "Не удалось отменить платеж")
      }
    } catch (error) {
      console.error("Error cancelling payment:", error)
      toast.error("Ошибка при отмене платежа")
    }
  }

  const handleBybitQuickCheck = async () => {
    if (!currentUser?.bybitUid) {
      toast.error("Сначала укажите ваш Bybit UID")
      return
    }
    if (bybitCooldown > 0 || isBybitChecking) {
      return
    }
    setIsBybitChecking(true)
    try {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/wallet/bybit/check`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()

      if (res.status === 429) {
        toast.error(data.error || "Слишком часто. Попробуйте позже.")
      } else if (res.ok && data.success) {
        const processed = typeof data.processed === "number" ? data.processed : 0
        if (processed > 0) {
          toast.success(`Синхронизировано пополнений Bybit: ${processed}`)
          setBybitStep(4)
        } else {
          toast.message("Пока новых пополнений Bybit не найдено")
        }
      } else {
        toast.error(data.error || "Не удалось проверить пополнения Bybit")
      }
    } catch (error) {
      console.error("Error checking Bybit deposits:", error)
      toast.error("Ошибка при проверке пополнений Bybit")
    } finally {
      setIsBybitChecking(false)
      setBybitCooldown(15)
    }
  }

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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
            <span>Оплатите счет в боте, затем нажмите «Я оплатил».</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={handleCancelCurrentPayment}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleCheckPayment}
            disabled={isCheckingPayment || paymentCheckCooldown > 0}
          >
            {isCheckingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {paymentCheckCooldown > 0
              ? `Кнопка станет активной через ${paymentCheckCooldown} c`
              : "Я оплатил"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {lastTopupSuccessAmount !== null && (
        <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/40 px-4 py-3 text-sm">
          Баланс успешно пополнен на {lastTopupSuccessAmount} ₽.
        </div>
      )}
      <Tabs
        value={methodTab}
        onValueChange={(value) => setMethodTab((value as "cryptobot" | "bybit") || "cryptobot")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cryptobot">Crypto Bot</TabsTrigger>
          <TabsTrigger value="bybit">Bybit UID</TabsTrigger>
        </TabsList>
        <TabsContent value="cryptobot" className="space-y-4 pt-4">
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none" htmlFor="amount">
                  Сумма пополнения (₽)
                </label>
                <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  <span>Crypto Bot</span>
                </div>
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  placeholder="100"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="pl-10"
                />
                <RussianRuble className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                Минимальная сумма: 1 ₽
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1.4fr_minmax(0,1fr)]">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Создать счет в Crypto Bot
              </Button>
            </div>
          </form>
        </TabsContent>
        <TabsContent value="bybit" className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
                {([1, 2, 3, 4] as const).map((step) => {
                  const isActive = bybitStep === step
                  const label =
                    step === 1
                      ? "Сумма"
                      : step === 2
                      ? "Ваш UID"
                      : step === 3
                      ? "Перевод"
                      : "Проверка"

                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                        step <= bybitStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[11px]">
                        {step}
                      </span>
                      {isActive && <span>{label}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Пополнение через Bybit по UID</div>
                {storeBybitUid && storeBybitUid.length > 0 && (
                  <div className="flex flex-col items-end gap-1 text-[11px]">
                    <span className="text-muted-foreground">UID магазина</span>
                    <span className="rounded-md bg-background px-2 py-1 font-mono text-xs select-all">
                      {storeBybitUid}
                    </span>
                  </div>
                )}
              </div>

              {bybitStep === 1 && (
                <div className="space-y-2 text-xs">
                  <label
                    className="text-[11px] font-medium text-muted-foreground"
                    htmlFor="bybit-amount"
                  >
                    Сумма пополнения (₽)
                  </label>
                  <div className="relative">
                    <Input
                      id="bybit-amount"
                      placeholder="100"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                      }}
                      className="pl-8"
                    />
                    <RussianRuble className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Пополнение зачисляется в рублях на баланс кабинета.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Сумма перевода в Bybit:{" "}
                    {isRateLoading
                      ? "загрузка курса..."
                      : usdtAmount
                      ? `${usdtAmount} USDT`
                      : rubToUsdtRate
                      ? "введите сумму выше"
                      : "курс недоступен"}
                  </p>
                </div>
              )}

              {bybitStep > 1 && isUserLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Загрузка данных Bybit...
                </div>
              )}

              {!isUserLoading && bybitStep > 1 && (
                <div className="space-y-3 text-xs text-muted-foreground">
                  {storeBybitUid === "" && (
                    <p>
                      UID магазина Bybit пока не настроен. Перед пополнением узнайте его у поддержки.
                    </p>
                  )}

                  {bybitStep === 2 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium">Шаг 2. Ваш UID</p>
                      <p>
                        Укажите ваш Bybit UID, чтобы мы могли найти ваши внутренние переводы и зачислить пополнение.
                      </p>
                      <form
                        onSubmit={(e) => {
                          handleSaveBybitUid(e)
                        }}
                        className="space-y-2"
                      >
                        <div className="space-y-1">
                          <label
                            htmlFor="bybit-uid-input"
                            className="text-[11px] font-medium text-muted-foreground"
                          >
                            Ваш Bybit UID
                          </label>
                          <Input
                            id="bybit-uid-input"
                            type="text"
                            placeholder="Например, 123456789"
                            value={bybitUidDraft}
                            onChange={(e) => setBybitUidDraft(e.target.value)}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            UID можно посмотреть в профиле Bybit.
                          </p>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full"
                          disabled={isSavingBybitUid}
                        >
                          {isSavingBybitUid ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Сохранение...
                            </>
                          ) : currentUser?.bybitUid ? (
                            "Обновить UID"
                          ) : (
                            "Сохранить UID"
                          )}
                        </Button>
                      </form>
                      {currentUser?.bybitUid && (
                        <div className="rounded-md bg-background px-3 py-2 text-xs font-medium">
                          Текущий UID:{" "}
                          <span className="ml-1 font-mono select-all">{currentUser.bybitUid}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {bybitStep === 3 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium">Шаг 3. Перевод в Bybit</p>
                      {!hasValidBybitAmount && (
                        <p className="text-[11px] text-muted-foreground">
                          Сначала введите сумму пополнения выше.
                        </p>
                      )}
                      <ol className="list-decimal space-y-1 pl-4">
                        <li>
                          Откройте Bybit и создайте внутренний перевод на UID магазина{" "}
                          {storeBybitUid ? (
                            <span className="rounded-md bg-background px-2 py-0.5 font-mono text-[11px] select-all">
                              {storeBybitUid}
                            </span>
                          ) : (
                            "— уточните у поддержки"
                          )}
                          .
                        </li>
                        <li>
                          Укажите сумму перевода:{" "}
                          {usdtAmount
                            ? `${usdtAmount} USDT`
                            : rubToUsdtRate && amount
                            ? `${(Number(amount.replace(",", ".")) * rubToUsdtRate).toFixed(2)} USDT`
                            : "укажите сумму"}{" "}
                          (сумма списания: {amount || "0"} ₽).
                        </li>
                        <li>
                          Отправляйте перевод с аккаунта, чей Bybit UID указан выше как ваш.
                        </li>
                      </ol>
                    </div>
                  )}

                  {bybitStep === 4 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium">Шаг 4. Проверка пополнения</p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={handleBybitQuickCheck}
                        disabled={
                          isBybitChecking ||
                          bybitCooldown > 0 ||
                          !hasUserBybitUid ||
                          !hasValidBybitAmount ||
                          !hasStoreBybitUid
                        }
                      >
                        {isBybitChecking && (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        )}
                        {bybitCooldown > 0
                          ? `Проверить пополнения Bybit (через ${bybitCooldown} c)`
                          : "Я отправил, проверить пополнения Bybit"}
                      </Button>
                      {(!hasUserBybitUid || !hasValidBybitAmount || !hasStoreBybitUid) && (
                        <p className="text-[11px] text-muted-foreground">
                          Чтобы проверить пополнение, введите сумму, сохраните ваш UID и
                          убедитесь, что UID магазина настроен.
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        После зачисления внутреннего перевода он появится в истории операций и будет учтен в балансе. Если пополнения нет, воспользуйтесь проверкой пополнений.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-24"
                  onClick={handlePrevStep}
                  disabled={bybitStep === 1}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={handleNextStep}
                  disabled={!canGoNext || bybitStep >= 4}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
