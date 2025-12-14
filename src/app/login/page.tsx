"use client"

import { useEffect, useState } from "react"
import { TelegramLogin } from "@/components/auth/telegram-login";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [botName, setBotName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const settings = await getSettings()
      if (!cancelled) {
        setBotName(settings.telegramBotUsername || null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход в магазин</CardTitle>
          <CardDescription>
            Войдите через Telegram, чтобы совершать покупки и пополнять баланс.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {botName ? (
            <TelegramLogin botName={botName} />
          ) : (
             <div className="text-center text-sm text-destructive">
               Бот не настроен. Обратитесь к администратору.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
