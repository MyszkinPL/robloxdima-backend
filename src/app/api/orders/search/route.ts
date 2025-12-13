import { NextRequest, NextResponse } from "next/server"
import { searchOrders } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: "Введите минимум 3 символа" },
        { status: 400 },
      )
    }

    const orders = await searchOrders(query)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("GET /api/orders/search error:", error)
    return NextResponse.json(
      { error: "Ошибка поиска" },
      { status: 500 },
    )
  }
}

