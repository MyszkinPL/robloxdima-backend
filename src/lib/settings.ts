import { prisma } from '@/lib/prisma';

export interface Settings {
  rate: number;
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
}

const DEFAULT_SETTINGS: Settings = {
  rate: 0.5,
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
        telegramBotToken: newSettings.telegramBotToken || "",
        telegramBotUsername: newSettings.telegramBotUsername || "",
        faq: newSettings.faq || "[]",
        supportLink: newSettings.supportLink || "",
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
      telegramBotToken: settings.telegramBotToken || "",
      telegramBotUsername: settings.telegramBotUsername || "",
      faq: settings.faq || "[]",
      supportLink: settings.supportLink || "",
    };
  }

export async function updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
  const updated = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      rate: newSettings.rate,
      maintenance: newSettings.maintenance,
      rbxKey: newSettings.rbxKey,
      cryptoBotToken: newSettings.cryptoBotToken,
      cryptoBotTestnet: newSettings.cryptoBotTestnet,
      cryptoBotAllowedAssets: newSettings.cryptoBotAllowedAssets,
      cryptoBotFiatCurrency: newSettings.cryptoBotFiatCurrency,
      telegramBotToken: newSettings.telegramBotToken,
      telegramBotUsername: newSettings.telegramBotUsername,
      faq: newSettings.faq,
      supportLink: newSettings.supportLink,
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
      telegramBotToken: newSettings.telegramBotToken,
      telegramBotUsername: newSettings.telegramBotUsername,
      faq: newSettings.faq,
      supportLink: newSettings.supportLink,
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
    telegramBotToken: updated.telegramBotToken || "",
    telegramBotUsername: updated.telegramBotUsername || "",
    faq: updated.faq || "[]",
    supportLink: updated.supportLink || "",
  };
}
