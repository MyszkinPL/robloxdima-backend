"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getBackendBaseUrl } from "@/lib/api"
import { toast } from "sonner"
import { Users, Copy, Share2, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import useSWR from "swr"

interface ReferralStats {
  referralBalance: number
  referralsCount: number
  referralPercent: number
}

interface ReferralUser {
  id: string
  username?: string
  firstName: string
  createdAt: string
  photoUrl?: string
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function ReferralsPage() {
  const [isTransferring, setIsTransferring] = useState(false)

  const { data: userData, mutate: mutateUser, isLoading: userLoading } = useSWR(
    `${getBackendBaseUrl()}/api/me`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const { data: settingsData, isLoading: settingsLoading } = useSWR(
    `${getBackendBaseUrl()}/api/settings/public`,
    fetcher
  )

  const { data: listData, isLoading: listLoading } = useSWR(
    `${getBackendBaseUrl()}/api/referrals/list?limit=100`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const stats: ReferralStats | null = userData?.user ? {
    referralBalance: userData.user.referralBalance || 0,
    referralsCount: userData.user._count?.referrals || 0,
    referralPercent: settingsData?.referralPercent || 5
  } : null

  const botUsername = settingsData?.telegramBotUsername || ""
  const userId = userData?.user?.id || ""
  const referrals: ReferralUser[] = listData?.referrals || []
  const isLoading = userLoading || settingsLoading || listLoading

  async function handleTransfer() {
    if (!stats || stats.referralBalance <= 0) return

    setIsTransferring(true)
    const baseUrl = getBackendBaseUrl()
    try {
        const res = await fetch(`${baseUrl}/api/referrals/transfer`, {
            method: "POST",
            credentials: "include"
        })

        const data = await res.json()
        if (res.ok && data.success) {
            toast.success(`Переведено ${data.transferred.toFixed(2)} ₽ на основной баланс`)
            mutateUser() // Refresh user data
        } else {
            toast.error(data.error || "Ошибка перевода")
        }
    } catch (error) {
        toast.error("Ошибка соединения")
    } finally {
        setIsTransferring(false)
    }
  }

  const referralLink = botUsername && userId ? `https://t.me/${botUsername}?start=${userId}` : ""

  const copyLink = () => {
    if (referralLink) {
        navigator.clipboard.writeText(referralLink)
        toast.success("Ссылка скопирована")
    }
  }

  if (isLoading) {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center gap-4">
        <Users className="h-8 w-8" />
        <h1 className="text-2xl font-bold tracking-tight">Реферальная программа</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Ваша статистика</CardTitle>
                <CardDescription>
                    Получайте {stats?.referralPercent}% от всех пополнений ваших рефералов.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Приглашено</p>
                        <p className="text-2xl font-bold">{stats?.referralsCount} чел.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Реф. баланс</p>
                        <p className="text-2xl font-bold text-primary">{stats?.referralBalance.toFixed(2)} ₽</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    onClick={handleTransfer} 
                    disabled={!stats || stats.referralBalance <= 0 || isTransferring}
                >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isTransferring ? "Перевод..." : "Перевести на основной баланс"}
                </Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Ваша ссылка</CardTitle>
                <CardDescription>
                    Делитесь ссылкой с друзьями и зарабатывайте.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg break-all font-mono text-sm">
                    {referralLink || "Загрузка..."}
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                <Button className="flex-1" variant="outline" onClick={copyLink} disabled={!referralLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Копировать
                </Button>
                {/* <Button className="flex-1" variant="secondary" disabled={!referralLink}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Поделиться
                </Button> */}
            </CardFooter>
        </Card>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Приглашенные пользователи</CardTitle>
              <CardDescription>
                  Список пользователей, которые зарегистрировались по вашей ссылке.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {referrals.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                      У вас пока нет рефералов.
                  </div>
              ) : (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Пользователь</TableHead>
                              <TableHead>Дата регистрации</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {referrals.map((user) => (
                              <TableRow key={user.id}>
                                  <TableCell className="flex items-center gap-3">
                                      <Avatar>
                                          <AvatarImage src={user.photoUrl} alt={user.firstName} />
                                          <AvatarFallback>{user.firstName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                          <span className="font-medium">{user.firstName}</span>
                                          {user.username && (
                                              <span className="text-xs text-muted-foreground">@{user.username}</span>
                                          )}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              )}
          </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Как это работает?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
              <p>1. Скопируйте вашу уникальную реферальную ссылку.</p>
              <p>2. Отправьте её друзьям или разместите в соцсетях.</p>
              <p>3. Когда пользователь перейдет по ссылке и начнет пользоваться ботом, он закрепится за вами.</p>
              <p>4. Вы будете получать {stats?.referralPercent}% от суммы каждого их заказа на ваш реферальный баланс.</p>
              <p>5. Средства с реферального баланса можно перевести на основной и использовать для покупок.</p>
          </CardContent>
      </Card>
    </div>
  )
}
