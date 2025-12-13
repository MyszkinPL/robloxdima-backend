import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSettings } from "@/lib/settings"
import { createUserOrUpdate } from "@/lib/db"
import { setSessionUser } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const { initData } = (await req.json()) as { initData?: string }

    if (!initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 })
    }

    const settings = await getSettings()
    if (!settings.telegramBotToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    const searchParams = new URLSearchParams(initData)
    const hash = searchParams.get("hash")

    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 })
    }

    const dataToCheck: string[] = []
    searchParams.forEach((value, key) => {
      if (key !== "hash") {
        dataToCheck.push(`${key}=${value}`)
      }
    })

    dataToCheck.sort()
    const dataCheckString = dataToCheck.join("\n")

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(settings.telegramBotToken)
      .digest()
    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex")

    if (hmac !== hash) {
      return NextResponse.json({ error: "Invalid hash" }, { status: 403 })
    }

    const authDateRaw = searchParams.get("auth_date")
    if (authDateRaw) {
      const authDate = parseInt(authDateRaw || "0")
      const now = Math.floor(Date.now() / 1000)
      if (now - authDate > 86400) {
        return NextResponse.json({ error: "Data is outdated" }, { status: 403 })
      }
    }

    const userJson = searchParams.get("user")
    if (!userJson) {
      return NextResponse.json({ error: "Missing user" }, { status: 400 })
    }

    let parsedUser: {
      id: number
      username?: string
      first_name: string
      last_name?: string
      photo_url?: string
    }

    try {
      parsedUser = JSON.parse(userJson) as typeof parsedUser
    } catch {
      return NextResponse.json({ error: "Invalid user payload" }, { status: 400 })
    }

    const user = await createUserOrUpdate({
      id: String(parsedUser.id),
      username: parsedUser.username || undefined,
      firstName: parsedUser.first_name,
      photoUrl: parsedUser.photo_url || undefined,
    })

    await setSessionUser(user.id)

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("POST /api/auth/telegram-mini error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
