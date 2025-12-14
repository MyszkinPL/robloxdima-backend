import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Delete the order
    await prisma.order.delete({
      where: { id },
    })

    // Log the deletion
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "DELETE_ORDER",
        details: JSON.stringify({ orderId: id, orderDetails: order }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/orders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    )
  }
}
