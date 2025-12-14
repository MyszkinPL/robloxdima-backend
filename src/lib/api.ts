export function getBackendBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "")
  }
  if (process.env.NODE_ENV === "production") {
    return "https://api.rbtrade.org"
  }
  return ""
}

export async function backendFetch(input: string, init?: RequestInit) {
  const baseUrl = getBackendBaseUrl()
  const isAbsolute = /^https?:\/\//i.test(input)
  const url = isAbsolute ? input : baseUrl ? `${baseUrl}${input}` : input

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
    cache: init?.cache ?? "no-store",
  })
}
