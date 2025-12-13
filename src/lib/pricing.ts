import { getSettings } from "./settings";
import { getUsdtToRubRate } from "./crypto-bot";
import { RbxCrateClient } from "./rbxcrate/client";

let cachedRate: { value: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getCurrentUserRate(): Promise<number> {
  const settings = await getSettings();

  if (settings.pricingMode === "manual") {
    return settings.rate;
  }

  // Auto mode
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
    return cachedRate.value;
  }

  try {
    if (!settings.rbxKey) {
        console.warn("Auto pricing enabled but RBXCRATE API Key missing. Using manual rate.");
        return settings.rate;
    }

    const client = new RbxCrateClient(settings.rbxKey);
    const stock = await client.stock.getDetailed();
    
    // Find the cheapest available package or just the first one
    const bestPackage = stock.find(s => s.totalRobuxAmount > 0) || stock[0];
    
    if (!bestPackage) {
        console.warn("No stock data found for auto pricing. Using manual rate.");
        return settings.rate;
    }

    const rbxRateUsd = bestPackage.rate; 
    const usdToRub = await getUsdtToRubRate();
    
    // Determine if rate is per 1 R$ or per 1000 R$
    // Usually > 1 means per 1000 R$ (e.g. $5.00)
    let costPerOneRobuxUsd = rbxRateUsd;
    if (rbxRateUsd > 1) {
        costPerOneRobuxUsd = rbxRateUsd / 1000;
    }
    
    const baseRub = costPerOneRobuxUsd * usdToRub;

    // Apply Markup
    let finalRate = baseRub;
    if (settings.markupType === "percent") {
        finalRate = baseRub * (1 + settings.markupValue / 100);
    } else {
        finalRate = baseRub + settings.markupValue;
    }

    // Round up to 2 decimals to ensure we don't lose money
    finalRate = Math.ceil(finalRate * 100) / 100;
    
    // Safety check: rate shouldn't be effectively zero or negative
    if (finalRate <= 0) finalRate = 0.01;

    cachedRate = { value: finalRate, timestamp: Date.now() };
    return finalRate;

  } catch (error) {
    console.error("Auto pricing error:", error);
    return settings.rate; // Fallback
  }
}
