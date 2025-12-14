import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { getCurrentUserRate } from "@/lib/pricing"

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
    isStarsEnabled: settings.isStarsEnabled,
    isPaypalychEnabled: settings.isPaypalychEnabled,
    referralPercent: settings.referralPercent,
    paypalychCommissionCard: settings.paypalychCommissionCard,
    paypalychCommissionSBP: settings.paypalychCommissionSBP,
    cryptoBotCommission: settings.cryptoBotCommission,
  })
}
