
import { request } from "../client"
import { Balance } from "../types"

export const balance = {
  getBalance: async () => {
    return request<{
      balances: Balance[]
      success: string
    }>("GET", "/merchant/balance")
  },
}
