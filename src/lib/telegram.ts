import { getSettings } from "@/lib/settings"

export async function sendTelegramNotification(
  userId: string,
  text: string,
) {
  const settings = await getSettings()
  const token = settings.telegramBotToken

  if (!token) {
    // console.warn("Telegram token not configured, skipping notification")
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error(`Telegram API Error: ${response.status} ${response.statusText}`, errorText)
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error)
  }
}
