import type { Envelope, Transport } from "./types"

const CHANNEL_NAME = "tabsync:v1"
const RING_SIZE = 200

export class BroadcastTransport implements Transport {
  private channel: BroadcastChannel | null = null
  private handler: ((envelope: Envelope) => void) | null = null
  private seenMsgIds = new Set<string>()
  private msgIdRing: string[] = []
  private storageHandler: ((e: StorageEvent) => void) | null = null
  private storageKeyPrefix = "tabsync:v1:msg:"

  constructor() {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME)
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data)
        }
      } catch {
        this.channel = null
      }
    }

    // Fallback or secondary via localStorage storage events
    if (typeof window !== "undefined") {
      this.storageHandler = (e: StorageEvent) => {
        if (!e.key || !e.key.startsWith(this.storageKeyPrefix) || !e.newValue) return
        try {
          const envelope = JSON.parse(e.newValue)
          this.handleIncoming(envelope)
        } catch {
          // ignore parse errors
        }
      }
      window.addEventListener("storage", this.storageHandler)
    }
  }

  send(envelope: Envelope): void {
    this.rememberMsgId(envelope.msgId)

    if (this.channel) {
      try {
        this.channel.postMessage(envelope)
      } catch {
        // BroadcastChannel failed, use storage fallback
      }
    }

    // Also write to localStorage for storage event fallback
    if (typeof window !== "undefined") {
      try {
        const key = `${this.storageKeyPrefix}${Date.now()}_${Math.random()}`
        localStorage.setItem(key, JSON.stringify(envelope))
        setTimeout(() => {
          try {
            localStorage.removeItem(key)
          } catch {
            // ignore
          }
        }, 1000)
      } catch {
        // storage full or disabled
      }
    }
  }

  subscribe(handler: (envelope: Envelope) => void): () => void {
    this.handler = handler
    return () => {
      this.handler = null
    }
  }

  dispose(): void {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    if (typeof window !== "undefined" && this.storageHandler) {
      window.removeEventListener("storage", this.storageHandler)
      this.storageHandler = null
    }
    this.handler = null
    this.seenMsgIds.clear()
    this.msgIdRing = []
  }

  private handleIncoming(data: unknown): void {
    if (!data || typeof data !== "object") return
    const env = data as Envelope
    if (env.proto !== 1 || !env.msgId || !env.from) return

    if (this.seenMsgIds.has(env.msgId)) return
    this.rememberMsgId(env.msgId)

    if (this.handler) {
      this.handler(env)
    }
  }

  private rememberMsgId(msgId: string): void {
    if (this.seenMsgIds.has(msgId)) return
    this.seenMsgIds.add(msgId)
    this.msgIdRing.push(msgId)
    if (this.msgIdRing.length > RING_SIZE) {
      const oldest = this.msgIdRing.shift()
      if (oldest) {
        this.seenMsgIds.delete(oldest)
      }
    }
  }
}
