"use client"

import { useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { getDictionary } from "@/lib/i18n/dictionaries"

export function DebugPanel() {
  const [open, setOpen] = useState(false)
  const { state, status, log } = useSettings()
  const dict = getDictionary(state.language.value)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-lg border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground shadow-sm hover:bg-muted transition-colors"
      >
        Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[60vh] overflow-auto rounded-xl border bg-card p-4 text-card-foreground shadow-lg">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <h4 className="text-sm font-semibold font-mono">{dict.log}</h4>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="mb-3 space-y-1 rounded border bg-background p-2 text-xs font-mono">
        <div>transport: {status.transport}</div>
        <div>persistence: {status.persistence}</div>
        <div>peers: {status.peers}</div>
        {status.lastError && <div className="text-destructive">error: {status.lastError}</div>}
      </div>

      <div className="mb-3 space-y-1 rounded border bg-background p-2 text-xs font-mono">
        <div>theme: {state.theme.value} (v{state.theme.version.wallMs}:{state.theme.version.counter})</div>
        <div>language: {state.language.value} (v{state.language.version.wallMs}:{state.language.version.counter})</div>
        <div>fontSize: {state.fontSize.value} (v{state.fontSize.version.wallMs}:{state.fontSize.version.counter})</div>
      </div>

      <div className="space-y-1">
        {log.slice(0, 20).map((event, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs font-mono text-muted-foreground">
            <span className={`font-medium ${
              event.kind === "rejected" ? "text-destructive" :
              event.kind === "merge" ? "text-amber-500" :
              event.kind === "remote" ? "text-blue-500" :
              event.kind === "local" ? "text-emerald-500" :
              ""
            }`}>
              {event.kind}
            </span>
            {event.field && <span>{event.field}</span>}
            {event.detail && <span className="truncate">{event.detail}</span>}
          </div>
        ))}
        {log.length === 0 && <div className="text-xs text-muted-foreground italic">No events yet</div>}
      </div>
    </div>
  )
}
