
import { request } from "../client"
import { Payment, Refund } from "../types"

export const payment = {
  searchPayments: async (params: {
    start_date?: string
    finish_date?: string
    shop_id?: string
    per_page?: number
    cursor?: string
  }) => {
    return request<{
      success: boolean
      data: Payment[]
      links: any
      meta: any
    }>("GET", "/payment/search", params)
  },

  getPaymentStatus: async (id: string, params?: { refunds?: boolean; chargeback?: boolean }) => {
    return request<Payment & { success: boolean; refunds?: Refund[]; chargeback?: any[] }>(
      "GET",
      "/payment/status",
      { id, ...params }
    )
  },
}
