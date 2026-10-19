import { AlertTriangle, Radio, Save, Users } from "lucide-react"
import type { SyncStatus } from "@/lib/tabsync/types"
import type { Messages } from "@/lib/i18n/dictionaries"

interface StatusLineProps {
  status: SyncStatus
  messages: Messages
}

export function StatusLine({ status, messages }: StatusLineProps) {
  const transportLabel =
    status.transport === "broadcast"
      ? "BroadcastChannel"
      : status.transport === "storage"
        ? "Storage events"
        : messages.noTransport

  return (
    <section className="status-card" aria-labelledby="status-title">
      <div className="status-heading">
        <div className={`status-indicator ${status.transport === "none" ? "is-offline" : ""}`} />
        <h2 id="status-title">{messages.statusTitle}</h2>
        <span className="status-caption" role="status" aria-live="polite">
          {status.transport === "none" ? messages.noTransport : messages.connected}
        </span>
      </div>

      <dl className="status-metrics">
        <div className="status-metric">
          <dt>
            <Radio size={14} aria-hidden="true" />
            {messages.transport}
          </dt>
          <dd>{transportLabel}</dd>
        </div>
        <div className="status-metric">
          <dt>
            <Save size={14} aria-hidden="true" />
            {messages.persistence}
          </dt>
          <dd className={status.persistence === "ok" ? "metric-good" : "metric-warn"}>
            {status.persistence === "ok" ? messages.saved : messages.degraded}
          </dd>
        </div>
        <div className="status-metric">
          <dt>
            <Users size={14} aria-hidden="true" />
            {messages.peers}
          </dt>
          <dd>{status.transport === "broadcast" ? status.peers : "—"}</dd>
        </div>
      </dl>

      {status.persistence === "degraded" && (
        <p className="status-alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {status.transport === "none"
              ? messages.unavailableCopy
              : status.lastError || messages.degradedCopy}
          </span>
        </p>
      )}
      {status.transport === "broadcast" && status.peers === 0 && (
        <p className="status-note">{messages.noPeers}</p>
      )}
      {status.transport === "storage" && <p className="status-note">{messages.storageTransport}</p>}
    </section>
  )
}
