import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  isPaypalychEnabled: boolean;
  paypalychShopId: string;
  paypalychToken: string;
  paypalychCommissionCard: number;
  paypalychCommissionSBP: number;
  cryptoBotCommission: number;
  jwtSecret?: string;
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
  isPaypalychEnabled: false,
  paypalychShopId: "",
  paypalychToken: "",
  paypalychCommissionCard: 0,
  paypalychCommissionSBP: 0,
  cryptoBotCommission: 0,
  jwtSecret: undefined,
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
      rate: new Prisma.Decimal(newSettings.rate).toNumber(),
      buyRate: new Prisma.Decimal(newSettings.buyRate || 0.0).toNumber(),
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
      referralPercent: new Prisma.Decimal(newSettings.referralPercent).toNumber(),
      pricingMode: newSettings.pricingMode,
      markupType: newSettings.markupType,
      markupValue: new Prisma.Decimal(newSettings.markupValue).toNumber(),
      isCryptoBotEnabled: newSettings.isCryptoBotEnabled,
      isPaypalychEnabled: newSettings.isPaypalychEnabled,
      paypalychShopId: newSettings.paypalychShopId || "",
      paypalychToken: newSettings.paypalychToken || "",
      paypalychCommissionCard: new Prisma.Decimal(newSettings.paypalychCommissionCard).toNumber(),
      paypalychCommissionSBP: new Prisma.Decimal(newSettings.paypalychCommissionSBP).toNumber(),
      cryptoBotCommission: new Prisma.Decimal(newSettings.cryptoBotCommission).toNumber(),
      jwtSecret: newSettings.jwtSecret || undefined,
    };
  }

  return {
    rate: new Prisma.Decimal(settings.rate).toNumber(),
    buyRate: new Prisma.Decimal(settings.buyRate || 0.0).toNumber(),
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
    referralPercent: new Prisma.Decimal(settings.referralPercent).toNumber(),
    pricingMode: settings.pricingMode,
    markupType: settings.markupType,
    markupValue: new Prisma.Decimal(settings.markupValue).toNumber(),
    isCryptoBotEnabled: settings.isCryptoBotEnabled,
    isPaypalychEnabled: settings.isPaypalychEnabled,
    paypalychShopId: settings.paypalychShopId || "",
    paypalychToken: settings.paypalychToken || "",
    paypalychCommissionCard: new Prisma.Decimal(settings.paypalychCommissionCard).toNumber(),
    paypalychCommissionSBP: new Prisma.Decimal(settings.paypalychCommissionSBP).toNumber(),
    cryptoBotCommission: new Prisma.Decimal(settings.cryptoBotCommission).toNumber(),
    jwtSecret: settings.jwtSecret || undefined,
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
      isPaypalychEnabled: newSettings.isPaypalychEnabled ?? DEFAULT_SETTINGS.isPaypalychEnabled,
      paypalychShopId: newSettings.paypalychShopId,
      paypalychToken: newSettings.paypalychToken,
      paypalychCommissionCard: newSettings.paypalychCommissionCard ?? DEFAULT_SETTINGS.paypalychCommissionCard,
      paypalychCommissionSBP: newSettings.paypalychCommissionSBP ?? DEFAULT_SETTINGS.paypalychCommissionSBP,
      cryptoBotCommission: newSettings.cryptoBotCommission ?? DEFAULT_SETTINGS.cryptoBotCommission,
    }
  });

  return {
    rate: new Prisma.Decimal(updated.rate).toNumber(),
    buyRate: new Prisma.Decimal(updated.buyRate || 0.0).toNumber(),
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
    referralPercent: new Prisma.Decimal(updated.referralPercent).toNumber(),
    pricingMode: updated.pricingMode,
    markupType: updated.markupType,
    markupValue: new Prisma.Decimal(updated.markupValue).toNumber(),
    isCryptoBotEnabled: updated.isCryptoBotEnabled,
    isPaypalychEnabled: updated.isPaypalychEnabled,
    paypalychShopId: updated.paypalychShopId || "",
    paypalychToken: updated.paypalychToken || "",
    paypalychCommissionCard: new Prisma.Decimal(updated.paypalychCommissionCard).toNumber(),
    paypalychCommissionSBP: new Prisma.Decimal(updated.paypalychCommissionSBP).toNumber(),
    cryptoBotCommission: new Prisma.Decimal(updated.cryptoBotCommission).toNumber(),
    jwtSecret: updated.jwtSecret || undefined,
  };
}
