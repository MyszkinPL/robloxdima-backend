
import { request } from "../client"
import { Bill, Payment } from "../types"

export const bill = {
  createBill: async (params: {
    amount: number
    shop_id: string
    order_id?: string
    description?: string
    type?: "NORMAL" | "MULTI"
    currency_in?: "RUB" | "USD" | "EUR"
    custom?: string
    payer_pays_commission?: 0 | 1
    payer_email?: string
    name?: string
    ttl?: number
    success_url?: string
    fail_url?: string
    payment_method?: "BANK_CARD" | "SBP"
  }) => {
    return request<{
      success: string
      link_url: string
      link_page_url: string
      bill_id: string
    }>("POST", "/bill/create", params)
  },

  toggleBillActivity: async (id: string, active: boolean) => {
    return request<{
      id: string
      activity: string
      status: string
      success: boolean
    }>("POST", "/bill/toggle_activity", { id, active: active ? 1 : 0 })
  },

  getBillPayments: async (id: string, params?: { per_page?: number; cursor?: string }) => {
    return request<{
      success: boolean
      data: Payment[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      links: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: any
    }>("GET", "/bill/payments", { id, ...params })
  },

  searchBills: async (params: {
    start_date?: string
    finish_date?: string
    shop_id?: string
    per_page?: number
    cursor?: string
  }) => {
    return request<{
      success: boolean
      data: Bill[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      links: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: any
    }>("GET", "/bill/search", params)
  },

  getBillStatus: async (id: string) => {
    return request<Bill & { success: boolean }>("GET", "/bill/status", { id })
  },
}
