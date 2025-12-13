import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getRubToUsdtRate } from "@/lib/crypto-bot"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const rate = await getRubToUsdtRate()

    return NextResponse.json({
      success: true,
      rate,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

