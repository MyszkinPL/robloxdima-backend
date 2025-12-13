import { prisma } from '@/lib/prisma';

export interface Settings {
  rate: number;
  maintenance: boolean;
  rbxKey: string;
  cryptoBotToken: string;
  cryptoBotTestnet: boolean;
  cryptoBotAllowedAssets: string;
  cryptoBotFiatCurrency: string;
  bybitApiKey: string;
  bybitApiSecret: string;
  bybitTestnet: boolean;
  bybitStoreUid: string;
  telegramBotToken: string;
  telegramBotUsername: string;
  faq: string; // JSON string
  supportLink: string;
  referralPercent: number;
  pricingMode: string;
  markupType: string;
  markupValue: number;
}

const DEFAULT_SETTINGS: Settings = {
  rate: 0.5,
  maintenance: false,
  rbxKey: "",
  cryptoBotToken: "",
  cryptoBotTestnet: false,
  cryptoBotAllowedAssets: "",
  cryptoBotFiatCurrency: "RUB",
  bybitApiKey: "",
  bybitApiSecret: "",
  bybitTestnet: false,
  bybitStoreUid: "",
  telegramBotToken: "",
  telegramBotUsername: "",
  faq: "[]",
  supportLink: "",
  referralPercent: 5.0,
  pricingMode: "manual",
  markupType: "percent",
  markupValue: 0,
};

export async function getSettings(): Promise<Settings> {
  const settings = await prisma.settings.findUnique({
    where: { id: 1 }
  });

  if (!settings) {
    // Initialize default settings if they don't exist
    const newSettings = await prisma.settings.create({
      data: {
        id: 1,
        ...DEFAULT_SETTINGS,
        rbxKey: undefined, // Prisma handles optional/null
        cryptoBotToken: undefined,
        bybitApiKey: undefined,
        bybitApiSecret: undefined,
        telegramBotToken: undefined,
        telegramBotUsername: undefined,
      }
    });
    
    return {
      rate: newSettings.rate,
      maintenance: newSettings.maintenance,
      rbxKey: newSettings.rbxKey || "",
      cryptoBotToken: newSettings.cryptoBotToken || "",
      cryptoBotTestnet: newSettings.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets || "",
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency || "RUB",
      bybitApiKey: newSettings.bybitApiKey || "",
      bybitApiSecret: newSettings.bybitApiSecret || "",
      bybitTestnet: newSettings.bybitTestnet,
      bybitStoreUid: newSettings.bybitStoreUid || "",
      telegramBotToken: newSettings.telegramBotToken || "",
      telegramBotUsername: newSettings.telegramBotUsername || "",
      faq: newSettings.faq || "[]",
      supportLink: newSettings.supportLink || "",
      referralPercent: newSettings.referralPercent,
      pricingMode: newSettings.pricingMode,
      markupType: newSettings.markupType,
      markupValue: newSettings.markupValue,
    };
  }

  return {
    rate: settings.rate,
    maintenance: settings.maintenance,
    rbxKey: settings.rbxKey || "",
    cryptoBotToken: settings.cryptoBotToken || "",
    cryptoBotTestnet: settings.cryptoBotTestnet,
    cryptoBotAllowedAssets: settings.cryptoBotAllowedAssets || "",
    cryptoBotFiatCurrency: settings.cryptoBotFiatCurrency || "RUB",
    bybitApiKey: settings.bybitApiKey || "",
    bybitApiSecret: settings.bybitApiSecret || "",
    bybitTestnet: settings.bybitTestnet,
    bybitStoreUid: settings.bybitStoreUid || "",
    telegramBotToken: settings.telegramBotToken || "",
    telegramBotUsername: settings.telegramBotUsername || "",
    faq: settings.faq || "[]",
    supportLink: settings.supportLink || "",
    referralPercent: settings.referralPercent,
    pricingMode: settings.pricingMode,
    markupType: settings.markupType,
    markupValue: settings.markupValue,
  };
}

export async function updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
  const updated = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      rate: newSettings.rate,
      maintenance: newSettings.maintenance,
      rbxKey: newSettings.rbxKey || null,
      cryptoBotToken: newSettings.cryptoBotToken || null,
      cryptoBotTestnet: newSettings.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets || null,
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency || "RUB",
      bybitApiKey: newSettings.bybitApiKey || null,
      bybitApiSecret: newSettings.bybitApiSecret || null,
      bybitTestnet: newSettings.bybitTestnet,
      bybitStoreUid: newSettings.bybitStoreUid || null,
      telegramBotToken: newSettings.telegramBotToken || null,
      telegramBotUsername: newSettings.telegramBotUsername || null,
      faq: newSettings.faq,
      supportLink: newSettings.supportLink,
      referralPercent: newSettings.referralPercent,
      pricingMode: newSettings.pricingMode,
      markupType: newSettings.markupType,
      markupValue: newSettings.markupValue,
    },
    create: {
      id: 1,
      rate: newSettings.rate ?? DEFAULT_SETTINGS.rate,
      maintenance: newSettings.maintenance ?? DEFAULT_SETTINGS.maintenance,
      rbxKey: newSettings.rbxKey,
      cryptoBotToken: newSettings.cryptoBotToken,
      cryptoBotTestnet: newSettings.cryptoBotTestnet ?? DEFAULT_SETTINGS.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets,
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency ?? DEFAULT_SETTINGS.cryptoBotFiatCurrency,
      bybitApiKey: newSettings.bybitApiKey,
      bybitApiSecret: newSettings.bybitApiSecret,
      bybitTestnet: newSettings.bybitTestnet ?? DEFAULT_SETTINGS.bybitTestnet,
      bybitStoreUid: newSettings.bybitStoreUid,
      telegramBotToken: newSettings.telegramBotToken,
      telegramBotUsername: newSettings.telegramBotUsername,
      faq: newSettings.faq ?? DEFAULT_SETTINGS.faq,
      supportLink: newSettings.supportLink ?? DEFAULT_SETTINGS.supportLink,
      referralPercent: newSettings.referralPercent ?? DEFAULT_SETTINGS.referralPercent,
      pricingMode: newSettings.pricingMode ?? DEFAULT_SETTINGS.pricingMode,
      markupType: newSettings.markupType ?? DEFAULT_SETTINGS.markupType,
      markupValue: newSettings.markupValue ?? DEFAULT_SETTINGS.markupValue,
    }
  });

  return {
    rate: updated.rate,
    maintenance: updated.maintenance,
    rbxKey: updated.rbxKey || "",
    cryptoBotToken: updated.cryptoBotToken || "",
    cryptoBotTestnet: updated.cryptoBotTestnet,
    cryptoBotAllowedAssets: updated.cryptoBotAllowedAssets || "",
    cryptoBotFiatCurrency: updated.cryptoBotFiatCurrency || "RUB",
    bybitApiKey: updated.bybitApiKey || "",
    bybitApiSecret: updated.bybitApiSecret || "",
    bybitTestnet: updated.bybitTestnet,
    bybitStoreUid: updated.bybitStoreUid || "",
    telegramBotToken: updated.telegramBotToken || "",
    telegramBotUsername: updated.telegramBotUsername || "",
    faq: updated.faq || "[]",
    supportLink: updated.supportLink || "",
    referralPercent: updated.referralPercent,
    pricingMode: updated.pricingMode,
    markupType: updated.markupType,
    markupValue: updated.markupValue,
  };
}
