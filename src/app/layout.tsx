import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "RobuxTrade — Дешевые робуксы",
  description: "Моментальная отгрузка, выгодный курс, автоматическая покупка.",
  openGraph: {
    title: "RobuxTrade — Магазин робуксов",
    description: "Лучшие цены на рынке. Покупай безопасно через Gamepass.",
    url: "https://rbtrade.org",
    siteName: "RobuxTrade",
    images: [
      {
        url: "https://rbtrade.org/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?59"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
