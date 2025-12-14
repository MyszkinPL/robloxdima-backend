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
    return NextResponse.json({ settings: settings || {} })
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

    let updated
    if (existing) {
      updated = await prisma.settings.update({
        where: { id: existing.id },
        data: {
            rate: rate !== undefined ? rate : undefined,
            buyRate: buyRate !== undefined ? buyRate : undefined,
            maintenance: maintenance !== undefined ? maintenance : undefined,
            rbxKey: rbxKey !== undefined ? rbxKey : undefined,
            cryptoBotToken: cryptoBotToken !== undefined ? cryptoBotToken : undefined,
            cryptoBotTestnet: cryptoBotTestnet !== undefined ? cryptoBotTestnet : undefined,
            cryptoBotAllowedAssets: cryptoBotAllowedAssets !== undefined ? cryptoBotAllowedAssets : undefined,
            cryptoBotFiatCurrency: cryptoBotFiatCurrency !== undefined ? cryptoBotFiatCurrency : undefined,
            telegramBotToken: telegramBotToken !== undefined ? telegramBotToken : undefined,
            telegramBotUsername: telegramBotUsername !== undefined ? telegramBotUsername : undefined,
            isCryptoBotEnabled: isCryptoBotEnabled !== undefined ? isCryptoBotEnabled : undefined,
            isPaypalychEnabled: isPaypalychEnabled !== undefined ? isPaypalychEnabled : undefined,
            paypalychShopId: paypalychShopId !== undefined ? paypalychShopId : undefined,
            paypalychToken: paypalychToken !== undefined ? paypalychToken : undefined,
            referralPercent: referralPercent !== undefined ? referralPercent : undefined,
            pricingMode: pricingMode !== undefined ? pricingMode : undefined,
            markupType: markupType !== undefined ? markupType : undefined,
            markupValue: markupValue !== undefined ? markupValue : undefined,
            supportLink: supportLink !== undefined ? supportLink : undefined,
            faq: faq !== undefined ? faq : undefined,
        },
      })
      console.log("Settings updated successfully:", updated)
      return NextResponse.json({ settings: updated })
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
