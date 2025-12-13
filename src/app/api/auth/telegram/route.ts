import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSettings } from "@/lib/settings"
import { createUserOrUpdate } from "@/lib/db"
import { setSessionUser } from "@/lib/session"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const hash = searchParams.get("hash")

  if (!hash) {
    return NextResponse.json({ error: "Missing hash" }, { status: 400 })
  }

  const settings = await getSettings()
  if (!settings.telegramBotToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
  }

  const dataToCheck: string[] = []
  searchParams.forEach((value, key) => {
    if (key !== "hash") {
      dataToCheck.push(`${key}=${value}`)
    }
  })

  dataToCheck.sort()
  const dataCheckString = dataToCheck.join("\n")

  const secretKey = crypto.createHash("sha256").update(settings.telegramBotToken).digest()
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (hmac !== hash) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 403 })
  }

  const authDate = parseInt(searchParams.get("auth_date") || "0")
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 86400) {
    return NextResponse.json({ error: "Data is outdated" }, { status: 403 })
  }

  const user = await createUserOrUpdate({
    id: searchParams.get("id")!,
    username: searchParams.get("username") || undefined,
    firstName: searchParams.get("first_name")!,
    photoUrl: searchParams.get("photo_url") || undefined,
  })

  await setSessionUser(user.id)

  const forwardedHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || ""
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https"

  const frontendBase =
    process.env.FRONTEND_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "http://localhost:3000")

  const redirectUrl = new URL("/", frontendBase)

  return NextResponse.redirect(redirectUrl)
}
