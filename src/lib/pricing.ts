import { getSettings } from "./settings" ; 
import { getUsdtToRubRate } from "./crypto-bot" ; 
import { RbxCrateClient } from "./rbxcrate/client" ; 

let cachedRate: { value: number; timestamp: number } | null = null ; 
const CACHE_TTL = 60 * 1000; // 1 minute 

// Функция для принудительного сброса кэша (вызывать при сохранении настроек) 
export function resetPricingCache() { 
  console.log("[Pricing] Cache invalidated manually." ); 
  cachedRate = null ; 
} 

export async function getCurrentUserRate(): Promise<number> { 
  const settings = await  getSettings(); 

  // Если режим ручной - возвращаем сразу, игнорируя кэш "авто" расчетов 
  if (settings.pricingMode === "manual" ) { 
    // console.log(`[Pricing] Manual mode active. Rate: ${settings.rate}`); 
    return  settings.rate; 
  } 

  // Auto mode cache check 
  if (cachedRate && Date .now() - cachedRate.timestamp < CACHE_TTL) { 
    return  cachedRate.value; 
  } 

  console.log("[Pricing] Calculating new auto rate..." ); 

  try  { 
    if  (!settings.rbxKey) { 
        console.warn("[Pricing] Auto pricing enabled but RBXCRATE API Key missing. Using manual rate." ); 
        return  settings.rate; 
    } 

    const client = new  RbxCrateClient(settings.rbxKey); 
    const stock = await  client.stock.getDetailed(); 
    
    // Берем самый дешевый пак или первый попавшийся 
    const bestPackage = stock.find(s => s.totalRobuxAmount > 0) || stock[0 ]; 
    
    if  (!bestPackage) { 
        console.warn("[Pricing] No stock data found. Using manual rate." ); 
        return  settings.rate; 
    } 

    const  rbxRateUsd = bestPackage.rate; 
    const usdToRub = await  getUsdtToRubRate(); 
    
    // RBXCrate обычно отдает курс за 1000 R$, если он > 1. 
    // Например rate = 5.5 ($), значит за 1 R$ = 0.0055 $ 
    let  costPerOneRobuxUsd = rbxRateUsd; 
    if (rbxRateUsd > 1 ) { 
        costPerOneRobuxUsd = rbxRateUsd / 1000 ; 
    } 
    
    const  baseRub = costPerOneRobuxUsd * usdToRub; 

    console.log(`[Pricing] Base: ${baseRub.toFixed(4)} RUB (Stock: $${costPerOneRobuxUsd} * USD: ${usdToRub})` ); 

    // Применяем наценку 
    let  finalRate = baseRub; 
    if (settings.markupType === "percent" ) { 
        finalRate = baseRub * (1 + settings.markupValue / 100 ); 
        console.log(`[Pricing] Applied +${settings.markupValue}% markup.` ); 
    } else  { 
        finalRate = baseRub + settings.markupValue; 
        console.log(`[Pricing] Applied +${settings.markupValue} RUB markup.` ); 
    } 

    // Округляем до 2 знаков в большую сторону 
    finalRate = Math.ceil(finalRate * 100) / 100 ; 
    
    if (finalRate <= 0) finalRate = 0.01 ; 

    console.log(`[Pricing] Final Calculated Rate: ${finalRate}` ); 

    cachedRate = { value: finalRate, timestamp: Date .now() }; 
    return  finalRate; 

  } catch  (error) { 
    console.error("[Pricing] Auto pricing error:" , error); 
    return settings.rate; // Fallback to manual 
  } 
}
