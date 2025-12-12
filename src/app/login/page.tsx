import { TelegramLogin } from "@/components/auth/telegram-login";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const settings = await getSettings();

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
          {settings.telegramBotUsername ? (
            <TelegramLogin botName={settings.telegramBotUsername} />
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
