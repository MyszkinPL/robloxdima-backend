"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  IconCircleCheckFilled,
  IconDotsVertical,
  IconLoader,
  IconAlertCircle,
  IconClock,
} from "@tabler/icons-react"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { History } from "lucide-react"
import type { AdminLogEntry } from "@/lib/db"

export type OrderData = {
  id: string
  userId: string
  username: string
  category: string
  status: string
  price: string
  stock: string
  refunded?: boolean
  refundSource?: string
  refundInitiatorUserId?: string | null
  logs?: AdminLogEntry[]
}

import { RobuxIcon } from "@/components/robux-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getBackendBaseUrl } from "@/lib/api"

function OrderActionsCell({ row }: { row: { original: OrderData } }) {
  const order = row.original
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)
  const [details, setDetails] = React.useState<{
    status?: string
    type?: string
    robloxUsername?: string
    robuxAmount?: number
    price?: number
    error?: string
  } | null>(null)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [logsOpen, setLogsOpen] = React.useState(false)

  const fetchDetails = async () => {
    try {
      setIsLoadingDetails(true)
      setDetails(null)
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/admin/rbx/orders/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || "Не удалось получить детали заказа")
        return
      }

      const info = data.result
      setDetails({
        status: info?.status,
        type: info?.type,
        robloxUsername: info?.robloxUsername,
        robuxAmount: info?.robuxAmount,
        price: info?.price,
        error: info?.error?.message,
      })
      setDetailsOpen(true)
    } catch (error) {
      console.error("Failed to fetch order info", error)
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка"
      toast.error(`Ошибка: ${message}`)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm("Вы уверены, что хотите отменить заказ в RBXCrate?")) {
      return
    }
    try {
      setIsCancelling(true)
      const backendBaseUrl = getBackendBaseUrl()
      const res = await fetch(`${backendBaseUrl}/api/admin/rbx/orders/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || "Не удалось отменить заказ")
        return
      }

      toast.success("Запрос на отмену заказа отправлен в RBXCrate")
    } catch (error) {
      console.error("Failed to cancel order", error)
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка"
      toast.error(`Ошибка: ${message}`)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Меню</span>
            <IconDotsVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(order.id)}
          >
            Копировать ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(order.userId)}
          >
            Копировать Telegram ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void fetchDetails()
            }}
          >
            {isLoadingDetails ? "Загрузка..." : "Посмотреть детали"}
          </DropdownMenuItem>
          {order.logs && order.logs.length > 0 && (
            <DropdownMenuItem
              onClick={() => {
                setLogsOpen(true)
              }}
            >
              <History className="mr-2 h-4 w-4" />
              Логи заказа
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              void handleCancel()
            }}
            className="text-destructive"
          >
            {isCancelling ? "Отмена..." : "Отменить заказ на RBXCrate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Детали заказа RBXCrate</DialogTitle>
          </DialogHeader>
          {isLoadingDetails && <p>Загрузка...</p>}
          {!isLoadingDetails && !details && (
            <p className="text-sm text-muted-foreground">
              Детали заказа недоступны.
            </p>
          )}
          {!isLoadingDetails && details && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Статус:</span>{" "}
                {details.status || "—"}
              </div>
              <div>
                <span className="font-medium">Тип:</span>{" "}
                {details.type || "—"}
              </div>
              <div>
                <span className="font-medium">Никнейм Roblox:</span>{" "}
                {details.robloxUsername || order.username}
              </div>
              <div>
                <span className="font-medium">Robux:</span>{" "}
                {details.robuxAmount ?? Number(order.stock)}
              </div>
              <div>
                <span className="font-medium">Цена:</span>{" "}
                {(details.price ?? Number(order.price)).toFixed(2)} ₽
              </div>
              {details.error && (
                <div className="text-destructive">
                  <span className="font-medium">Ошибка:</span>{" "}
                  {details.error}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Логи заказа</DialogTitle>
          </DialogHeader>
          {!order.logs || order.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Для этого заказа ещё нет логов.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
              {order.logs.map((log) => (
                <div key={log.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("ru-RU")}
                  </div>
                  <div className="mt-1">
                    <Badge variant="outline">{log.action}</Badge>
                  </div>
                  {log.details && (
                    <div className="mt-1 whitespace-pre-wrap break-words">
                      {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const columns: ColumnDef<OrderData>[] = [
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
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue("username")}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Тип",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("category")}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "all") {
        return true
      }
      const value = row.getValue(columnId) as string | undefined
      return value === filterValue
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <div className="flex items-center gap-2">
          {status === "completed" && <IconCircleCheckFilled className="text-green-500 size-4" />}
          {status === "processing" && <IconLoader className="animate-spin text-blue-500 size-4" />}
          {status === "pending" && <IconClock className="text-yellow-500 size-4" />}
          {status === "failed" && <IconAlertCircle className="text-red-500 size-4" />}
          <span className="capitalize">{status}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "refunded",
    header: "Рефанд",
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "all") {
        return true
      }
      const value = row.getValue(columnId) as boolean | undefined
      if (filterValue === "yes") {
        return !!value
      }
      if (filterValue === "no") {
        return !value
      }
      return true
    },
    cell: ({ row }) => {
      const refunded = row.original.refunded
      const source = row.original.refundSource
      const initiatorUserId = row.original.refundInitiatorUserId

      if (!refunded) {
        return <span className="text-xs text-muted-foreground">—</span>
      }

      let label = "Рефанд"

      if (source === "admin_cancel") {
        label = initiatorUserId
          ? `Админ (${initiatorUserId})`
          : "Админ"
      } else if (source === "rbx_webhook") {
        label = "Авто (RBXCrate)"
      } else if (source === "order_create") {
        label = "Ошибка при создании"
      } else if (source === "system") {
        label = "Система"
      }

      return (
        <Badge variant="outline" className="text-xs">
          {label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stock", // Reusing this key for Amount Robux
    header: () => <div className="text-right flex items-center justify-end gap-1">Сумма (<RobuxIcon className="w-3 h-3" />)</div>,
    cell: ({ row }) => {
      return <div className="text-right font-medium flex items-center justify-end gap-1">{row.getValue("stock")} <RobuxIcon className="w-3 h-3" /></div>
    },
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Цена (RUB)</div>,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) {
        return true
      }
      const raw = row.getValue(columnId) as string | number | undefined
      const price = typeof raw === "number" ? raw : parseFloat(raw || "0")
      const min = typeof filterValue.min === "number" ? filterValue.min : undefined
      const max = typeof filterValue.max === "number" ? filterValue.max : undefined
      if (min !== undefined && price < min) return false
      if (max !== undefined && price > max) return false
      return true
    },
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      return <div className="text-right font-medium">{price.toFixed(2)} ₽</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <OrderActionsCell row={row as { original: OrderData }} />,
  },
]

export function DataTable<TData, TValue>({
  columns,
  data,
  initialSearch,
}: {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialSearch?: string
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  React.useEffect(() => {
    if (!initialSearch) return
    if (table.getColumn("name")) {
      table.getColumn("name")?.setFilterValue(initialSearch)
    }
    if (table.getColumn("username")) {
      table.getColumn("username")?.setFilterValue(initialSearch)
    }
  }, [initialSearch, table])

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-4 py-4">
        <Input
          placeholder="Поиск..."
          value={
            (table.getColumn("name")?.getFilterValue() as string) ??
            (table.getColumn("username")?.getFilterValue() as string) ??
            ""
          }
          onChange={(event) => {
            const value = event.target.value
            if (table.getColumn("name")) {
              table.getColumn("name")?.setFilterValue(value)
            }
            if (table.getColumn("username")) {
              table.getColumn("username")?.setFilterValue(value)
            }
          }}
          className="max-w-sm"
        />
        {table.getColumn("status") && (
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => {
              const column = table.getColumn("status")
              if (!column) return
              if (value === "all") {
                column.setFilterValue(undefined)
              } else {
                column.setFilterValue(value)
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="completed">Выполнен</SelectItem>
              <SelectItem value="processing">В обработке</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="failed">Неуспешен</SelectItem>
            </SelectContent>
          </Select>
        )}
        {table.getColumn("refunded") && (
          <Select
            value={(table.getColumn("refunded")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) => {
              const column = table.getColumn("refunded")
              if (!column) return
              if (value === "all") {
                column.setFilterValue(undefined)
              } else {
                column.setFilterValue(value)
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Рефанд" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все заказы</SelectItem>
              <SelectItem value="yes">Только с рефандом</SelectItem>
              <SelectItem value="no">Без рефанда</SelectItem>
            </SelectContent>
          </Select>
        )}
        {table.getColumn("price") && (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Цена от"
              className="w-[110px]"
              value={
                ((table.getColumn("price")?.getFilterValue() as { min?: number; max?: number } | undefined)?.min ??
                  "") as string | number
              }
              onChange={(event) => {
                const column = table.getColumn("price")
                if (!column) return
                const current = (column.getFilterValue() as { min?: number; max?: number } | undefined) ?? {}
                const raw = event.target.value
                const next =
                  raw === ""
                    ? { ...current, min: undefined }
                    : { ...current, min: Number(raw) || 0 }
                column.setFilterValue(next)
              }}
            />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="до"
              className="w-[110px]"
              value={
                ((table.getColumn("price")?.getFilterValue() as { min?: number; max?: number } | undefined)?.max ??
                  "") as string | number
              }
              onChange={(event) => {
                const column = table.getColumn("price")
                if (!column) return
                const current = (column.getFilterValue() as { min?: number; max?: number } | undefined) ?? {}
                const raw = event.target.value
                const next =
                  raw === ""
                    ? { ...current, max: undefined }
                    : { ...current, max: Number(raw) || 0 }
                column.setFilterValue(next)
              }}
            />
          </div>
        )}
        <div className="ml-auto" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Нет данных.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} из{" "}
          {table.getFilteredRowModel().rows.length} выбрано.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Вперед
          </Button>
        </div>
      </div>
    </div>
  )
}
