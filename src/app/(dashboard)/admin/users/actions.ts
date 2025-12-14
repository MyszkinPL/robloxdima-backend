import { backendFetch } from "@/lib/api"
type UserLog = {
  id: string
  userId: string
  action: string
  details: string | null
  createdAt: string
}

type FetchUserLogsResult =
  | { success: true; logs: UserLog[] }
  | { success: false; error: string }

export async function toggleAdminRole(userId: string, makeAdmin: boolean) {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        role: makeAdmin ? "admin" : "user",
      }),
    })

    if (!res.ok) {
      return { error: "Failed to update user role" }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update user role:", error)
    return { error: "Failed to update user role" }
  }
}

export async function updateBalance(userId: string, balance: number) {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        balance,
      }),
    })

    if (!res.ok) {
      return { error: "Failed to update user balance" }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update user balance:", error)
    return { error: "Failed to update user balance" }
  }
}

export async function updateBybitUid(userId: string, bybitUid: string | null) {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        bybitUid,
      }),
    })

    if (!res.ok) {
      return { error: "Failed to update Bybit UID" }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update Bybit UID:", error)
    return { error: "Failed to update Bybit UID" }
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      return { error: "Failed to delete user" }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to delete user:", error)
    return { error: "Failed to delete user" }
  }
}

export async function toggleBanAction(userId: string, isBanned: boolean) {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        isBanned,
      }),
    })

    if (!res.ok) {
      return { error: "Failed to update ban status" }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update ban status:", error)
    return { error: "Failed to update ban status" }
  }
}

export async function fetchUserLogs(userId: string): Promise<FetchUserLogsResult> {
  try {
    const res = await backendFetch(`/api/admin/users/${encodeURIComponent(userId)}/logs`, {
      method: "GET",
    })

    if (!res.ok) {
      return { success: false, error: "Failed to fetch logs" }
    }

    const json = (await res.json()) as { logs?: UserLog[]; error?: string }
    if (!json.logs) {
      return { success: false, error: json.error || "Failed to fetch logs" }
    }

    return { success: true, logs: json.logs }
  } catch (error) {
    console.error("Failed to fetch logs:", error)
    return { success: false, error: "Failed to fetch logs" }
  }
}
