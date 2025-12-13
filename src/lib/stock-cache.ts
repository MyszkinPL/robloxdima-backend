import { getAuthenticatedRbxClient } from "./api-client"

let cachedStock = 0
let lastUpdated = 0
const CACHE_TTL_MS = 10_000

export async function getCachedStock() {
  const now = Date.now()
  if (now - lastUpdated > CACHE_TTL_MS) {
    const client = await getAuthenticatedRbxClient()
    const stock = await client.stock.getSummary()

    type StockShape = {
      robuxAvailable?: number
      [key: string]: unknown
    }

    const anyStock = stock as unknown as StockShape
    cachedStock = anyStock.robuxAvailable ?? 0
    lastUpdated = now
  }

  return cachedStock
}
