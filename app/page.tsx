"use client"

import Link from "next/link"
import { useEffect } from "react"
import { ArrowUpRight, Radio } from "lucide-react"
import { DebugPanel } from "@/components/debug-panel"
import { PreviewPanel } from "@/components/preview-panel"
import { SettingsControls } from "@/components/settings-controls"
import { StatusLine } from "@/components/status-line"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { useSettings } from "@/hooks/use-settings"

interface WindowWithBootstrap extends Window {
  __tabsyncBootstrapApplied?: boolean
}

function applyDocumentSettings(theme: string, language: string, fontSize: number): void {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
  root.lang = language
  root.style.setProperty("--tabsync-font-size", `${fontSize}px`)
}

export default function Home() {
  const { state, status, log, actorId, setField, resetDefaults, flushPending } = useSettings()
  const messages = getDictionary(state.language.value)

  useEffect(() => {
    // The inline head script already applied saved values before first paint.
    // Do not overwrite them with the deterministic server snapshot during hydration.
    if (actorId === "server" && (window as WindowWithBootstrap).__tabsyncBootstrapApplied) {
      return
    }
    applyDocumentSettings(state.theme.value, state.language.value, state.fontSize.value)
  }, [actorId, state.theme.value, state.language.value, state.fontSize.value])

  function openAnotherTab() {
    window.open(window.location.href, "_blank", "noopener,noreferrer")
  }

  function toggleTransport() {
    const url = new URL(window.location.href)
    if (url.searchParams.get("transport") === "storage") url.searchParams.delete("transport")
    else url.searchParams.set("transport", "storage")
    window.location.assign(url.toString())
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label={messages.product}>
          <span className="brand-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>{messages.product}</span>
        </Link>
        <button className="open-tab-button" type="button" onClick={openAnotherTab}>
          <span>{messages.openTab}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              {messages.eyebrow}
            </p>
            <h1>{messages.headline}</h1>
            <p className="hero-description">{messages.description}</p>
          </div>
          <div className="hero-status">
            <span
              className={`hero-status-dot ${status.transport === "none" ? "is-offline" : ""}`}
            />
            <span>{status.transport === "none" ? messages.noTransport : messages.connected}</span>
            <Radio size={15} aria-hidden="true" />
          </div>
        </section>

        <div className="workspace-grid">
          <SettingsControls
            state={state}
            messages={messages}
            onChange={setField}
            onReset={resetDefaults}
            onCommit={flushPending}
          />
          <div className="right-column">
            <StatusLine status={status} messages={messages} />
            <PreviewPanel state={state} messages={messages} />
          </div>
        </div>

        <DebugPanel
          snapshot={{ state, status, log, actorId }}
          messages={messages}
          onToggleTransport={toggleTransport}
        />
      </main>

      <footer className="site-footer">
        <span>
          TabSync <span className="footer-separator">/</span> {messages.footerDescription}
        </span>
        <span className="footer-right">{messages.footerNote}</span>
      </footer>
    </div>
  )
}
