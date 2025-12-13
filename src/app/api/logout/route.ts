import { NextResponse } from "next/server"
import { clearSession } from "@/lib/session"

export async function POST() {
  try {
    await clearSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/logout error:", error)
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    )
  }
}
