import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { createUserOrUpdate } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const botToken = req.headers.get("x-bot-token")

    if (!botToken) {
      return NextResponse.json({ error: "Missing bot token" }, { status: 401 })
    }

    const settings = await getSettings()

    if (!settings.telegramBotToken || settings.telegramBotToken !== botToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await req.json()) as {
      id: string
      username?: string
      firstName?: string
      photoUrl?: string
      referrerId?: string
    }

    if (!body.id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    const user = await createUserOrUpdate({
      id: String(body.id),
      username: body.username,
      firstName: body.firstName || "User",
      photoUrl: body.photoUrl,
      referrerId: body.referrerId,
    } as any)

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("POST /api/bot/user-sync error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

