"use client"

import { useEffect, useState } from "react"
import SettingsForm from "./settings-form"
import { getAdminSettings, type AdminSettings } from "@/lib/settings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getAdminSettings()
        if (!cancelled) {
          setSettings(data)
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить настройки")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Настройки</CardTitle>
            <CardDescription>Загружаем текущие настройки магазина.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Пожалуйста, подождите...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Настройки</CardTitle>
            <CardDescription>Ошибка загрузки настроек.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">
              {error || "Не удалось загрузить настройки магазина."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <SettingsForm settings={settings} />
}
