export interface PublicSettings {
  rate: number;
  maintenance: boolean;
  telegramBotUsername: string;
  faq: string;
  supportLink: string;
  bybitStoreUid: string;
  pricingMode: string;
  markupType: string;
  markupValue: number;
  referralPercent: number;
}

export interface AdminSettings extends PublicSettings {
  rbxKey: string;
  cryptoBotToken: string;
  cryptoBotTestnet: boolean;
  cryptoBotAllowedAssets: string;
  cryptoBotFiatCurrency: string;
  telegramBotToken: string;
  bybitApiKey: string;
  bybitApiSecret: string;
  bybitTestnet: boolean;
}

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  rate: 0.5,
  maintenance: false,
  telegramBotUsername: "",
  faq: "[]",
  supportLink: "",
  bybitStoreUid: "",
  pricingMode: "manual",
  markupType: "percent",
  markupValue: 0,
  referralPercent: 5,
}

import { getBackendBaseUrl } from "./api"

export async function getSettings(): Promise<PublicSettings> {
  const baseUrl = getBackendBaseUrl()

  const res = await fetch(`${baseUrl}/api/settings/public`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  if (!res.ok) {
    return DEFAULT_PUBLIC_SETTINGS
  }

  const fromApi = (await res.json()) as Partial<PublicSettings>

  return {
    rate: fromApi.rate ?? DEFAULT_PUBLIC_SETTINGS.rate,
    maintenance: fromApi.maintenance ?? DEFAULT_PUBLIC_SETTINGS.maintenance,
    telegramBotUsername: fromApi.telegramBotUsername ?? "",
    faq: fromApi.faq ?? "[]",
    supportLink: fromApi.supportLink ?? "",
    bybitStoreUid: fromApi.bybitStoreUid ?? DEFAULT_PUBLIC_SETTINGS.bybitStoreUid,
    pricingMode: fromApi.pricingMode ?? DEFAULT_PUBLIC_SETTINGS.pricingMode,
    markupType: fromApi.markupType ?? DEFAULT_PUBLIC_SETTINGS.markupType,
    markupValue: fromApi.markupValue ?? DEFAULT_PUBLIC_SETTINGS.markupValue,
    referralPercent: fromApi.referralPercent ?? DEFAULT_PUBLIC_SETTINGS.referralPercent,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const baseUrl = getBackendBaseUrl()

  const res = await fetch(`${baseUrl}/api/admin/settings`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load admin settings")
  }

  const json = (await res.json()) as { settings?: Partial<AdminSettings> }
  const fromApi = json.settings ?? {}

  return {
    rate: fromApi.rate ?? DEFAULT_PUBLIC_SETTINGS.rate,
    maintenance: fromApi.maintenance ?? DEFAULT_PUBLIC_SETTINGS.maintenance,
    telegramBotUsername: fromApi.telegramBotUsername ?? "",
    faq: fromApi.faq ?? DEFAULT_PUBLIC_SETTINGS.faq,
    supportLink: fromApi.supportLink ?? DEFAULT_PUBLIC_SETTINGS.supportLink,
    bybitStoreUid: fromApi.bybitStoreUid ?? DEFAULT_PUBLIC_SETTINGS.bybitStoreUid,
    rbxKey: fromApi.rbxKey ?? "",
    cryptoBotToken: fromApi.cryptoBotToken ?? "",
    cryptoBotTestnet: fromApi.cryptoBotTestnet ?? false,
    cryptoBotAllowedAssets: fromApi.cryptoBotAllowedAssets ?? "",
    cryptoBotFiatCurrency: fromApi.cryptoBotFiatCurrency ?? "RUB",
    telegramBotToken: fromApi.telegramBotToken ?? "",
    bybitApiKey: fromApi.bybitApiKey ?? "",
    bybitApiSecret: fromApi.bybitApiSecret ?? "",
    bybitTestnet: fromApi.bybitTestnet ?? false,
    pricingMode: fromApi.pricingMode ?? DEFAULT_PUBLIC_SETTINGS.pricingMode,
    markupType: fromApi.markupType ?? DEFAULT_PUBLIC_SETTINGS.markupType,
    markupValue: fromApi.markupValue ?? DEFAULT_PUBLIC_SETTINGS.markupValue,
    referralPercent: fromApi.referralPercent ?? DEFAULT_PUBLIC_SETTINGS.referralPercent,
  };
}

export async function updateSettings(newSettings: Partial<AdminSettings>): Promise<AdminSettings> {
  const baseUrl = getBackendBaseUrl()

  const res = await fetch(`${baseUrl}/api/admin/settings`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newSettings),
  })

  if (!res.ok) {
    throw new Error("Failed to update settings")
  }

  const json = (await res.json()) as { settings?: Partial<AdminSettings> }
  const updated = json.settings ?? {}

  return {
    rate: updated.rate ?? DEFAULT_PUBLIC_SETTINGS.rate,
    maintenance: updated.maintenance ?? DEFAULT_PUBLIC_SETTINGS.maintenance,
    telegramBotUsername: updated.telegramBotUsername ?? "",
    faq: updated.faq ?? DEFAULT_PUBLIC_SETTINGS.faq,
    supportLink: updated.supportLink ?? DEFAULT_PUBLIC_SETTINGS.supportLink,
    bybitStoreUid: updated.bybitStoreUid ?? DEFAULT_PUBLIC_SETTINGS.bybitStoreUid,
    rbxKey: updated.rbxKey ?? "",
    cryptoBotToken: updated.cryptoBotToken ?? "",
    cryptoBotTestnet: updated.cryptoBotTestnet ?? false,
    cryptoBotAllowedAssets: updated.cryptoBotAllowedAssets ?? "",
    cryptoBotFiatCurrency: updated.cryptoBotFiatCurrency ?? "RUB",
    telegramBotToken: updated.telegramBotToken ?? "",
    bybitApiKey: updated.bybitApiKey ?? "",
    bybitApiSecret: updated.bybitApiSecret ?? "",
    bybitTestnet: updated.bybitTestnet ?? false,
    pricingMode: updated.pricingMode ?? DEFAULT_PUBLIC_SETTINGS.pricingMode,
    markupType: updated.markupType ?? DEFAULT_PUBLIC_SETTINGS.markupType,
    markupValue: updated.markupValue ?? DEFAULT_PUBLIC_SETTINGS.markupValue,
    referralPercent: updated.referralPercent ?? DEFAULT_PUBLIC_SETTINGS.referralPercent,
  }
}
