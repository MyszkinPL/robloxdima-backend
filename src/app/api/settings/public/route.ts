import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"

export async function GET() {
  const settings = await getSettings()
  const bybitStoreUid = process.env.BYBIT_STORE_UID || ""

  return NextResponse.json({
    rate: settings.rate,
    maintenance: settings.maintenance,
    telegramBotUsername: settings.telegramBotUsername,
    supportLink: settings.supportLink,
    faq: settings.faq,
    bybitStoreUid,
  })
}
