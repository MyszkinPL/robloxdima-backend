"use client"

import UsersClient, { User } from "./users-client"
import { getBackendBaseUrl } from "@/lib/api"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function UsersPage({
  searchParams,
}: {
  searchParams?: { userId?: string }
}) {
  const { data, mutate } = useSWR<{ users?: User[] }>(
    `${getBackendBaseUrl()}/api/admin/users`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const users = data?.users ?? []
  const highlightUserId = searchParams?.userId || ""

  return <UsersClient data={users} highlightUserId={highlightUserId} onRefresh={mutate} />
}
