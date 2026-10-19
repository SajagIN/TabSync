import { STORAGE_PREFIX } from "./storage"
import type { Envelope, SyncTransport, TransportMode } from "./types"

const CHANNEL_NAME = "tabsync:v1"

function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const envelope = value as Record<string, unknown>
  return (
    envelope["proto"] === 1 &&
    typeof envelope["type"] === "string" &&
    ["HELLO", "PING", "STATE", "UPDATE"].includes(envelope["type"]) &&
    typeof envelope["from"] === "string" &&
    typeof envelope["msgId"] === "string"
  )
}

export class BrowserTransport implements SyncTransport {
  private mode: TransportMode = "none"
  private channel: BroadcastChannel | null = null
  private handler: ((message: unknown) => void) | null = null
  private storageListener: ((event: StorageEvent) => void) | null = null
  private readonly storageAvailable: boolean

  constructor(storageAvailable: boolean) {
    this.storageAvailable = storageAvailable
    if (typeof window === "undefined") return

    const forcedStorage = new URLSearchParams(window.location.search).get("transport") === "storage"
    if (!forcedStorage && typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME)
        this.channel.onmessage = (event: MessageEvent<unknown>) => this.receive(event.data)
        this.mode = "broadcast"
      } catch {
        this.channel = null
      }
    }

    if (this.mode === "none") this.mode = storageAvailable ? "storage" : "none"

    this.storageListener = (event) => {
      if (!event.key?.startsWith(STORAGE_PREFIX) || !event.newValue) return
      try {
        const record: unknown = JSON.parse(event.newValue)
        const actorId = event.key.slice(event.key.lastIndexOf(":") + 1)
        const envelope: Envelope = {
          proto: 1,
          type: "UPDATE",
          from: actorId,
          msgId: `storage:${event.key}:${event.newValue}`,
          record,
        }
        this.receive(envelope)
      } catch {
        // The store records invalid durable data during its next reconciliation.
      }
    }
    window.addEventListener("storage", this.storageListener)
  }

  getMode(): TransportMode {
    return this.mode
  }

  send(message: Envelope): void {
    if (!this.channel || this.mode !== "broadcast") return
    try {
      this.channel.postMessage(message)
    } catch {
      this.channel.close()
      this.channel = null
      this.mode = this.storageAvailable ? "storage" : "none"
    }
  }

  subscribe(handler: (message: unknown) => void): () => void {
    this.handler = handler
    return () => {
      if (this.handler === handler) this.handler = null
    }
  }

  dispose(): void {
    this.channel?.close()
    this.channel = null
    if (typeof window !== "undefined" && this.storageListener) {
      window.removeEventListener("storage", this.storageListener)
    }
    this.storageListener = null
    this.handler = null
  }

  private receive(value: unknown): void {
    if (!isEnvelope(value)) return
    this.handler?.(value)
  }
}
