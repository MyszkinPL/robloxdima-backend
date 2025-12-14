import type { User } from "./db"
import { backendFetch } from "./api"

export async function getSessionUser(): Promise<User | null> {
  try {
    const res = await backendFetch("/api/me", { method: "GET" })
    if (!res.ok) {
      return null
    }
    const json = (await res.json()) as { user?: User }
    return json.user ?? null
  } catch {
    return null
  }
}

export async function clearSession() {
  try {
    await backendFetch("/api/logout", { method: "POST" })
  } catch {
  }
}

export async function setSessionUser() {
}
