
import { getSettings } from "@/lib/settings"
import { PaypalychRequestParams } from "./types"

const BASE_URL = "https://pal24.pro/api/v1"

export async function request<T>(method: string, endpoint: string, params: PaypalychRequestParams = {}): Promise<T> {
  const settings = await getSettings()
  const token = settings.paypalychToken

  if (!token) {
    throw new Error("Paypalych Token is not configured")
  }

  const url = new URL(`${BASE_URL}${endpoint}`)
  
  const headers: HeadersInit = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json",
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (method === "GET") {
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, String(params[key]))
        }
    })
  } else if (method === "POST") {
    const formData = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        formData.append(key, String(params[key]))
      }
    })
    options.body = formData
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const response = await fetch(url.toString(), options)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Paypalych API Error: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }

  const data = await response.json()
  if (data.success === false || data.success === "false") {
      throw new Error(`Paypalych API Error: ${JSON.stringify(data)}`)
  }

  return data as T
}
