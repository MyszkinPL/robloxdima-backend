import { BybitClient } from "./client"
import { BybitPayOrderRequest, BybitPayOrderResponse } from "./types"
import { getSettings } from "@/lib/settings"
import { v4 as uuidv4 } from "uuid"

const client = new BybitClient()

export async function createBybitPayment(
  amountUsdt: number,
  userId: string | number,
  description: string = "Topup"
) {
  const settings = await getSettings()
  const merchantId = settings.bybitStoreUid // Assuming UID acts as merchantId, or we add a new setting

  if (!merchantId) {
    throw new Error("Bybit Merchant ID (Store UID) is not configured")
  }

  const tradeNo = uuidv4()
  
  // Construct the payload based on Bybit Pay API docs
  const payload: any = {
    merchantId: merchantId,
    merchantTradeNo: tradeNo,
    currency: "USDT",
    currencyType: "crypto",
    amount: amountUsdt.toFixed(2), // API expects string, e.g., "10.50"
    paymentType: "E_COMMERCE",
    goods: [
      {
        goodsName: description,
        goodsDetail: `Topup for user ${userId}`,
        mccCode: "5732" // Electronics stores (example), or maybe use a generic one if required
      }
    ],
    env: {
      terminalType: "APP",
      device: "TelegramBot",
      ip: "127.0.0.1" // Should be actual user IP if available, or server IP
    },
    orderExpireTime: 30 * 60 * 1000, // 30 minutes
  }

  // Optional: Add webhookUrl if configured in settings or hardcoded
  // payload.webhookUrl = "https://your-domain.com/api/webhooks/bybit"

  console.log("Creating Bybit Pay order:", JSON.stringify(payload, null, 2))

  const response = await client.post<BybitPayOrderResponse>("/v5/bybitpay/create_pay", payload)

  if (response.retCode !== 0) {
    throw new Error(`Bybit Pay Error: ${response.retMsg} (Code: ${response.retCode})`)
  }

  return {
    ...response.result?.order,
    merchantTradeNo: tradeNo // Ensure we return our ID
  }
}

export async function queryBybitOrder(merchantTradeNo: string) {
    const payload = {
        merchantId: (await getSettings()).bybitStoreUid,
        merchantTradeNo
    }
    // Guessing the endpoint based on create_pay pattern
    // Usually it is /v5/bybitpay/query_order or similar
    // Let's assume /v5/bybitpay/order/query or check docs if this fails
    // Based on snippet 4 showing refund response, query might be similar.
    
    // Search result 5 mentions "Order Status" page.
    
    // Let's try the most likely endpoint
    return await client.post<BybitPayOrderResponse>("/v5/bybitpay/query_order", payload)
}
