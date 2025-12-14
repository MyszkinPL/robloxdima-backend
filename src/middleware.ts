import { proxy } from "@/lib/proxy"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  return proxy(request)
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
