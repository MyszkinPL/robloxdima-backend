import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await prisma.settings.findFirst()
    
    // Issue 5b Fix: Mask API keys in admin settings
    if (settings) {
        return NextResponse.json({
            settings: {
                ...settings,
                // Mask keys if they exist
                rbxKey: settings.rbxKey ? (settings.rbxKey.substring(0, 4) + '***') : "",
                cryptoBotToken: settings.cryptoBotToken ? (settings.cryptoBotToken.substring(0, 4) + '***') : "",
                telegramBotToken: settings.telegramBotToken ? (settings.telegramBotToken.substring(0, 4) + '***') : "",
                paypalychToken: settings.paypalychToken ? (settings.paypalychToken.substring(0, 4) + '***') : "",
                
                // Add flags to tell frontend that keys are set
                isRbxKeySet: !!settings.rbxKey,
                isCryptoBotTokenSet: !!settings.cryptoBotToken,
                isTelegramBotTokenSet: !!settings.telegramBotToken,
                isPaypalychTokenSet: !!settings.paypalychToken
            }
        })
    }
    
    return NextResponse.json({ settings: {} })
  } catch (error) {
    console.error("GET /api/admin/settings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    console.log("PATCH /api/admin/settings body:", body)
    console.log("Extracted payment flags:", {
        isCryptoBotEnabled: body.isCryptoBotEnabled,
        isPaypalychEnabled: body.isPaypalychEnabled
    })
    const { 
      rate,  
      buyRate,
      maintenance, 
      rbxKey,
      cryptoBotToken,
      cryptoBotTestnet,
      cryptoBotAllowedAssets,
      cryptoBotFiatCurrency,
      telegramBotToken,
      telegramBotUsername,
      isCryptoBotEnabled, 
      isPaypalychEnabled,
      paypalychShopId,
      paypalychToken,
      paypalychCommissionCard,
      paypalychCommissionSBP,
      cryptoBotCommission,
      referralPercent,
      pricingMode,
      markupType,
      markupValue,
      supportLink,
      faq
    } = body

    // Validate if needed
    
    // Use findFirst to handle cases where ID might not be 1 or to ensure we get the single settings row
    const existing = await prisma.settings.findFirst()

    // Filter out masked keys or empty strings if they shouldn't overwrite existing keys
    // If frontend sends "***", it means "don't change"
    // If frontend sends empty string and it was masked, treat as "don't change" (or explicit delete? Usually delete requires explicit action)
    // For now: only update if value is NOT containing "***" and is not undefined.
    // Actually, safer logic: Only update if value is provided and does not look like a mask.
    
    const shouldUpdate = (val: any) => val !== undefined && val !== null && !String(val).includes("***");

    let updated
    if (existing) {
      updated = await prisma.settings.update({
        where: { id: existing.id },
        data: {
            rate: rate !== undefined ? rate : undefined,
            buyRate: buyRate !== undefined ? buyRate : undefined,
            maintenance: maintenance !== undefined ? maintenance : undefined,
            rbxKey: shouldUpdate(rbxKey) ? rbxKey : undefined,
            cryptoBotToken: shouldUpdate(cryptoBotToken) ? cryptoBotToken : undefined,
            cryptoBotTestnet: cryptoBotTestnet !== undefined ? cryptoBotTestnet : undefined,
            cryptoBotAllowedAssets: cryptoBotAllowedAssets !== undefined ? cryptoBotAllowedAssets : undefined,
            cryptoBotFiatCurrency: cryptoBotFiatCurrency !== undefined ? cryptoBotFiatCurrency : undefined,
            telegramBotToken: shouldUpdate(telegramBotToken) ? telegramBotToken : undefined,
            telegramBotUsername: telegramBotUsername !== undefined ? telegramBotUsername : undefined,
            isCryptoBotEnabled: isCryptoBotEnabled !== undefined ? isCryptoBotEnabled : undefined,
            isPaypalychEnabled: isPaypalychEnabled !== undefined ? isPaypalychEnabled : undefined,
            paypalychShopId: paypalychShopId !== undefined ? paypalychShopId : undefined,
            paypalychToken: shouldUpdate(paypalychToken) ? paypalychToken : undefined,
            paypalychCommissionCard: paypalychCommissionCard !== undefined ? paypalychCommissionCard : undefined,
            paypalychCommissionSBP: paypalychCommissionSBP !== undefined ? paypalychCommissionSBP : undefined,
            cryptoBotCommission: cryptoBotCommission !== undefined ? cryptoBotCommission : undefined,
            referralPercent: referralPercent !== undefined ? referralPercent : undefined,
            pricingMode: pricingMode !== undefined ? pricingMode : undefined,
            markupType: markupType !== undefined ? markupType : undefined,
            markupValue: markupValue !== undefined ? markupValue : undefined,
            supportLink: supportLink !== undefined ? supportLink : undefined,
            faq: faq !== undefined ? faq : undefined,
        },
      })
      console.log("Settings updated successfully:", updated)
      // Return masked again
      return NextResponse.json({ 
          settings: {
             ...updated,
             rbxKey: updated.rbxKey ? (updated.rbxKey.substring(0, 4) + '***') : "",
             cryptoBotToken: updated.cryptoBotToken ? (updated.cryptoBotToken.substring(0, 4) + '***') : "",
             telegramBotToken: updated.telegramBotToken ? (updated.telegramBotToken.substring(0, 4) + '***') : "",
             paypalychToken: updated.paypalychToken ? (updated.paypalychToken.substring(0, 4) + '***') : "",
          } 
      })
    } else {
      updated = await prisma.settings.create({
        data: {
            rate: rate ?? 0.5,
            buyRate: buyRate ?? 0.0,
            maintenance: maintenance ?? false,
            rbxKey: rbxKey,
            cryptoBotToken: cryptoBotToken,
            cryptoBotTestnet: cryptoBotTestnet ?? false,
            cryptoBotAllowedAssets: cryptoBotAllowedAssets,
            cryptoBotFiatCurrency: cryptoBotFiatCurrency ?? "RUB",
            telegramBotToken: telegramBotToken,
            telegramBotUsername: telegramBotUsername,
            isCryptoBotEnabled: isCryptoBotEnabled ?? true,
            isPaypalychEnabled: isPaypalychEnabled ?? false,
            paypalychShopId: paypalychShopId,
            paypalychToken: paypalychToken,
            referralPercent: referralPercent ?? 5,
            pricingMode: pricingMode ?? "manual",
            markupType: markupType ?? "percent",
            markupValue: markupValue ?? 0,
            supportLink: supportLink,
            faq: faq,
        },
      })
      console.log("Settings created successfully:", updated)
      return NextResponse.json({ settings: updated })
    }
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
