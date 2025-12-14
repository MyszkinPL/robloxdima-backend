
import { request } from "../client"
import { Payout, SbpBank } from "../types"

export const payout = {
  createPersonalPayout: async (params: {
    amount: number
    payout_account_id: string
    account_currency?: "RUB" | "USD" | "EUR"
    recipient_pays_commission?: boolean
    order_id?: string
  }) => {
    return request<{
      data: Payout[]
      success: boolean
    }>("POST", "/payout/personal/create", {
        ...params,
        recipient_pays_commission: params.recipient_pays_commission ? 'true' : 'false'
    })
  },

  createRegularPayout: async (params: {
    amount: number
    currency: "RUB" | "USD" | "EUR"
    account_type: "credit_card" | "sbp" | "crypto" | "steam"
    account_identifier: string
    account_bank?: number // for SBP
    card_holder?: string // for credit_card
    account_network?: "TRX" | "ETH" // for crypto
    account_currency?: "RUB" | "USD" | "EUR"
    recipient_pays_commission?: boolean
    order_id?: string
  }) => {
    return request<{
      data: Payout[]
      success: boolean
    }>("POST", "/payout/regular/create", {
        ...params,
        recipient_pays_commission: params.recipient_pays_commission ? 'true' : 'false'
    })
  },

  searchPayouts: async (params: {
    start_date?: string
    finish_date?: string
    per_page?: number
    cursor?: string
  }) => {
    return request<{
      success: boolean
      data: Payout[]
      links: any
      meta: any
    }>("GET", "/payout/search", params)
  },

  getPayoutStatus: async (params: { id?: string; order_id?: string }) => {
    if (!params.id && !params.order_id) {
        throw new Error("Either id or order_id is required")
    }
    return request<Payout & { success: boolean }>("GET", "/payout/status", params)
  },

  getSbpBanks: async () => {
    return request<{
      data: SbpBank[]
      success: boolean
    }>("GET", "/payout/dictionaries/sbp_banks")
  },
}
