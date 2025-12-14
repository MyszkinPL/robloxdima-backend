"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getSettings } from "@/lib/settings"
import { useEffect, useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

export default function FAQPage() {
  const [faqItems, setFaqItems] = useState<FAQItem[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const settings = await getSettings()
      let parsed: FAQItem[] = []
      try {
        if (settings.faq) {
          parsed = JSON.parse(settings.faq)
        }
      } catch {
      }

      if (!parsed.length) {
        parsed = [
          {
            question: "Как происходит покупка?",
            answer:
              "Покупка происходит через систему Gamepass (Create). Вы создаете геймпасс на указанную сумму, мы его покупаем. Робуксы приходят на ваш счет через 5-7 дней (время удержания Roblox).",
          },
          {
            question: "Как долго ждать поступления робуксов?",
            answer:
              'После того как статус вашего заказа изменится на "Выполнен", робуксы поступят на ваш аккаунт ровно через 5 дней (120 часов). Это стандартное время обработки транзакций в Roblox (Pending Robux).',
          },
          {
            question: "Безопасно ли это для моего аккаунта?",
            answer:
              "Да, абсолютно. Нам не нужны ваши пароли или доступ к аккаунту. Мы покупаем ваш геймпасс как обычные игроки.",
          },
          {
            question: "Какой курс покупки?",
            answer: `Текущий курс: 1 Robux = ${settings.rate.toFixed(2)} RUB.`,
          },
          {
            question: "Что делать, если робуксы не пришли?",
            answer:
              "Проверьте статус транзакции в вашем аккаунте Roblox во вкладке Transactions → Pending Robux. Если прошло более 7 дней, а робуксы не разморозились, напишите в нашу поддержку.",
          },
        ]
      }

      if (!cancelled) {
        setFaqItems(parsed)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Часто задаваемые вопросы</h2>
        <p className="text-muted-foreground">
          Ответы на самые популярные вопросы о покупке робуксов.
        </p>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
            <AccordionContent>
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
