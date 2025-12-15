import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
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
    
    // Prevent actions on self
    if (userId === admin.id) {
        return NextResponse.json({ error: "Cannot modify your own account" }, { status: 403 })
    }

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
      const rawBalance = body.balance
      
      // Strict validation: Skip update if empty string or null (prevents accidental zeroing)
      if (rawBalance === "" || rawBalance === null) {
         // Optionally log warning or just skip
      } else {
          const balance = Number(rawBalance)
          
          if (isNaN(balance)) {
            return NextResponse.json({ error: "Invalid balance format" }, { status: 400 })
          }

          await updateUserBalance(userId, balance)
          await logAction(userId, "BALANCE_UPDATE", JSON.stringify({
            targetUserId: userId,
            initiatorUserId: admin.id,
            newBalance: balance,
          }))
      }
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
