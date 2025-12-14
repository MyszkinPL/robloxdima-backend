
export interface PaypalychRequestParams extends Record<string, string | number | boolean | null | undefined> {}

export interface PaypalychResponse<T> {
  success: boolean
  data?: T
  [key: string]: any
}

export interface PaypalychError {
  code: number
  key: string
  message: string
}

export interface Bill {
  id: string
  order_id: string
  active: boolean
  status: "NEW" | "PROCESS" | "UNDERPAID" | "SUCCESS" | "OVERPAID" | "FAIL"
  amount: number
  type: "MULTI" | "NORMAL"
  created_at: string
  currency_in: "USD" | "RUB" | "EUR"
  ttl: number
  link_url?: string
  link_page_url?: string
}

export interface Payment {
  id: string
  bill_id: string
  status: "NEW" | "PROCESS" | "UNDERPAID" | "SUCCESS" | "OVERPAID" | "FAIL"
  amount: number
  commission: number
  account_amount: number
  account_currency_code: string
  refunded_amount: number
  from_card?: string
  account_bank?: string
  currency_in: "USD" | "RUB" | "EUR"
  created_at: string
  payer_phone?: string
  payer_email?: string
  payer_name?: string
  payer_comment?: string
  error_code?: number
  error_message?: string
}

export interface Payout {
  id: string
  status: "NEW" | "MODERATING" | "PROCESS" | "SUCCESS" | "FAIL" | "ERROR" | "DECLINED"
  order_id?: string
  account_identifier: string
  amount: number
  account_amount: number
  commission: number
  account_commission: number
  currency: "USD" | "RUB" | "EUR"
  account_currency: "USD" | "RUB" | "EUR"
  created_at: string
  error_code?: number
  error_message?: string
}

export interface Refund {
  id: string
  status: "NEW" | "PROCESS" | "SUCCESS" | "FAIL"
  amount: number
  currency: "USD" | "RUB" | "EUR"
  entity_type: string
  entity_id: string
  created_at: string
}

export interface Balance {
  currency: "USD" | "RUB" | "EUR"
  balance_available: number
  balance_locked: number
  balance_hold: number
}

export interface SbpBank {
  member_id: number
  name: string
  name_en: string
  bic: number
}
