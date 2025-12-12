import { getUsers, getOrders } from "@/lib/db"
import UsersClient, { User } from "./users-client"

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { userId?: string }
}) {
  const [dbUsers, orders] = await Promise.all([getUsers(), getOrders()])

  const highlightUserId = searchParams?.userId || ""

  const statsByUser = new Map<
    string,
    { totalSpent: number; ordersCount: number; lastActive: string }
  >()

  for (const order of orders) {
    const existing = statsByUser.get(order.userId)
    if (!existing) {
      statsByUser.set(order.userId, {
        totalSpent: order.price,
        ordersCount: 1,
        lastActive: order.createdAt,
      })
    } else {
      const totalSpent = existing.totalSpent + order.price
      const ordersCount = existing.ordersCount + 1
      const lastActive =
        new Date(order.createdAt) > new Date(existing.lastActive)
          ? order.createdAt
          : existing.lastActive

      statsByUser.set(order.userId, {
        totalSpent,
        ordersCount,
        lastActive,
      })
    }
  }

  const users: User[] = dbUsers.map((user) => {
    const stats = statsByUser.get(user.id)

    return {
      id: user.id,
      username: user.username || `User ${user.id}`,
      totalSpent: stats ? stats.totalSpent : 0,
      ordersCount: stats ? stats.ordersCount : 0,
      lastActive: stats ? stats.lastActive : user.createdAt,
      status: user.isBanned ? "banned" : "active",
      role: user.role,
      balance: user.balance,
    }
  })

  return <UsersClient data={users} highlightUserId={highlightUserId} />
}
