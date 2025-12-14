import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"

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
    const { 
      rate, 
      maintenance, 
      isCryptoBotEnabled, 
      isBybitEnabled, 
      isStarsEnabled,
      referralPercent,
      pricingMode,
      markupType,
      markupValue,
      supportLink,
      faq
    } = body

    // Validate if needed

    const existing = await prisma.settings.findFirst()

    let updated
    if (existing) {
      updated = await prisma.settings.update({
        where: { id: existing.id },
        data: {
            rate: rate !== undefined ? rate : undefined,
            maintenance: maintenance !== undefined ? maintenance : undefined,
            isCryptoBotEnabled: isCryptoBotEnabled !== undefined ? isCryptoBotEnabled : undefined,
            isBybitEnabled: isBybitEnabled !== undefined ? isBybitEnabled : undefined,
            isStarsEnabled: isStarsEnabled !== undefined ? isStarsEnabled : undefined,
            referralPercent: referralPercent !== undefined ? referralPercent : undefined,
            pricingMode: pricingMode !== undefined ? pricingMode : undefined,
            markupType: markupType !== undefined ? markupType : undefined,
            markupValue: markupValue !== undefined ? markupValue : undefined,
            supportLink: supportLink !== undefined ? supportLink : undefined,
            faq: faq !== undefined ? faq : undefined,
        },
      })
    } else {
      updated = await prisma.settings.create({
        data: {
            rate: rate ?? 0.5,
            maintenance: maintenance ?? false,
            isCryptoBotEnabled: isCryptoBotEnabled ?? true,
            isBybitEnabled: isBybitEnabled ?? false,
            isStarsEnabled: isStarsEnabled ?? true,
            referralPercent: referralPercent ?? 5.0,
            pricingMode: pricingMode ?? "manual",
            markupType: markupType ?? "percent",
            markupValue: markupValue ?? 0,
            supportLink: supportLink,
            faq: faq
        },
      })
    }

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
