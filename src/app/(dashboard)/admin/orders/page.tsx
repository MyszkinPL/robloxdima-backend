import { columns, DataTable } from "@/components/data-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAdminLogs, getOrderRefundInfo, getOrders } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { user?: string; userId?: string; orderId?: string; refunded?: string }
}) {
  const initialSearch = searchParams?.user || ""
  const filterUserId = searchParams?.userId || ""
  const filterOrderId = searchParams?.orderId || ""
  const refundedFilter = searchParams?.refunded || ""

  const [orders, adminLogs] = await Promise.all([getOrders(), getAdminLogs()])

  const refundInfos = await Promise.all(
    orders.map((o) => getOrderRefundInfo(o.id)),
  )

  const tableData = orders.map((o, index) => {
    const refund = refundInfos[index]
    const orderLogs = adminLogs.filter(
      (log) => log.details && log.details.includes(`"orderId":"${o.id}"`),
    )
    return {
      id: o.id,
      userId: o.userId,
      username: o.username,
      category: o.type === "vip" ? "VIP сервер" : "Gamepass",
      status: o.status,
      price: o.price.toString(),
      stock: o.amount.toString(),
      refunded: refund.refunded,
      refundSource: refund.source,
      refundInitiatorUserId: refund.initiatorUserId,
      logs: orderLogs,
    }
  })

  const filteredTableData = tableData.filter((row) => {
    if (filterUserId && row.userId !== filterUserId) {
      return false
    }
    if (filterOrderId && row.id !== filterOrderId) {
      return false
    }
    if (refundedFilter === "yes" && !row.refunded) {
      return false
    }
    if (refundedFilter === "no" && row.refunded) {
      return false
    }
    return true
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card className="rounded-xl border bg-card text-card-foreground shadow">
        <CardHeader>
          <CardTitle>Заказы</CardTitle>
          <CardDescription>
            Полный список заказов с фильтрами по статусу, рефанду и сумме.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredTableData} initialSearch={initialSearch} />
        </CardContent>
      </Card>
    </div>
  )
}
