"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Search,
  Users,
  HelpCircle,
  BookOpen,
  Settings,
  Wallet,
  LogIn,
  CreditCard,
  Megaphone,
  Package,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { WalletDialog } from "@/components/wallet/wallet-dialog"

const data = {
  navMain: [
    {
      title: "Магазин",
      url: "/",
      icon: ShoppingCart,
    },
    {
      title: "История заказов",
      url: "/history", 
      icon: Search,
    },
    {
      title: "Пополнения",
      url: "/topups",
      icon: CreditCard,
    },
    {
      title: "Рефералы",
      url: "/referrals",
      icon: Users,
    },
  ],
  navAdmin: [
    {
      title: "Обзор",
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Заказы",
      url: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      title: "Пользователи",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Платежи",
      url: "/admin/payments",
      icon: Wallet,
    },
    {
      title: "Логи",
      url: "/admin/logs",
      icon: HelpCircle,
    },
    {
      title: "Рассылка",
      url: "/admin/broadcast",
      icon: Megaphone,
    },
    {
      title: "RBX Сток",
      url: "/admin/rbx",
      icon: Package,
    },
    {
      title: "Настройки",
      url: "/admin/settings",
      icon: Settings,
    },
  ],
  navSecondary: [
    {
      title: "FAQ",
      url: "/faq",
      icon: BookOpen,
    },
    {
      title: "Поддержка",
      url: "/support",
      icon: HelpCircle,
    },
  ],
}

interface SidebarUser {
  id: string
  firstName: string
  username?: string
  photoUrl?: string
  role: 'user' | 'admin'
  balance: number
}

import Image from "next/image"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: SidebarUser | null }) {
  const userData = user ? {
    name: user.firstName,
    email: user.username ? `@${user.username}` : `ID: ${user.id}`,
    avatar: user.photoUrl || "",
    balance: user.balance,
  } : {
    name: "Гость",
    email: "Войдите в аккаунт",
    avatar: "",
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                   <Image src="/blacklogo.svg" alt="RobuxTrade" width={24} height={24} className="w-6 h-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">RobuxTrade</span>
                  <span className="truncate text-xs">Best Prices</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Client Menu */}
        <NavMain items={data.navMain} />
        
        <SidebarMenu>
            <SidebarMenuItem>
                <WalletDialog>
                    <SidebarMenuButton tooltip="Кошелек">
                        <Wallet />
                        <span>Кошелек</span>
                    </SidebarMenuButton>
                </WalletDialog>
            </SidebarMenuItem>
        </SidebarMenu>

        {/* Admin Menu - Only for admins */}
        {user?.role === 'admin' && (
          <>
            <div className="mt-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Админ-панель
            </div>
            <NavMain items={data.navAdmin} />
          </>
        )}
        
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={userData} />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Войти">
                <Link href="/login">
                  <LogIn />
                  <span>Войти в аккаунт</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
