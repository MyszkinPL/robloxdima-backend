import { proxy } from "./proxy"
import type { NextRequest } from "next/server"

export { config } from "./proxy"

export function middleware(request: NextRequest) {
  return proxy(request)
}
