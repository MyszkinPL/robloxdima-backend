import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import {
  deleteUser,
  logAction,
  toggleUserBan,
  updateUserBalance,
  updateUserRole,
} from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getSessionUser()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = await context.params
    const body = await req.json()

    if (Object.prototype.hasOwnProperty.call(body, "role")) {
      const role = body.role as "user" | "admin"
      await updateUserRole(userId, role)
      await logAction(userId, "ROLE_UPDATE", JSON.stringify({
        targetUserId: userId,
        initiatorUserId: admin.id,
        newRole: role,
      }))
    }

    if (Object.prototype.hasOwnProperty.call(body, "balance")) {
      const balance = Number(body.balance)
      await updateUserBalance(userId, balance)
      await logAction(userId, "BALANCE_UPDATE", JSON.stringify({
        targetUserId: userId,
        initiatorUserId: admin.id,
        newBalance: balance,
      }))
    }

    if (Object.prototype.hasOwnProperty.call(body, "isBanned")) {
      const isBanned = Boolean(body.isBanned)
      await toggleUserBan(userId, isBanned)
      await logAction(userId, isBanned ? "BAN" : "UNBAN", JSON.stringify({
        targetUserId: userId,
        initiatorUserId: admin.id,
        status: isBanned ? "banned" : "unbanned",
      }))
    }

    if (Object.prototype.hasOwnProperty.call(body, "bybitUid")) {
      const raw = (body.bybitUid as string | null) ?? null
      const trimmed = raw && typeof raw === "string" ? raw.trim() : null
      const value = trimmed && trimmed.length > 0 ? trimmed : null

      await prisma.user.update({
        where: { id: userId },
        data: {
          bybitUid: value,
        } as any,
      })

      await logAction(
        userId,
        "BYBIT_UID_UPDATE",
        JSON.stringify({
          targetUserId: userId,
          initiatorUserId: admin.id,
          bybitUid: value,
        }),
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/users/[userId] error:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getSessionUser()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = await context.params
    await deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/users/[userId] error:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    )
  }
}
