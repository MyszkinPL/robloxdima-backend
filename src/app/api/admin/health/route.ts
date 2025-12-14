import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { getSettings } from "@/lib/settings"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart

    const settings = await getSettings()

    const warnings: string[] = []

    if (settings.isCryptoBotEnabled && !settings.cryptoBotToken) {
      warnings.push("CryptoBot включен, но токен не задан")
    }

    if (settings.isPaypalychEnabled) {
      if (!settings.paypalychShopId || !settings.paypalychToken) {
        warnings.push("Paypalych включен, но Shop ID или Token не заданы")
      }
    }

    if (settings.pricingMode === "auto" && settings.buyRate <= 0) {
      warnings.push("Режим автоценообразования, но резервная себестоимость не задана")
    }

    return NextResponse.json({
      ok: true,
      db: {
        ok: true,
        latencyMs: dbLatency,
      },
      settings: {
        pricingMode: settings.pricingMode,
        isCryptoBotEnabled: settings.isCryptoBotEnabled,
        isPaypalychEnabled: settings.isPaypalychEnabled,
      },
      warnings,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}

