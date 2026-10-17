"use client"

import { useSettings } from "@/hooks/use-settings"
import { getDictionary } from "@/lib/i18n/dictionaries"

export function PreviewPanel() {
  const { state } = useSettings()
  const dict = getDictionary(state.language.value)

  return (
    <div
      className="flex flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all"
      style={{ fontSize: `${state.fontSize.value}px` }}
    >
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-lg font-semibold">{dict.title}</h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {dict.theme}: {state.theme.value.toUpperCase()} | {dict.language}: {state.language.value.toUpperCase()} | {dict.fontSize}: {state.fontSize.value}px
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          This preview reflects real-time synchronization across browser tabs using CRDT LWW-Registers and Hybrid Logical Clocks.
        </p>

        <div className="flex gap-4">
          <div className="flex-1 rounded-lg border p-4 bg-background">
            <h4 className="font-semibold mb-1">Sample Card</h4>
            <p className="text-sm text-muted-foreground">Changes made in any other tab instantly synchronize here.</p>
          </div>
          <div className="flex-1 rounded-lg border p-4 bg-background">
            <h4 className="font-semibold mb-1">Metrics</h4>
            <p className="text-sm text-muted-foreground">Zero server latency. Decentralized peer-to-peer sync.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
