"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { User } from "@/lib/db"
import useSWR from "swr"
import { getBackendBaseUrl } from "@/lib/api"

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) return { user: null }
    return await res.json()
  } catch {
    return { user: null }
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data, isLoading } = useSWR<{ user?: User }>(
    `${getBackendBaseUrl()}/api/me`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const user = data?.user || null
  const loaded = !isLoading
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loaded) return
    if (pathname.startsWith("/admin")) {
      if (!user || user.role !== "admin") {
        router.replace("/login")
      }
    }
  }, [loaded, pathname, router, user])

  if (loaded && user && user.isBanned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-4xl font-bold text-destructive mb-4">⛔ Вы заблокированы</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Доступ к сайту ограничен. Если вы считаете, что это ошибка, обратитесь в поддержку.
        </p>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
