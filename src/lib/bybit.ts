import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { getUsdtToRubRate } from "@/lib/crypto-bot"

const BYBIT_API_KEY = process.env.BYBIT_API_KEY
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET
const BYBIT_TESTNET = process.env.BYBIT_TESTNET === "true"
const BYBIT_RECV_WINDOW = "5000"

function getBaseUrl() {
  return BYBIT_TESTNET ? "https://api-testnet.bybit.com" : "https://api.bybit.com"
}

function buildQuery(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&")
}

async function signedGet(path: string, params: Record<string, string | number | undefined>) {
  if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
    throw new Error("Bybit API credentials are not configured")
  }

  const timestamp = Date.now().toString()
  const query = buildQuery(params)
  const baseUrl = getBaseUrl()
  const payload = `${timestamp}${BYBIT_API_KEY}${BYBIT_RECV_WINDOW}${query}`

  const sign = crypto
    .createHmac("sha256", BYBIT_API_SECRET)
    .update(payload)
    .digest("hex")

  const url = `${baseUrl}${path}${query ? `?${query}` : ""}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-BAPI-API-KEY": BYBIT_API_KEY,
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

export async function syncBybitInternalDeposits(options?: { startTime?: number; endTime?: number }) {
  const startTime = options?.startTime ?? Date.now() - 24 * 60 * 60 * 1000
  const endTime = options?.endTime ?? Date.now()
  let cursor: string | undefined
  let processed = 0

  let usdtToRubRate: number | null = null
  try {
    usdtToRubRate = await getUsdtToRubRate()
  } catch (error) {
    console.error("Failed to load USDT→RUB rate for Bybit sync:", error)
  }

  while (true) {
    const { rows, nextPageCursor } = await fetchInternalDeposits({
      startTime,
      endTime,
      cursor,
    })

    if (!rows.length) {
      break
    }

    for (const row of rows) {
      if (row.status !== 2) {
        continue
      }

      const user = await prisma.user.findFirst({
        where: {
          bybitUid: row.address,
        } as any,
      })

      if (!user) {
        continue
      }

      const paymentId = row.txID
      const rawAmount = Number(row.amount)
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        continue
      }

      let creditedAmountRub = rawAmount
      if (row.coin === "USDT" && usdtToRubRate && Number.isFinite(usdtToRubRate) && usdtToRubRate > 0) {
        creditedAmountRub = Math.ceil(rawAmount * usdtToRubRate * 100) / 100
      }

      try {
        await prisma.payment.create({
          data: {
            id: paymentId,
            userId: user.id,
            amount: creditedAmountRub,
            currency: "RUB",
            status: "paid",
            invoiceUrl: null,
            method: "bybit_uid",
            providerData: JSON.stringify(row),
          } as any,
        })

        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: {
              increment: creditedAmountRub,
            },
          },
        })

        processed += 1
      } catch {
      }
    }

    if (!nextPageCursor) {
      break
    }

    cursor = nextPageCursor
  }

  return { processed }
}
