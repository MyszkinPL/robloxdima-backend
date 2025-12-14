import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host")

  if (
    process.env.NODE_ENV === "production" &&
    forwardedProto === "http" &&
    forwardedHost
  ) {
    const url = new URL(request.url)
    url.protocol = "https:"
    url.host = forwardedHost
    return NextResponse.redirect(url, 308)
  }

  const origin = request.headers.get("origin")
  const isApiRequest = request.nextUrl.pathname.startsWith("/api")

  const allowedOrigins = [
    "https://rbtrade.org",
    "https://www.rbtrade.org",
    "http://localhost:3000",
    "http://localhost:5173",
  ]

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 })
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin)
        response.headers.set("Access-Control-Allow-Credentials", "true")
      }
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      )
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-bot-token, x-telegram-id",
      )
      response.headers.set("Access-Control-Max-Age", "86400")
      return response
    }

    const response = NextResponse.next()

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Credentials", "true")
      response.headers.set("Vary", "Origin")
    }

    return response
  }

  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  const session = request.cookies.get("session_user_id")

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

