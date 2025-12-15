import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { getCurrentUserRate } from "@/lib/pricing"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const settings = await getSettings()
  const rate = await getCurrentUserRate()

  return NextResponse.json({
    rate: rate,
    maintenance: settings.maintenance,
    telegramBotUsername: settings.telegramBotUsername,
    supportLink: settings.supportLink,
    faq: settings.faq,
    isCryptoBotEnabled: settings.isCryptoBotEnabled,
    isPaypalychEnabled: settings.isPaypalychEnabled,
    referralPercent: settings.referralPercent,
    paypalychCommissionCard: settings.paypalychCommissionCard,
    paypalychCommissionSBP: settings.paypalychCommissionSBP,
    cryptoBotCommission: settings.cryptoBotCommission,
  })
}
