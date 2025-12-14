"use client"

import { useTransition, useState, useEffect } from "react"
import { saveSettings, checkCryptoBotConnection } from "@/app/(dashboard)/admin/settings/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { AdminSettings } from "@/lib/settings"
import { Loader2, CheckCircle2, XCircle, RefreshCw, Plus, Trash2, Copy } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"

interface FAQItem {
  question: string;
  answer: string;
}

interface Currency {
  code: string;
  name: string;
  is_blockchain: boolean;
  is_fiat: boolean;
  is_stablecoin: boolean;
}

const FIAT_CURRENCIES = ["RUB", "USD", "EUR", "UAH", "BYN", "KZT", "UZS", "GBP"];

export default function SettingsForm({ settings }: { settings: AdminSettings }) {
  const [isPending, startTransition] = useTransition()
  const [isCheckingCrypto, setIsCheckingCrypto] = useState(false)
  const [cryptoCheckResult, setCryptoCheckResult] = useState<{
    success: boolean
    me?: unknown
    currencies?: Currency[]
    error?: string
  } | null>(null)
  
  const [faqItems, setFaqItems] = useState<FAQItem[]>(() => {
    const faq = settings.faq
    if (!faq) return []
    try {
      const parsed = JSON.parse(faq)
      return Array.isArray(parsed) ? (parsed as FAQItem[]) : []
    } catch {
      return []
    }
  })
  
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([])
  const [allowedAssets, setAllowedAssets] = useState<string[]>(() => {
    const assets = settings.cryptoBotAllowedAssets
    return assets ? assets.split(",") : []
  })
  const [fiatCurrency, setFiatCurrency] = useState(settings.cryptoBotFiatCurrency || "RUB")
  const [webhookUrl] = useState(
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/crypto-bot`
      : "",
  )
  const [pricingMode, setPricingMode] = useState(settings.pricingMode || "manual")

  async function handleCheckCryptoBot() {
    setIsCheckingCrypto(true)
    setCryptoCheckResult(null)
    const result = await checkCryptoBotConnection()
    const typedResult = result as {
      success: boolean
      me?: unknown
      currencies?: Currency[]
      error?: string
    }
    setCryptoCheckResult(typedResult)
    setIsCheckingCrypto(false)
    
    if (typedResult.success) {
      toast.success("CryptoBot подключен успешно")
      if (typedResult.currencies) {
        setAvailableCurrencies(typedResult.currencies)
      }
    } else {
      toast.error(typedResult.error || "Ошибка подключения CryptoBot")
    }
  }

  useEffect(() => {
    async function autoCheck() {
      if (settings.cryptoBotToken && availableCurrencies.length === 0) {
        await handleCheckCryptoBot()
      }
    }
    void autoCheck()
  }, [settings.cryptoBotToken, availableCurrencies.length])

  function handleSubmit(formData: FormData) {
    // Serialize FAQ
    formData.set("faq", JSON.stringify(faqItems))
    
    // Serialize Allowed Assets
    formData.set("cryptoBotAllowedAssets", allowedAssets.join(","))
    
    // Set Fiat Currency (controlled input)
    formData.set("cryptoBotFiatCurrency", fiatCurrency)

    startTransition(async () => {
      const result = await saveSettings(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Настройки сохранены")
        window.location.reload()
      }
    })
  }

  const addFaqItem = () => {
    setFaqItems([...faqItems, { question: "", answer: "" }])
  }

  const removeFaqItem = (index: number) => {
    setFaqItems(faqItems.filter((_, i) => i !== index))
  }

  const updateFaqItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...faqItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setFaqItems(newItems)
  }

  // Assets Handlers
  const toggleAsset = (code: string) => {
    if (allowedAssets.includes(code)) {
      setAllowedAssets(allowedAssets.filter(a => a !== code))
    } else {
      setAllowedAssets([...allowedAssets, code])
    }
  }

  const toggleAllAssets = () => {
    if (allowedAssets.length === availableCurrencies.length) {
      setAllowedAssets([])
    } else {
      setAllowedAssets(availableCurrencies.map(c => c.code))
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Настройки магазина</h1>
      
      <form action={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Основные настройки</CardTitle>
            <CardDescription>
              Управление курсом продажи и режимом работы.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricingMode">Режим ценообразования</Label>
                <Select 
                  name="pricingMode" 
                  value={pricingMode} 
                  onValueChange={setPricingMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Ручной</SelectItem>
                    <SelectItem value="auto">Автоматический (от поставщика)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {pricingMode === "manual" 
                    ? "Используется фиксированный курс, заданный ниже." 
                    : "Курс рассчитывается автоматически на основе цены поставщика (RBXCRATE) и курса доллара."}
                </p>
              </div>

              {pricingMode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="rate">Курс (RUB за 1 Robux)</Label>
                  <Input 
                    id="rate" 
                    name="rate" 
                    type="text"
                    inputMode="decimal"
                    defaultValue={settings.rate} 
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Настройка наценки</Label>
                  <div className="flex gap-2">
                     <Select name="markupType" defaultValue={settings.markupType || "percent"}>
                        <SelectTrigger className="w-[110px]">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="percent">Процент %</SelectItem>
                           <SelectItem value="fixed">Фикс. (RUB)</SelectItem>
                        </SelectContent>
                     </Select>
                     <Input 
                        name="markupValue"
                        type="number" 
                        step="0.01"
                        defaultValue={settings.markupValue} 
                        placeholder="Наценка"
                        className="flex-1"
                     />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Наценка добавляется к базовой стоимости 1 робукса.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
               <Switch 
                 id="maintenance" 
                 name="maintenance" 
                 defaultChecked={settings.maintenance} 
               />
               <Label htmlFor="maintenance">Режим тех. работ</Label>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контент и поддержка</CardTitle>
            <CardDescription>
              Настройка FAQ и ссылки на поддержку.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="supportLink">Ссылка на поддержку</Label>
              <Input 
                id="supportLink" 
                name="supportLink" 
                type="text" 
                defaultValue={settings.supportLink} 
                placeholder="https://t.me/support_user" 
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>FAQ (Вопросы и ответы)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFaqItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить вопрос
                </Button>
              </div>
              
              {faqItems.length === 0 && (
                <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
                  Нет вопросов. Нажмите &quot;Добавить вопрос&quot;, чтобы создать FAQ.
                </div>
              )}

              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start border p-4 rounded-lg bg-card">
                    <div className="grid gap-4 flex-1">
                      <div className="space-y-2">
                        <Label htmlFor={`q-${index}`}>Вопрос</Label>
                        <Input
                          id={`q-${index}`}
                          value={item.question}
                          onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                          placeholder="Как купить робуксы?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`a-${index}`}>Ответ</Label>
                        <Textarea
                          id={`a-${index}`}
                          value={item.answer}
                          onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                          placeholder="Выберите нужный пак и оплатите..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => removeFaqItem(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Сохранение..." : "Обновить контент"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Интеграции</CardTitle>
            <CardDescription>
              Ключи доступа к внешним сервисам.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="rbxKey">RBXCrate API Key</Label>
              <PasswordInput 
                id="rbxKey" 
                name="rbxKey" 
                defaultValue={settings.rbxKey} 
                placeholder="Введите ключ" 
              />
            </div>
            
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Crypto Bot (Crypto Pay)</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCheckCryptoBot}
                  disabled={isCheckingCrypto || !settings.cryptoBotToken}
                >
                  {isCheckingCrypto ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Проверить подключение
                </Button>
              </div>

              {cryptoCheckResult && (
                <div className={`text-sm p-3 rounded-md ${cryptoCheckResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {cryptoCheckResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        <span className="font-medium">
                          Подключено
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="mr-2 h-4 w-4" />
                      <span>Ошибка: {cryptoCheckResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="cryptoBotToken">API Token</Label>
                <PasswordInput 
                  id="cryptoBotToken" 
                  name="cryptoBotToken" 
                  defaultValue={settings.cryptoBotToken} 
                  placeholder="Введите токен" 
                />
                <p className="text-xs text-muted-foreground">
                  Получить токен можно в <a href="https://t.me/CryptoBot" target="_blank" className="underline hover:text-primary">@CryptoBot</a>.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                 <Switch 
                   id="cryptoBotTestnet" 
                   name="cryptoBotTestnet" 
                   defaultChecked={settings.cryptoBotTestnet} 
                 />
                 <Label htmlFor="cryptoBotTestnet">Использовать Testnet</Label>
              </div>

              {webhookUrl && (
                <div className="space-y-2">
                  <Label>Webhook URL (для настроек бота)</Label>
                  <div className="flex items-center space-x-2">
                    <Input readOnly value={webhookUrl} className="bg-muted" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl)
                        toast.success("Ссылка скопирована")
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Укажите эту ссылку в настройках вашего приложения в CryptoBot (Webhooks).
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cryptoBotFiatCurrency">Основная валюта (Fiat)</Label>
                  <Select 
                    value={fiatCurrency} 
                    onValueChange={setFiatCurrency}
                    name="cryptoBotFiatCurrency"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите валюту" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIAT_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Валюта, в которой будут выставляться счета.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Разрешенные криптовалюты</Label>
                    {availableCurrencies.length > 0 && (
                       <Button 
                         type="button" 
                         variant="ghost" 
                         size="sm" 
                         className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                         onClick={toggleAllAssets}
                       >
                         {allowedAssets.length === availableCurrencies.length ? "Снять все" : "Выбрать все"}
                       </Button>
                    )}
                  </div>
                  
                  {availableCurrencies.length > 0 ? (
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {availableCurrencies.map((currency) => (
                          <div key={currency.code} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`asset-${currency.code}`} 
                              checked={allowedAssets.includes(currency.code)}
                              onCheckedChange={() => toggleAsset(currency.code)}
                            />
                            <Label 
                              htmlFor={`asset-${currency.code}`} 
                              className="text-sm font-normal cursor-pointer"
                            >
                              {currency.code}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[100px] rounded-md border border-dashed text-sm text-muted-foreground bg-muted/50 p-4 text-center">
                       {settings.cryptoBotToken ? (
                       <>
                           <p className="mb-2">Нажмите &quot;Проверить подключение&quot;, чтобы загрузить список валют.</p>
                           {allowedAssets.length > 0 && (
                             <p className="text-xs">Текущие: {allowedAssets.join(", ")}</p>
                           )}
                         </>
                       ) : (
                         <p>Введите токен для настройки валют.</p>
                       )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Выберите криптовалюты для оплаты.
                  </p>
                  <input type="hidden" name="cryptoBotAllowedAssets" value={allowedAssets.join(",")} />
                </div>
              </div>
              
              <div className="mt-4 border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Bybit</h3>
                  <p className="text-xs text-muted-foreground">
                    Настройка ключей API и Merchant ID для Bybit Pay.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bybitApiKey">Bybit API Key</Label>
                    <PasswordInput
                      id="bybitApiKey"
                      name="bybitApiKey"
                      defaultValue={settings.bybitApiKey}
                      placeholder="Введите API Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bybitApiSecret">Bybit API Secret</Label>
                    <PasswordInput
                      id="bybitApiSecret"
                      name="bybitApiSecret"
                      defaultValue={settings.bybitApiSecret}
                      placeholder="Введите API Secret"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bybitTestnet"
                      name="bybitTestnet"
                      defaultChecked={settings.bybitTestnet}
                    />
                    <Label htmlFor="bybitTestnet">Использовать Bybit Testnet</Label>
                  </div>
                  <div className="space-y-1 w-full sm:w-1/2">
                    <Label htmlFor="bybitStoreUid">Bybit Merchant ID</Label>
                    <Input
                      id="bybitStoreUid"
                      name="bybitStoreUid"
                      type="text"
                      defaultValue={settings.bybitStoreUid}
                      placeholder="Например, 123456789"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Укажите Merchant ID от Bybit Pay (обычно совпадает с UID, проверьте в кабинете мерчанта).
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                <PasswordInput 
                  id="telegramBotToken" 
                  name="telegramBotToken" 
                  defaultValue={settings.telegramBotToken} 
                  placeholder="Токен бота" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramBotUsername">Bot Username (без @)</Label>
                <Input 
                  id="telegramBotUsername" 
                  name="telegramBotUsername" 
                  type="text" 
                  defaultValue={settings.telegramBotUsername}
                  placeholder="MyShopBot" 
                />
              </div>
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
            <Button type="submit" variant="secondary" disabled={isPending}>
               {isPending ? "Сохранение..." : "Обновить ключи"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
