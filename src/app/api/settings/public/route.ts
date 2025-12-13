import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"

export async function GET() {
  const settings = await getSettings()

  return NextResponse.json({
    rate: settings.rate,
    maintenance: settings.maintenance,
    telegramBotUsername: settings.telegramBotUsername,
    supportLink: settings.supportLink,
    faq: settings.faq,
    bybitStoreUid: settings.bybitStoreUid || "",
  })
}
