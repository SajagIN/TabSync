"use client"

import { useSettings } from "@/hooks/use-settings"
import { getDictionary } from "@/lib/i18n/dictionaries"

export function StatusLine() {
  const { state, status } = useSettings()
  const dict = getDictionary(state.language.value)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-6 py-4 text-card-foreground shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${status.persistence === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
        <span className="text-sm font-medium">
          {dict.status}: {status.persistence === "ok" ? "Synchronized" : "Degraded"}
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div>
          {dict.transport}: <span className="font-medium text-foreground capitalize">{status.transport}</span>
        </div>
        <div>
          {dict.peers}: <span className="font-medium text-foreground">{status.peers}</span>
        </div>
      </div>
    </div>
  )
}
