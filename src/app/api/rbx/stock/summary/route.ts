import { NextResponse } from "next/server"
import { getAuthenticatedRbxClient } from "@/lib/api-client"

export async function GET() {
  try {
    const client = await getAuthenticatedRbxClient()
    const stock = await client.stock.getSummary()

    type StockShape = {
      robuxAvailable?: number
      [key: string]: unknown
    }

    const anyStock = stock as unknown as StockShape

    return NextResponse.json({
      success: true,
      robuxAvailable: anyStock.robuxAvailable ?? 0,
    })
  } catch (error) {
    console.error("GET /api/rbx/stock/summary error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
