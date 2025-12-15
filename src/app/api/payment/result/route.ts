import { NextRequest, NextResponse } from "next/server"

export async function POST() {
  // Мы больше не обрабатываем платежи здесь.
  // Все начисления должны идти через /api/webhooks/...
  
  // Логируем для отладки, если кто-то шлет сюда данные
  console.log("POST /api/payment/result hit. Ignoring payment processing logic.")
  
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
    // Если пользователь перешел сюда после оплаты (Return URL)
    // Редиректим его на страницу успеха на фронтенде
    const url = req.nextUrl.clone()
    url.pathname = "/payment/success"
    return NextResponse.redirect(url)
}
