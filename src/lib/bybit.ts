import crypto from "crypto"
import { getSettings } from "@/lib/settings"

const BYBIT_RECV_WINDOW = "5000"

function getBaseUrl(testnet: boolean) {
  return testnet ? "https://api-testnet.bybit.com" : "https://api.bybit.com"
}

function buildQuery(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&")
}

async function signedGet(path: string, params: Record<string, string | number | undefined>) {
  const settings = await getSettings()
  const apiKey = settings.bybitApiKey
  const apiSecret = settings.bybitApiSecret
  const testnet = settings.bybitTestnet

  if (!apiKey || !apiSecret) {
    throw new Error("Bybit API credentials are not configured")
  }

  const timestamp = Date.now().toString()
  const query = buildQuery(params)
  const baseUrl = getBaseUrl(testnet)
  const payload = `${timestamp}${apiKey}${BYBIT_RECV_WINDOW}${query}`

  const sign = crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("hex")

  const url = `${baseUrl}${path}${query ? `?${query}` : ""}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": BYBIT_RECV_WINDOW,
      "X-BAPI-SIGN": sign,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bybit request failed: ${res.status} ${text}`)
  }

  return res.json() as Promise<unknown>
}

type InternalDepositRow = {
  id: string
  amount: string
  type: number
  coin: string
  address: string
  status: number
  createdTime: string
  txID: string
  taxDepositRecordsId: string
  taxStatus: number
}

type InternalDepositResponse = {
  retCode: number
  retMsg: string
  result?: {
    rows?: InternalDepositRow[]
    nextPageCursor?: string
  }
}

async function fetchInternalDeposits(params: { startTime?: number; endTime?: number; cursor?: string }) {
  const response = (await signedGet("/v5/asset/deposit/query-internal-record", {
    startTime: params.startTime,
    endTime: params.endTime,
    cursor: params.cursor,
    limit: 50,
  })) as InternalDepositResponse

  if (response.retCode !== 0) {
    throw new Error(`Bybit API error: ${response.retMsg}`)
  }

  const rows = response.result?.rows ?? []
  const nextPageCursor = response.result?.nextPageCursor ?? ""

  return { rows, nextPageCursor }
}

export async function checkPaymentByAmount(amountUsdt: number, startTime: number): Promise<string | null> {
  // Fetch deposits from startTime
  // We scan a bit before startTime just in case of clock drift, but startTime passed should handle it
  // Bybit API startTime is ms
  
  let cursor: string | undefined
  let foundTxId: string | null = null

  // Limit to 5 pages scan (recent deposits)
  for (let i = 0; i < 5; i++) {
    const { rows, nextPageCursor } = await fetchInternalDeposits({ startTime, cursor })
    
    // Look for exact amount match
    const match = rows.find(r => {
        // Only consider successful deposits
        // Status: 1=Processing, 2=Success (usually) - check API docs or assume 1/2 are positive
        // For internal transfer, usually instant.
        if (Number(r.status) !== 2 && Number(r.status) !== 1) return false

        const amt = parseFloat(r.amount)
        return Math.abs(amt - amountUsdt) < 0.0001
    })

    if (match) {
        foundTxId = match.txID || match.id
        break
    }

    if (!nextPageCursor) break
    cursor = nextPageCursor
  }

  return foundTxId
}

export async function syncBybitInternalDeposits(params: { startTime?: number; endTime?: number }) {
  let cursor: string | undefined
  let processedCount = 0
  
  // Default to last 24h if no time provided
  const start = params.startTime ?? Date.now() - 24 * 60 * 60 * 1000
  const end = params.endTime

  while (true) {
    const { rows, nextPageCursor } = await fetchInternalDeposits({ 
        startTime: start, 
        endTime: end, 
        cursor 
    })

    if (rows.length === 0) break

    processedCount += rows.length

    if (!nextPageCursor) break
    cursor = nextPageCursor
  }

  return { processedCount }
}
