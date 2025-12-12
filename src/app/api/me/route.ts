import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getUser } from "@/lib/db"

export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getUser(sessionUser.id)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error("GET /api/me error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

