"use server"

import { updateSettings } from "@/lib/settings"
import { revalidatePath } from "next/cache"
import { getMe, getCurrencies } from "@/lib/crypto-bot"

export async function saveSettings(formData: FormData) {
  const rate = parseFloat(formData.get("rate") as string)
  const maintenance = formData.get("maintenance") === "on"
  const rbxKey = formData.get("rbxKey") as string
  
  const cryptoBotToken = formData.get("cryptoBotToken") as string
  const cryptoBotTestnet = formData.get("cryptoBotTestnet") === "on"
  const cryptoBotAllowedAssets = formData.get("cryptoBotAllowedAssets") as string
  const cryptoBotFiatCurrency = formData.get("cryptoBotFiatCurrency") as string
  
  const telegramBotToken = formData.get("telegramBotToken") as string
  const telegramBotUsername = formData.get("telegramBotUsername") as string
  
  const faq = formData.get("faq") as string
  const supportLink = formData.get("supportLink") as string

  if (isNaN(rate) || rate <= 0) {
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
    telegramBotToken: telegramBotToken || undefined,
    telegramBotUsername: telegramBotUsername || undefined,
    faq,
    supportLink,
  })

  revalidatePath("/admin/settings")
  return { success: true }
}

export async function checkCryptoBotConnection() {
  try {
    const me = await getMe();
    const currencies = await getCurrencies();
    return { success: true, me, currencies };
  } catch (error: unknown) {
    console.error("CryptoBot connection error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
