import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ExternalLink, MessageCircle, Send } from "lucide-react"
import Link from "next/link"
import { getSettings } from "@/lib/settings"

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const settings = await getSettings()
  
  const botLink = settings.telegramBotUsername 
    ? `https://t.me/${settings.telegramBotUsername}`
    : "#"
    
  const supportLink = settings.supportLink || "#"

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full">
      <div className="space-y-2 text-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Поддержка</h2>
        <p className="text-muted-foreground">
          Возникли проблемы? Мы всегда готовы помочь!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-6 text-blue-500" />
              Telegram Бот
            </CardTitle>
            <CardDescription>
              Наш автоматический бот для уведомлений и быстрой помощи.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Подпишитесь на бота, чтобы получать уведомления о статусе заказов прямо в Telegram.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild disabled={!settings.telegramBotUsername}>
              <Link href={botLink} target="_blank">
                <Send className="mr-2 size-4" />
                {settings.telegramBotUsername ? "Запустить бота" : "Бот не настроен"}
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="size-6 text-green-500" />
              Оператор поддержки
            </CardTitle>
            <CardDescription>
              Живое общение с администратором.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Если у вас возникла сложная проблема или вопрос, который не решает бот, напишите нам напрямую.
              <br />
              Время ответа: 10:00 - 22:00 (МСК)
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild disabled={!settings.supportLink}>
              <Link href={supportLink} target="_blank">
                <Send className="mr-2 size-4" />
                {settings.supportLink ? "Написать в поддержку" : "Контакт не настроен"}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-muted/50 rounded-xl text-center">
        <h3 className="font-semibold mb-2">User API (Coming Soon)</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Мы разрабатываем публичное API для интеграции нашего магазина в ваши проекты. 
          Следите за новостями в нашем Telegram канале.
        </p>
      </div>
    </div>
  )
}
