import crypto from "crypto"
import { getSettings } from "@/lib/settings"

const BYBIT_RECV_WINDOW = "5000"

function getBaseUrl(testnet: boolean) {
  // Bybit Pay might use the same base URL as V5
  return testnet ? "https://api-testnet.bybit.com" : "https://api.bybit.com"
}

export class BybitClient {
  private async getCredentials() {
    const settings = await getSettings()
    const apiKey = settings.bybitApiKey
    const apiSecret = settings.bybitApiSecret
    const testnet = settings.bybitTestnet

    if (!apiKey || !apiSecret) {
      throw new Error("Bybit API credentials are not configured")
    }
    return { apiKey, apiSecret, testnet }
  }

  private generateSignature(payload: string, apiSecret: string) {
    return crypto
      .createHmac("sha256", apiSecret)
      .update(payload)
      .digest("hex")
  }

  async post<T>(path: string, data: Record<string, unknown>): Promise<T> {
    const { apiKey, apiSecret, testnet } = await this.getCredentials()
    const timestamp = Date.now().toString()
    const bodyStr = JSON.stringify(data)
    
    // Signature for POST: timestamp + apiKey + recvWindow + body
    const payload = `${timestamp}${apiKey}${BYBIT_RECV_WINDOW}${bodyStr}`
    const sign = this.generateSignature(payload, apiSecret)

    const url = `${getBaseUrl(testnet)}${path}`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": BYBIT_RECV_WINDOW,
        "X-BAPI-SIGN": sign,
      },
      body: bodyStr,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bybit request failed: ${res.status} ${text}`)
    }

    return res.json() as Promise<T>
  }
}
