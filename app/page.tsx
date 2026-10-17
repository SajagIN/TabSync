"use client"

import { SettingsControls } from "@/components/settings-controls"
import { PreviewPanel } from "@/components/preview-panel"
import { StatusLine } from "@/components/status-line"
import { DebugPanel } from "@/components/debug-panel"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 max-w-5xl mx-auto">
      <header className="w-full flex flex-col gap-2 border-b pb-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">TabSync</h1>
          <StatusLine />
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time browser tab settings synchronization using CRDT last-writer-wins registers.
        </p>
      </header>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <section aria-label="Settings Controls">
          <SettingsControls />
        </section>
        <section aria-label="Live Preview">
          <PreviewPanel />
        </section>
      </div>

      <footer className="w-full flex flex-col gap-4 border-t pt-6 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>TabSync v1.0 • HLC Protocol Active</span>
          <DebugPanel />
        </div>
      </footer>
    </main>
  )
}
