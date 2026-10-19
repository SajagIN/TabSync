"use client"

import { useState, type KeyboardEvent } from "react"
import { Clipboard, ChevronDown } from "lucide-react"
import type { SettingsSnapshot, FieldName } from "@/lib/tabsync/types"
import type { Messages } from "@/lib/i18n/dictionaries"

interface DebugPanelProps {
  snapshot: SettingsSnapshot
  messages: Messages
  onToggleTransport: () => void
}

type DebugTab = "state" | "versions" | "log"

const fieldOrder: FieldName[] = ["theme", "language", "fontSize"]
const tabOrder: DebugTab[] = ["state", "versions", "log"]

function eventLabel(kind: string, messages: Messages): string {
  switch (kind) {
    case "local":
      return messages.debugLocal
    case "remote":
      return messages.debugRemote
    case "rejected":
      return messages.debugRejected
    case "merge":
      return messages.debugMerge
    default:
      return messages.debugLifecycle
  }
}

export function DebugPanel({ snapshot, messages, onToggleTransport }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<DebugTab>("state")
  const [copied, setCopied] = useState(false)

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: DebugTab) {
    const index = tabOrder.indexOf(tab)
    let nextIndex = index
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabOrder.length
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabOrder.length) % tabOrder.length
    else if (event.key === "Home") nextIndex = 0
    else if (event.key === "End") nextIndex = tabOrder.length - 1
    else return

    event.preventDefault()
    const nextTab = tabOrder[nextIndex]!
    setActiveTab(nextTab)
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#debug-tab-${nextTab}`)
      ?.focus()
  }

  async function copyState() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot.state, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <details className="debug-panel">
      <summary>
        <span>{messages.debugTitle}</span>
        <span className="debug-summary-right">
          <span className="debug-summary-closed">{messages.debugOpen}</span>
          <span className="debug-summary-open">{messages.close}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </span>
      </summary>
      <div className="debug-content">
        <div className="debug-toolbar">
          <div className="debug-tabs" role="tablist" aria-label={messages.debugTitle}>
            {tabOrder.map((tab) => (
              <button
                key={tab}
                id={`debug-tab-${tab}`}
                type="button"
                role="tab"
                tabIndex={activeTab === tab ? 0 : -1}
                aria-controls="debug-tabpanel"
                aria-selected={activeTab === tab}
                className="debug-tab"
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
              >
                {tab === "state"
                  ? messages.debugState
                  : tab === "versions"
                    ? messages.debugVersions
                    : messages.debugLog}
              </button>
            ))}
          </div>
          <div className="debug-actions">
            <button className="small-button" type="button" onClick={onToggleTransport}>
              {snapshot.status.transport === "storage"
                ? messages.useBroadcast
                : messages.useStorage}
            </button>
            <span className="debug-actor">
              {messages.debugActor} <code>{snapshot.actorId.slice(0, 8)}</code>
            </span>
          </div>
        </div>

        {activeTab === "state" && (
          <div
            id="debug-tabpanel"
            className="debug-pane"
            role="tabpanel"
            aria-labelledby={`debug-tab-${activeTab}`}
          >
            <div className="debug-pane-heading">
              <span>{messages.currentValue}</span>
              <button className="small-button" type="button" onClick={copyState}>
                <Clipboard size={14} aria-hidden="true" />
                {copied ? messages.debugCopied : messages.debugCopy}
              </button>
            </div>
            <pre className="json-block">{JSON.stringify(snapshot.state, null, 2)}</pre>
            <p className="debug-footnote">
              {snapshot.status.restoredRecords} {messages.debugRestored} ·{" "}
              {snapshot.status.rejectedRecords} {messages.debugSkipped}
            </p>
          </div>
        )}

        {activeTab === "versions" && (
          <div
            id="debug-tabpanel"
            className="debug-pane"
            role="tabpanel"
            aria-labelledby={`debug-tab-${activeTab}`}
          >
            <div className="version-table" role="table" aria-label={messages.debugVersions}>
              <div className="version-row version-head" role="row">
                <span role="columnheader">{messages.debugField}</span>
                <span role="columnheader">{messages.debugClock}</span>
                <span role="columnheader">{messages.debugDirection}</span>
              </div>
              {fieldOrder.map((field) => {
                const version = snapshot.state[field].version
                const lastUpdate = snapshot.log.find(
                  (event) => event.field === field && event.direction,
                )
                const lastRemote = snapshot.log.find(
                  (event) =>
                    event.field === field &&
                    event.direction === "inbound" &&
                    event.latencyMs !== undefined,
                )
                const directionLabel =
                  lastUpdate?.direction === "outbound"
                    ? messages.debugSent
                    : lastUpdate?.direction === "inbound"
                      ? messages.debugReceived
                      : lastUpdate?.direction === "restored"
                        ? messages.debugRestoredDirection
                        : messages.debugNoUpdate
                const latencyLabel =
                  lastRemote?.latencyMs !== undefined
                    ? `${messages.debugLatency}: ${new Intl.NumberFormat(snapshot.state.language.value, { maximumFractionDigits: 1 }).format(lastRemote.latencyMs)} ms`
                    : "—"
                return (
                  <div className="version-row" role="row" key={field}>
                    <span role="cell" className="mono">
                      {field}
                    </span>
                    <code role="cell" className="mono version-value">
                      {version.wallMs} · {version.counter} · {version.actorId.slice(0, 8)}
                    </code>
                    <span role="cell" className="version-update">
                      <span>{directionLabel}</span>
                      <span>{latencyLabel}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div
            id="debug-tabpanel"
            className="debug-pane"
            role="tabpanel"
            aria-labelledby={`debug-tab-${activeTab}`}
          >
            {snapshot.log.length === 0 ? (
              <p className="debug-empty">{messages.debugEmpty}</p>
            ) : (
              <ol className="event-list">
                {snapshot.log.slice(0, 30).map((event) => (
                  <li className="event-item" key={event.id}>
                    <span className={`event-kind event-${event.kind}`}>
                      {eventLabel(event.kind, messages)}
                    </span>
                    {event.field && <code className="mono">{event.field}</code>}
                    {event.detail && <span className="event-detail">{event.detail}</span>}
                    <time className="event-time">{new Date(event.at).toLocaleTimeString()}</time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
