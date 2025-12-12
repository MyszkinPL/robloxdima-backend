'use client'

import { useEffect, useRef } from 'react'

export function TelegramLogin({ botName }: { botName: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !botName) return
    
    // Check if script already exists to prevent duplication
    if (ref.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-auth-url', '/api/auth/telegram')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    
    ref.current.appendChild(script)
  }, [botName])

  return (
    <div className="flex justify-center" ref={ref} />
  )
}
