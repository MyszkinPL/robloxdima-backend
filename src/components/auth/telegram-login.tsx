"use client"

import { useEffect, useRef } from "react"
import { getBackendBaseUrl } from "@/lib/api"

export function TelegramLogin({ botName }: { botName: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !botName) return

    const baseUrl = getBackendBaseUrl()
    if (!baseUrl) return

    while (ref.current.firstChild) {
      ref.current.removeChild(ref.current.firstChild)
    }

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botName)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-userpic", "false")
    script.setAttribute("data-radius", "8")
    const authUrl = `${baseUrl}/api/auth/telegram`
    script.setAttribute("data-auth-url", authUrl)
    script.setAttribute("data-request-access", "write")
    script.async = true

    ref.current.appendChild(script)
  }, [botName])

  return <div className="flex justify-center" ref={ref} />
}
