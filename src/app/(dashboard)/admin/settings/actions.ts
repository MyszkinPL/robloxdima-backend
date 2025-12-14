import { updateSettings } from "@/lib/settings"
import { backendFetch } from "@/lib/api"

export async function saveSettings(formData: FormData) {
  const rawRate = parseFloat(formData.get("rate") as string)
  const rate = isNaN(rawRate) ? undefined : rawRate

  const maintenance = formData.get("maintenance") === "on"
  const rbxKey = formData.get("rbxKey") as string
  
  const cryptoBotToken = formData.get("cryptoBotToken") as string
  const cryptoBotTestnet = formData.get("cryptoBotTestnet") === "on"
  const cryptoBotAllowedAssets = formData.get("cryptoBotAllowedAssets") as string
  const cryptoBotFiatCurrency = formData.get("cryptoBotFiatCurrency") as string
  
  const bybitApiKey = formData.get("bybitApiKey") as string
  const bybitApiSecret = formData.get("bybitApiSecret") as string
  const bybitTestnet = formData.get("bybitTestnet") === "on"
  const bybitStoreUid = formData.get("bybitStoreUid") as string
  
  const telegramBotToken = formData.get("telegramBotToken") as string
  const telegramBotUsername = formData.get("telegramBotUsername") as string
  
  const faq = formData.get("faq") as string
  const supportLink = formData.get("supportLink") as string

  const pricingMode = (formData.get("pricingMode") as string) || "manual"
  const markupType = (formData.get("markupType") as string) || "percent"
  const markupValue = parseFloat((formData.get("markupValue") as string) || "0")
  const referralPercent = parseFloat((formData.get("referralPercent") as string) || "5")

  if (pricingMode === "manual" && (rate === undefined || rate <= 0)) {
    return { error: "Некорректный курс валют" }
  }

  // Validate FAQ JSON
  if (faq) {
    try {
      JSON.parse(faq)
    } catch {
      return { error: "Некорректный JSON формат для FAQ" }
    }
  }

  await updateSettings({
    rate,
    maintenance,
    rbxKey: rbxKey || undefined,
    cryptoBotToken: cryptoBotToken || undefined,
    cryptoBotTestnet,
    cryptoBotAllowedAssets: cryptoBotAllowedAssets || undefined,
    cryptoBotFiatCurrency: cryptoBotFiatCurrency || "RUB",
    bybitApiKey: bybitApiKey || undefined,
    bybitApiSecret: bybitApiSecret || undefined,
    bybitTestnet,
    bybitStoreUid: bybitStoreUid || undefined,
    telegramBotToken: telegramBotToken || undefined,
    telegramBotUsername: telegramBotUsername || undefined,
    faq,
    supportLink,
    pricingMode,
    markupType,
    markupValue,
    referralPercent,
  })
  return { success: true }
}

export async function checkCryptoBotConnection() {
  try {
    const res = await backendFetch("/api/admin/crypto-bot/check", {
      method: "GET",
    })

    if (!res.ok) {
      return { success: false, error: "Failed to check CryptoBot connection" }
    }

    const json = (await res.json()) as {
      success?: boolean
      me?: unknown
      currencies?: unknown
      error?: string
    }

    if (!json.success) {
      return {
        success: false,
        error: json.error || "Failed to check CryptoBot connection",
      }
    }

    return {
      success: true,
      me: json.me,
      currencies: json.currencies,
    }
  } catch (error: unknown) {
    console.error("CryptoBot connection error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
