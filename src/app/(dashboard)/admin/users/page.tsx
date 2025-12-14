"use client"

import { useEffect, useState } from "react"
import UsersClient, { User } from "./users-client"
import { getBackendBaseUrl } from "@/lib/api"

export default function UsersPage({
  searchParams,
}: {
  searchParams?: { userId?: string }
}) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/admin/users`, {
        method: "GET",
        credentials: "include",
      })
      if (!res.ok) {
        return
      }
      const usersJson = (await res.json()) as {
        users?: User[]
      }
      if (!cancelled) {
        setUsers(usersJson.users ?? [])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const highlightUserId = searchParams?.userId || ""

  return <UsersClient data={users} highlightUserId={highlightUserId} />
}
