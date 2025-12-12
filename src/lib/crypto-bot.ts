
import { getSettings } from "./settings"

const BASE_URL_MAINNET = "https://pay.crypt.bot/api"
const BASE_URL_TESTNET = "https://testnet-pay.crypt.bot/api"

type CryptoBotRequestParams = Record<string, string | number | boolean | null | undefined>

type CryptoBotResponse<T> = {
  ok: boolean
  result: T
  error?: unknown
}

async function request<T>(method: string, params: CryptoBotRequestParams = {}): Promise<T> {
  const settings = await getSettings()
  if (!settings.cryptoBotToken) {
    throw new Error("Crypto Bot Token is not configured")
  }

  const baseUrl = settings.cryptoBotTestnet ? BASE_URL_TESTNET : BASE_URL_MAINNET
  const url = new URL(`${baseUrl}/${method}`)

  // Add params to URL for GET requests? No, CryptoBot API usually accepts POST/GET with params?
  // Library used GET with query params for everything in Transport.js?
  // Let's check Transport.js again.
  // Yes, it constructs query string and uses http.get (via http_1.default which wraps http/https.request with 'GET' by default usually, or checks options).
  // Actually, standard CryptoBot API uses GET or POST. GET is fine for simple params.
  // We will use POST with JSON body for safety and cleanliness, or GET with query params if required.
  // Documentation says: "All queries must be sent using POST or GET method... Parameters can be passed ... in query string or in request body (JSON)"
  // We will use POST with JSON body to avoid encoding issues.

  const headers = {
    "Crypto-Pay-API-Token": settings.cryptoBotToken,
    "Content-Type": "application/json",
  }

  console.log(`[CryptoBot] Request ${method}:`, JSON.stringify(params, null, 2))

  const response = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `CryptoBot API Error: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }

  const data = (await response.json()) as CryptoBotResponse<T>
  if (!data.ok) {
    throw new Error(`CryptoBot API Error: ${JSON.stringify(data.error)}`)
  }

  return data.result
}

// Keep the same exports
export async function getCryptoBotClient() {
  // Mock client object to maintain compatibility if needed, or just warn.
  // But we are replacing internal logic.
  return {
    getMe: getMe,
    createInvoice: (params: { amount: number; description: string; payload?: string }) =>
      createInvoice(params.amount, params.description, params.payload),
    // Actually, createInvoice export below has (amount, description) signature.
  }
}

export async function createInvoice(amount: number, description: string, payload?: string) {
  const settings = await getSettings()
  
  const allowedAssets = settings.cryptoBotAllowedAssets
    ? settings.cryptoBotAllowedAssets.trim()
    : undefined

  const params: CryptoBotRequestParams = {
    amount: String(amount),
    currency_type: "fiat",
    fiat: String(settings.cryptoBotFiatCurrency || "RUB"),
    description: String(description || "Top-up"),
    payload: payload,
  }

  if (allowedAssets) {
    const assets = allowedAssets
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a)
    if (assets.length > 0) {
      params.accepted_assets = assets.join(",")
    }
  }

  return await request("createInvoice", params)
}

export async function getCurrencies() {
  const currencies = await request<unknown>("getCurrencies")
  if (Array.isArray(currencies)) {
    return currencies
  }
  return Object.values(currencies as Record<string, unknown>)
}

export async function getMe() {
  return await request("getMe")
}

export async function checkInvoice(invoiceId: number) {
  type InvoicesResult = {
    items?: Array<Record<string, unknown>>
    [key: string]: unknown
  }

  const result = await request<InvoicesResult>("getInvoices", {
    invoice_ids: String(invoiceId),
  })

  return result?.items?.[0] || result?.[0]
}
