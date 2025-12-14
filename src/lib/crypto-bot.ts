
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

export async function getCryptoBotClient() {
  return {
    getMe: getMe,
    createInvoice: (params: { amount: number; description: string; payload?: string; paid_btn_name?: string; paid_btn_url?: string }) =>
      createInvoice(params.amount, params.description, params.payload, params.paid_btn_name, params.paid_btn_url),
  }
}

export async function createInvoice(
  amount: number,
  description: string,
  payload?: string,
  paid_btn_name?: string,
  paid_btn_url?: string,
) {
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

  if (paid_btn_name) params.paid_btn_name = paid_btn_name
  if (paid_btn_url) params.paid_btn_url = paid_btn_url

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

export type CryptoBotExchangeRate = {
  is_valid: boolean
  rate: string
  source: string
  target: string
}

const RATES_TTL_MS = 60 * 60 * 1000

let cachedRates: CryptoBotExchangeRate[] | null = null
let cachedRatesTimestamp: number | null = null

async function getExchangeRatesCached() {
  const now = Date.now()
  if (cachedRates && cachedRatesTimestamp && now - cachedRatesTimestamp < RATES_TTL_MS) {
    return cachedRates
  }
  const rates = await request<CryptoBotExchangeRate[]>("getExchangeRates")
  cachedRates = rates
  cachedRatesTimestamp = now
  return rates
}

export async function getExchangeRates() {
  return await getExchangeRatesCached()
}

export async function getRubToUsdtRate() {
  const rates = await getExchangeRatesCached()

  const direct = rates.find(
    (r) => r.source === "RUB" && r.target === "USDT" && r.is_valid,
  )

  if (direct) {
    const parsed = Number(direct.rate)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }

  const inverse = rates.find(
    (r) => r.source === "USDT" && r.target === "RUB" && r.is_valid,
  )

  if (inverse) {
    const parsed = Number(inverse.rate)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return 1 / parsed
    }
  }

  throw new Error("RUB/USDT rate not found in CryptoBot exchange rates")
}

export async function getUsdtToRubRate() {
  const rubToUsdt = await getRubToUsdtRate()
  if (!rubToUsdt || !Number.isFinite(rubToUsdt) || rubToUsdt <= 0) {
    throw new Error("Invalid RUB/USDT rate")
  }
  return 1 / rubToUsdt
}
