"use client"

import {
  ChevronsUpDown,
  LogOut,
  Wallet,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { WalletDialog } from "@/components/wallet/wallet-dialog"
import { useState } from "react"
import { getBackendBaseUrl } from "@/lib/api"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    balance?: number
  }
}) {
  const { isMobile } = useSidebar()
  const [isWalletOpen, setIsWalletOpen] = useState(false)

  return (
    <>
    <WalletDialog open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto py-2"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              
              {user.balance !== undefined && (
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md ml-2">
                   <span className="text-xs font-bold text-primary whitespace-nowrap">
                      {user.balance} ₽
                   </span>
                </div>
              )}
              
              <ChevronsUpDown className="ml-1 size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setIsWalletOpen(true)}>
                <Wallet />
                Кошелек
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  const backendBaseUrl = getBackendBaseUrl()
                  const res = await fetch(`${backendBaseUrl}/api/logout`, { method: "POST", credentials: "include" })
                  if (!res.ok) {
                    throw new Error("Logout failed")
                  }
                  window.location.href = "/login"
                } catch (error) {
                  console.error("Logout error:", error)
                }
              }}
            >
              <LogOut />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
    </>
  )
}
