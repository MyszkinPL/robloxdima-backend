import { prisma } from '@/lib/prisma';

export interface Settings {
  rate: number;
  buyRate: number;
  maintenance: boolean;
  rbxKey: string;
  cryptoBotToken: string;
  cryptoBotTestnet: boolean;
  cryptoBotAllowedAssets: string;
  cryptoBotFiatCurrency: string;
  telegramBotToken: string;
  telegramBotUsername: string;
  faq: string; // JSON string
  supportLink: string;
  referralPercent: number;
  pricingMode: string;
  markupType: string;
  markupValue: number;
  isCryptoBotEnabled: boolean;
  isStarsEnabled: boolean;
  isPaypalychEnabled: boolean;
  paypalychShopId: string;
  paypalychToken: string;
  paypalychCommissionCard: number;
  paypalychCommissionSBP: number;
  cryptoBotCommission: number;
}

const DEFAULT_SETTINGS: Settings = {
  rate: 0.5,
  buyRate: 0.0,
  maintenance: false,
  rbxKey: "",
  cryptoBotToken: "",
  cryptoBotTestnet: false,
  cryptoBotAllowedAssets: "",
  cryptoBotFiatCurrency: "RUB",
  telegramBotToken: "",
  telegramBotUsername: "",
  faq: "[]",
  supportLink: "",
  referralPercent: 5.0,
  pricingMode: "manual",
  markupType: "percent",
  markupValue: 0,
  isCryptoBotEnabled: true,
  isStarsEnabled: true,
  isPaypalychEnabled: false,
  paypalychShopId: "",
  paypalychToken: "",
  paypalychCommissionCard: 0,
  paypalychCommissionSBP: 0,
  cryptoBotCommission: 0,
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
        telegramBotToken: undefined,
        telegramBotUsername: undefined,
        paypalychShopId: undefined,
        paypalychToken: undefined,
      }
    });
    
    return {
      rate: newSettings.rate,
      buyRate: newSettings.buyRate || 0.0,
      maintenance: newSettings.maintenance,
      rbxKey: newSettings.rbxKey || "",
      cryptoBotToken: newSettings.cryptoBotToken || "",
      cryptoBotTestnet: newSettings.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets || "",
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency || "RUB",
      telegramBotToken: newSettings.telegramBotToken || "",
      telegramBotUsername: newSettings.telegramBotUsername || "",
      faq: newSettings.faq || "[]",
      supportLink: newSettings.supportLink || "",
      referralPercent: newSettings.referralPercent,
      pricingMode: newSettings.pricingMode,
      markupType: newSettings.markupType,
      markupValue: newSettings.markupValue,
      isCryptoBotEnabled: newSettings.isCryptoBotEnabled,
      isStarsEnabled: newSettings.isStarsEnabled,
      isPaypalychEnabled: newSettings.isPaypalychEnabled,
      paypalychShopId: newSettings.paypalychShopId || "",
      paypalychToken: newSettings.paypalychToken || "",
      paypalychCommissionCard: newSettings.paypalychCommissionCard,
      paypalychCommissionSBP: newSettings.paypalychCommissionSBP,
      cryptoBotCommission: newSettings.cryptoBotCommission,
    };
  }

  return {
    rate: settings.rate,
    buyRate: settings.buyRate || 0.0,
    maintenance: settings.maintenance,
    rbxKey: settings.rbxKey || "",
    cryptoBotToken: settings.cryptoBotToken || "",
    cryptoBotTestnet: settings.cryptoBotTestnet,
    cryptoBotAllowedAssets: settings.cryptoBotAllowedAssets || "",
    cryptoBotFiatCurrency: settings.cryptoBotFiatCurrency || "RUB",
    telegramBotToken: settings.telegramBotToken || "",
    telegramBotUsername: settings.telegramBotUsername || "",
    faq: settings.faq || "[]",
    supportLink: settings.supportLink || "",
    referralPercent: settings.referralPercent,
    pricingMode: settings.pricingMode,
    markupType: settings.markupType,
    markupValue: settings.markupValue,
    isCryptoBotEnabled: settings.isCryptoBotEnabled,
    isStarsEnabled: settings.isStarsEnabled,
    isPaypalychEnabled: settings.isPaypalychEnabled,
    paypalychShopId: settings.paypalychShopId || "",
    paypalychToken: settings.paypalychToken || "",
    paypalychCommissionCard: settings.paypalychCommissionCard,
    paypalychCommissionSBP: settings.paypalychCommissionSBP,
    cryptoBotCommission: settings.cryptoBotCommission,
  };
}

export async function updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
  const updated = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      rate: newSettings.rate,
      buyRate: newSettings.buyRate,
      maintenance: newSettings.maintenance,
      rbxKey: newSettings.rbxKey || null,
      cryptoBotToken: newSettings.cryptoBotToken || null,
      cryptoBotTestnet: newSettings.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets || null,
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency || "RUB",
      telegramBotToken: newSettings.telegramBotToken || null,
      telegramBotUsername: newSettings.telegramBotUsername || null,
      faq: newSettings.faq,
      supportLink: newSettings.supportLink,
      referralPercent: newSettings.referralPercent,
      pricingMode: newSettings.pricingMode,
      markupType: newSettings.markupType,
      markupValue: newSettings.markupValue,
      isCryptoBotEnabled: newSettings.isCryptoBotEnabled,
      isStarsEnabled: newSettings.isStarsEnabled,
      isPaypalychEnabled: newSettings.isPaypalychEnabled,
      paypalychShopId: newSettings.paypalychShopId || null,
      paypalychToken: newSettings.paypalychToken || null,
      paypalychCommissionCard: newSettings.paypalychCommissionCard,
      paypalychCommissionSBP: newSettings.paypalychCommissionSBP,
      cryptoBotCommission: newSettings.cryptoBotCommission,
    },
    create: {
      id: 1,
      rate: newSettings.rate ?? DEFAULT_SETTINGS.rate,
      buyRate: newSettings.buyRate ?? DEFAULT_SETTINGS.buyRate,
      maintenance: newSettings.maintenance ?? DEFAULT_SETTINGS.maintenance,
      rbxKey: newSettings.rbxKey,
      cryptoBotToken: newSettings.cryptoBotToken,
      cryptoBotTestnet: newSettings.cryptoBotTestnet ?? DEFAULT_SETTINGS.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets,
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency ?? DEFAULT_SETTINGS.cryptoBotFiatCurrency,
      telegramBotToken: newSettings.telegramBotToken,
      telegramBotUsername: newSettings.telegramBotUsername,
      faq: newSettings.faq ?? DEFAULT_SETTINGS.faq,
      supportLink: newSettings.supportLink ?? DEFAULT_SETTINGS.supportLink,
      referralPercent: newSettings.referralPercent ?? DEFAULT_SETTINGS.referralPercent,
      pricingMode: newSettings.pricingMode ?? DEFAULT_SETTINGS.pricingMode,
      markupType: newSettings.markupType ?? DEFAULT_SETTINGS.markupType,
      markupValue: newSettings.markupValue ?? DEFAULT_SETTINGS.markupValue,
      isCryptoBotEnabled: newSettings.isCryptoBotEnabled ?? DEFAULT_SETTINGS.isCryptoBotEnabled,
      isStarsEnabled: newSettings.isStarsEnabled ?? DEFAULT_SETTINGS.isStarsEnabled,
      isPaypalychEnabled: newSettings.isPaypalychEnabled ?? DEFAULT_SETTINGS.isPaypalychEnabled,
      paypalychShopId: newSettings.paypalychShopId,
      paypalychToken: newSettings.paypalychToken,
      paypalychCommissionCard: newSettings.paypalychCommissionCard ?? DEFAULT_SETTINGS.paypalychCommissionCard,
      paypalychCommissionSBP: newSettings.paypalychCommissionSBP ?? DEFAULT_SETTINGS.paypalychCommissionSBP,
      cryptoBotCommission: newSettings.cryptoBotCommission ?? DEFAULT_SETTINGS.cryptoBotCommission,
    }
  });

  return {
    rate: updated.rate,
    buyRate: updated.buyRate || 0.0,
    maintenance: updated.maintenance,
    rbxKey: updated.rbxKey || "",
    cryptoBotToken: updated.cryptoBotToken || "",
    cryptoBotTestnet: updated.cryptoBotTestnet,
    cryptoBotAllowedAssets: updated.cryptoBotAllowedAssets || "",
    cryptoBotFiatCurrency: updated.cryptoBotFiatCurrency || "RUB",
    telegramBotToken: updated.telegramBotToken || "",
    telegramBotUsername: updated.telegramBotUsername || "",
    faq: updated.faq || "[]",
    supportLink: updated.supportLink || "",
    referralPercent: updated.referralPercent,
    pricingMode: updated.pricingMode,
    markupType: updated.markupType,
    markupValue: updated.markupValue,
    isCryptoBotEnabled: updated.isCryptoBotEnabled,
    isStarsEnabled: updated.isStarsEnabled,
    isPaypalychEnabled: updated.isPaypalychEnabled,
    paypalychShopId: updated.paypalychShopId || "",
    paypalychToken: updated.paypalychToken || "",
    paypalychCommissionCard: updated.paypalychCommissionCard,
    paypalychCommissionSBP: updated.paypalychCommissionSBP,
    cryptoBotCommission: updated.cryptoBotCommission,
  };
}
