import { NextRequest } from "next/server"

const ipRequests = new Map<string, number[]>()

export function rateLimit(req: NextRequest, limit = 10, windowMs = 60000) {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(',')[0].trim() : "unknown"
  
  const now = Date.now()
  const timestamps = ipRequests.get(ip) || []
  const recent = timestamps.filter((t) => t > now - windowMs)
  if (recent.length >= limit) {
    return true
  }
  recent.push(now)
  ipRequests.set(ip, recent)
  return false
}

