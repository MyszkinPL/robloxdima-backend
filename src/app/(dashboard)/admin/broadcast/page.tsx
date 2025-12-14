"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Send, Bold, Italic, Quote, Code } from "lucide-react"
import { toast } from "sonner"
import { backendFetch } from "@/lib/api"

export default function BroadcastPage() {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const insertTag = (tag: string) => {
    setMessage((prev) => prev + tag)
  }

  const handleSend = async () => {
    if (!message.trim()) return
    if (!confirm("Вы уверены, что хотите отправить рассылку всем пользователям?")) return

    setSending(true)
    setResult(null)
    try {
      const res = await backendFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ message }),
      })
      
      if (!res.ok) {
        throw new Error("Ошибка отправки")
      }
      
      const data = await res.json()
      setResult(data)
      toast.success(`Рассылка завершена: ${data.sent} отправлено, ${data.failed} ошибок`)
    } catch (e) {
      toast.error("Произошла ошибка при рассылке")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Рассылка</CardTitle>
          <CardDescription>
            Отправка сообщений всем пользователям бота. Поддерживается HTML форматирование.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => insertTag("<b></b>")}>
              <Bold className="h-4 w-4 mr-1" /> Жирный
            </Button>
            <Button variant="outline" size="sm" onClick={() => insertTag("<i></i>")}>
              <Italic className="h-4 w-4 mr-1" /> Курсив
            </Button>
            <Button variant="outline" size="sm" onClick={() => insertTag("<blockquote></blockquote>")}>
              <Quote className="h-4 w-4 mr-1" /> Цитата
            </Button>
            <Button variant="outline" size="sm" onClick={() => insertTag("<code></code>")}>
              <Code className="h-4 w-4 mr-1" /> Код
            </Button>
          </div>
          
          <Textarea
            placeholder="Введите сообщение..."
            className="min-h-[200px] font-mono"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Отправить
                </>
              )}
            </Button>
          </div>

          {result && (
            <Alert>
              <AlertTitle>Результат рассылки</AlertTitle>
              <AlertDescription>
                Успешно отправлено: {result.sent}<br />
                Ошибок доставки: {result.failed}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
