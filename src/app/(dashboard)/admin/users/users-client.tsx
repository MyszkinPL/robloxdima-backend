"use client"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Trash2, Ban, History, Unlock, Loader2 } from "lucide-react"

import { updateBalance, toggleAdminRole, deleteUserAction, toggleBanAction, fetchUserLogs, updateBybitUid } from "./actions"
import { toast } from "sonner"
import { Shield, ShieldAlert, ShieldCheck, Coins, Filter, Search } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

export type User = {
  id: string
  username: string
  totalSpent: number
  ordersCount: number
  lastActive: string
  status: "active" | "banned"
  role: "user" | "admin"
  balance: number
  bybitUid: string | null
}

type UserLog = {
  id: string
  userId: string
  action: string
  details: string | null
  createdAt: string
}

function UserLogsDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [loading, setLoading] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    const result = await fetchUserLogs(userId)
    if (result.success && result.logs) {
      setLogs(result.logs)
    } else {
      toast.error("Не удалось загрузить логи")
    }
    setLoading(false)
  }

  // Load logs when dialog opens
  if (open && logs.length === 0 && !loading) {
    loadLogs()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>История действий</DialogTitle>
          <DialogDescription>
            Логи действий пользователя и администратора.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">Лог пуст</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col space-y-1 border-b pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function UserActions({ user, onRefresh }: { user: User; onRefresh?: () => void }) {
  const router = useRouter()
  const [showBalanceDialog, setShowBalanceDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [balance, setBalance] = useState(user.balance.toString())
  const [isUpdating, setIsUpdating] = useState(false)
  const [showBybitDialog, setShowBybitDialog] = useState(false)
  const [bybitUid, setBybitUid] = useState(user.bybitUid || "")
  const [isBybitUpdating, setIsBybitUpdating] = useState(false)

  const handleToggleAdmin = async () => {
    const newRole = user.role === "admin" ? false : true
    const result = await toggleAdminRole(user.id, newRole)
    if (result.success) {
      toast.success(`Роль пользователя обновлена: ${newRole ? "Администратор" : "Пользователь"}`)
      onRefresh ? onRefresh() : window.location.reload()
    } else {
      toast.error("Ошибка обновления роли")
    }
  }

  const handleToggleBan = async () => {
    const newStatus = user.status === "banned" ? false : true
    const result = await toggleBanAction(user.id, newStatus)
    if (result.success) {
      toast.success(`Пользователь ${newStatus ? "забанен" : "разбанен"}`)
      onRefresh ? onRefresh() : window.location.reload()
    } else {
      toast.error("Ошибка обновления статуса бана")
    }
  }

  const handleDeleteUser = async () => {
    const result = await deleteUserAction(user.id)
    if (result.success) {
      toast.success("Пользователь удален")
      onRefresh ? onRefresh() : window.location.reload()
    } else {
      toast.error("Ошибка удаления пользователя")
    }
    setShowDeleteAlert(false)
  }

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    const val = parseFloat(balance)
    if (isNaN(val)) {
        toast.error("Некорректная сумма")
        setIsUpdating(false)
        return
    }
    const result = await updateBalance(user.id, val)
    if (result.success) {
        toast.success("Баланс обновлен")
        setShowBalanceDialog(false)
        onRefresh ? onRefresh() : window.location.reload()
    } else {
        toast.error("Ошибка обновления баланса")
    }
    setIsUpdating(false)
  }

  const handleUpdateBybitUid = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsBybitUpdating(true)
    const value = bybitUid.trim()
    const result = await updateBybitUid(user.id, value.length > 0 ? value : null)
    if ((result as { success?: boolean }).success) {
      toast.success("Bybit UID обновлен")
      setShowBybitDialog(false)
      onRefresh ? onRefresh() : window.location.reload()
    } else {
      toast.error("Ошибка обновления Bybit UID")
    }
    setIsBybitUpdating(false)
  }

  return (
    <>
      <UserLogsDialog userId={user.id} open={showLogsDialog} onOpenChange={setShowLogsDialog} />
      <Dialog open={showBybitDialog} onOpenChange={setShowBybitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bybit UID пользователя</DialogTitle>
            <DialogDescription>
              Текущий Bybit UID пользователя {user.username}: {user.bybitUid || "не указан"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBybitUid} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bybit-uid">Bybit UID или идентификатор</Label>
              <Input
                id="bybit-uid"
                type="text"
                value={bybitUid}
                onChange={(e) => setBybitUid(e.target.value)}
                placeholder="Например, 123456789"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBybitDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isBybitUpdating}>
                {isBybitUpdating ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Пользователь будет удален из базы данных навсегда, вместе с историей заказов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить баланс пользователя</DialogTitle>
            <DialogDescription>
              Текущий баланс пользователя {user.username}: {user.balance} ₽
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Новый баланс (₽)</Label>
              <Input
                id="balance"
                type="text"
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBalanceDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(user.username)}
          >
            Копировать никнейм
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(user.id)}
          >
            Копировать ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (user.username) {
                router.push(`/admin/orders?user=${encodeURIComponent(user.username)}`)
              }
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            Открыть заказы пользователя
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowLogsDialog(true)}>
            <History className="mr-2 h-4 w-4" />
            Смотреть логи
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBalanceDialog(true)}>
            <Coins className="mr-2 h-4 w-4" />
            Изменить баланс
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBybitDialog(true)}>
            <Coins className="mr-2 h-4 w-4" />
            Настроить Bybit UID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleAdmin}>
            {user.role === "admin" ? (
              <div className="flex items-center text-orange-600">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Снять права админа
              </div>
            ) : (
              <div className="flex items-center text-green-600">
                <Shield className="mr-2 h-4 w-4" />
                Сделать админом
              </div>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleBan}>
            {user.status === "banned" ? (
              <div className="flex items-center text-green-600">
                <Unlock className="mr-2 h-4 w-4" />
                Разбанить
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <Ban className="mr-2 h-4 w-4" />
                Забанить
              </div>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить пользователя
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

const getColumns = (onRefresh?: () => void): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "username",
    header: "Никнейм",
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-2">
          <div className="font-medium">{user.username}</div>
          {user.role === "admin" && <ShieldCheck className="h-4 w-4 text-primary" />}
          {user.status === "banned" && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">BAN</Badge>}
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    header: "Роль",
    cell: ({ row }) => (
      <Badge variant={row.getValue("role") === "admin" ? "default" : "secondary"}>
        {row.getValue("role")}
      </Badge>
    ),
  },
  {
    accessorKey: "balance",
    header: "Баланс",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("balance"))
      return <div className="font-medium text-green-600">{amount.toFixed(2)} ₽</div>
    },
  },
  {
    accessorKey: "bybitUid",
    header: "Bybit UID",
    cell: ({ row }) => {
      const uid = row.original.bybitUid
      return <div className="text-xs text-muted-foreground">{uid || "—"}</div>
    },
  },
  {
    accessorKey: "totalSpent",
    header: "Потрачено",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalSpent"))
      return <div className="font-medium text-muted-foreground">{amount.toFixed(2)} ₽</div>
    },
  },
  {
    accessorKey: "ordersCount",
    header: "Заказов",
  },
  {
    accessorKey: "lastActive",
    header: "Дата регистрации",
    cell: ({ row }) => {
      const date = new Date(row.getValue("lastActive"))
      return <div>{date.toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <UserActions user={row.original} onRefresh={onRefresh} />,
  },
]

export default function UsersClient({ data, highlightUserId, onRefresh }: { data: User[]; highlightUserId?: string; onRefresh?: () => void }) {
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all")
  const [ordersFilter, setOrdersFilter] = useState<"all" | "with" | "without">("all")

  const columns = useMemo(() => getColumns(onRefresh), [onRefresh])

  const filteredData = useMemo(
    () =>
      data.filter((user) => {
        if (highlightUserId && user.id !== highlightUserId) return false
        if (roleFilter !== "all" && user.role !== roleFilter) return false
        if (statusFilter !== "all" && user.status !== statusFilter) return false
        if (ordersFilter === "with" && user.ordersCount === 0) return false
        if (ordersFilter === "without" && user.ordersCount > 0) return false
        return true
      }),
    [data, roleFilter, statusFilter, ordersFilter, highlightUserId],
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Пользователи</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Фильтры:</span>
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) =>
              setRoleFilter(value as "all" | "user" | "admin")
            }
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все роли</SelectItem>
              <SelectItem value="user">Пользователи</SelectItem>
              <SelectItem value="admin">Администраторы</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "all" | "active" | "banned")
            }
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="banned">Забаненные</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={ordersFilter}
            onValueChange={(value) =>
              setOrdersFilter(value as "all" | "with" | "without")
            }
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Заказы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все пользователи</SelectItem>
              <SelectItem value="with">С заказами</SelectItem>
              <SelectItem value="without">Без заказов</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable columns={columns} data={filteredData} />
    </div>
  )
}
