
import { request } from "../client"
import { Refund } from "../types"

export const refund = {
  createFullRefund: async (params: { payment_id: string; order_id?: string }) => {
    return request<{
      data: Refund
      success: boolean
    }>("POST", "/refund/full/create", params)
  },

  createPartialRefund: async (params: {
    payment_id: string
    amount: number
    order_id?: string
  }) => {
    return request<{
      data: Refund
      success: boolean
    }>("POST", "/refund/partial/create", params)
  },

  searchRefunds: async (params: {
    payment_id?: string
    start_date?: string
    finish_date?: string
    per_page?: number
    cursor?: string
  }) => {
    return request<{
      success: boolean
      data: Refund[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      links: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: any
    }>("GET", "/refund/search", params)
  },

  getRefundStatus: async (id: string) => {
    return request<Refund & { success: boolean }>("GET", "/refund/status", { id })
  },
}
