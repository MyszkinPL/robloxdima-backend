"use server"

import { updateUserRole, updateUserBalance, deleteUser, toggleUserBan, getUserLogs, logAction } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/session"

export async function toggleAdminRole(userId: string, makeAdmin: boolean) {
  try {
    const admin = await getSessionUser()
    await updateUserRole(userId, makeAdmin ? "admin" : "user")
    await logAction(userId, "ROLE_UPDATE", JSON.stringify({
      targetUserId: userId,
      initiatorUserId: admin?.id,
      newRole: makeAdmin ? "admin" : "user",
    }))
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Failed to update user role:", error)
    return { error: "Failed to update user role" }
  }
}

export async function updateBalance(userId: string, balance: number) {
  try {
    const admin = await getSessionUser()
    await updateUserBalance(userId, balance)
    await logAction(userId, "BALANCE_UPDATE", JSON.stringify({
      targetUserId: userId,
      initiatorUserId: admin?.id,
      newBalance: balance,
    }))
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Failed to update user balance:", error)
    return { error: "Failed to update user balance" }
  }
}

export async function deleteUserAction(userId: string) {
  try {
    await deleteUser(userId)
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete user:", error)
    return { error: "Failed to delete user" }
  }
}

export async function toggleBanAction(userId: string, isBanned: boolean) {
  try {
    const admin = await getSessionUser()
    await toggleUserBan(userId, isBanned)
    await logAction(userId, isBanned ? "BAN" : "UNBAN", JSON.stringify({
      targetUserId: userId,
      initiatorUserId: admin?.id,
      status: isBanned ? "banned" : "unbanned",
    }))
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Failed to update ban status:", error)
    return { error: "Failed to update ban status" }
  }
}

export async function fetchUserLogs(userId: string) {
  try {
    const logs = await getUserLogs(userId)
    return { success: true, logs }
  } catch (error) {
    console.error("Failed to fetch logs:", error)
    return { error: "Failed to fetch logs" }
  }
}
