export interface BybitPayOrderRequest {
  merchantId: string
  merchantTradeNo: string
  currency: string // "USDT"
  currencyType: "crypto" | "fiat"
  amount: string
  paymentType: "E_COMMERCE"
  goods: {
    goodsName: string
    goodsDetail?: string
  }[]
  env?: {
    terminalType: "APP" | "WEB" | "WAP" | "MINI_APP"
    osType?: "ANDROID" | "IOS" | "OTHERS"
    browserVersion?: string
    device?: string
    ip?: string
  }
  orderExpireTime?: number
  returnUrl?: string // For web redirect
  webhookUrl?: string // Server-to-server callback
}

export interface BybitPayOrderResponse {
  retCode: number
  retMsg: string
  result?: {
    order?: {
        payId: string
        merchantTradeNo: string
        status: string
        webUrl?: string // Hypothetical, need to check actual response
        appUrl?: string
        qrCode?: string // If they provide raw QR data
    }
  }
}
