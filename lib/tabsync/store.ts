import { mergeRegister } from "./merge"
import { getBrowserStorage, readRegisters, saveOwnRegister } from "./storage"
import { BrowserTransport } from "./transport"
import {
  DEFAULTS,
  FIELD_NAMES,
  type AnyRegister,
  type Envelope,
  type FieldName,
  type FieldValueMap,
  type Register,
  type SettingsSnapshot,
  type SettingsState,
  type SettingsStore,
  type StoreDependencies,
  type SyncEvent,
  type SyncStatus,
  type Version,
} from "./types"
import { isFieldName, isFieldValue, validateRecord } from "./validation"
import { createHybridClock } from "./version"

const MAX_LOG_SIZE = 200
const MESSAGE_RING_SIZE = 200
const PEER_TIMEOUT_MS = 15_000
const HEARTBEAT_MS = 5_000
const DEFAULT_VERSION: Version = Object.freeze({ wallMs: 0, counter: 0, actorId: "default" })

type OutgoingMessage =
  | { type: "HELLO" | "PING" }
  | { type: "STATE"; records: unknown }
  | { type: "UPDATE"; record: unknown }

function createActorId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replaceAll("-", "_")
    }
  } catch {
    // Use the fallback below if secure randomness is unavailable.
  }
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function defaultState(): SettingsState {
  return {
    theme: { v: 1, field: "theme", value: DEFAULTS.theme, version: { ...DEFAULT_VERSION } },
    language: {
      v: 1,
      field: "language",
      value: DEFAULTS.language,
      version: { ...DEFAULT_VERSION },
    },
    fontSize: {
      v: 1,
      field: "fontSize",
      value: DEFAULTS.fontSize,
      version: { ...DEFAULT_VERSION },
    },
  }
}

function cloneRegister<F extends FieldName>(register: Register<F>): Register<F> {
  return Object.freeze({
    ...register,
    version: Object.freeze({ ...register.version }),
  }) as Register<F>
}

function freezeState(state: SettingsState): SettingsState {
  return Object.freeze({
    theme: cloneRegister(state.theme),
    language: cloneRegister(state.language),
    fontSize: cloneRegister(state.fontSize),
  }) as SettingsState
}

function registers(state: SettingsState): AnyRegister[] {
  return [state.theme, state.language, state.fontSize]
}

function absoluteNow(): number {
  if (typeof performance !== "undefined" && Number.isFinite(performance.timeOrigin)) {
    return performance.timeOrigin + performance.now()
  }
  return Date.now()
}

function makeMessageId(actorId: string, sequence: number): string {
  return `${actorId}:${Date.now().toString(36)}:${sequence.toString(36)}`
}

export function createSettingsStore(deps: StoreDependencies = {}): SettingsStore {
  const actorId = deps.actorId ?? createActorId()
  const now = deps.now ?? absoluteNow
  const storage = deps.storage === undefined ? getBrowserStorage() : deps.storage
  const transport = deps.transport ?? new BrowserTransport(storage !== null)
  const clock = createHybridClock(actorId, now)
  const listeners = new Set<() => void>()
  const log: SyncEvent[] = []
  const peers = new Map<string, number>()
  const seenMessages = new Set<string>()
  const messageRing: string[] = []
  let sequence = 0
  let eventSequence = 0
  let pendingFontRegister: AnyRegister | null = null
  let pendingFontFrame: number | null = null
  const state = defaultState()
  let rejectedRecords = 0
  let restoredRecords = 0
  let lastError: string | null = null
  let persistence: SyncStatus["persistence"] = storage ? "ok" : "degraded"
  let unsubscribeTransport = () => {}

  function status(): SyncStatus {
    return {
      transport: transport.getMode(),
      persistence,
      peers: [...peers.values()].filter((seenAt) => now() - seenAt < PEER_TIMEOUT_MS).length,
      lastError,
      restoredRecords,
      rejectedRecords,
    }
  }

  function snapshotStatus(): SyncStatus {
    return Object.freeze(status()) as SyncStatus
  }

  function createSnapshot(): SettingsSnapshot {
    return Object.freeze({
      state: freezeState(state),
      status: snapshotStatus(),
      log: Object.freeze(log.slice()),
      actorId,
    })
  }

  let snapshot = createSnapshot()

  function appendLog(event: Omit<SyncEvent, "id" | "at">): void {
    const item: SyncEvent = Object.freeze({
      ...event,
      ...(event.version ? { version: Object.freeze({ ...event.version }) } : {}),
      id: `${actorId}:event:${eventSequence++}`,
      at: now(),
    })
    log.unshift(item)
    if (log.length > MAX_LOG_SIZE) log.length = MAX_LOG_SIZE
  }

  function notify(): void {
    snapshot = createSnapshot()
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // One broken subscriber must not block the rest of the store.
      }
    }
  }

  function nextMessageId(): string {
    sequence += 1
    return makeMessageId(actorId, sequence)
  }

  function rememberMessage(id: string): boolean {
    if (seenMessages.has(id)) return false
    seenMessages.add(id)
    messageRing.push(id)
    if (messageRing.length > MESSAGE_RING_SIZE) {
      const oldest = messageRing.shift()
      if (oldest) seenMessages.delete(oldest)
    }
    return true
  }

  function setRegister(register: AnyRegister): void {
    switch (register.field) {
      case "theme":
        state.theme = register
        break
      case "language":
        state.language = register
        break
      case "fontSize":
        state.fontSize = register
        break
    }
  }

  function reject(reason: string, field?: FieldName): void {
    rejectedRecords += 1
    appendLog({ kind: "rejected", field, detail: reason })
    notify()
  }

  function applyRegister(
    raw: unknown,
    source: "local" | "remote",
    sender?: string,
    sentAt?: number,
  ): boolean {
    const validation = validateRecord(raw)
    if (!validation.success) {
      reject(validation.reason)
      return false
    }

    const incoming = validation.record
    if (sender && sender !== "storage-event" && incoming.version.actorId !== sender) {
      reject("Sender does not match register actor.", incoming.field)
      return false
    }

    clock.observe(incoming.version)
    const current = state[incoming.field] as AnyRegister
    const result = mergeRegister(current, incoming)

    if (result.conflict) {
      appendLog({
        kind: "merge",
        field: incoming.field,
        version: incoming.version,
        direction: "inbound",
        ...(sentAt !== undefined ? { latencyMs: Math.max(0, now() - sentAt) } : {}),
        detail: "Equal version with a different value; kept the current value.",
      })
      notify()
      return false
    }
    if (!result.changed) return false

    setRegister(result.register)
    appendLog({
      kind: source,
      field: incoming.field,
      version: incoming.version,
      ...(source === "remote"
        ? { direction: "inbound" as const }
        : { direction: "outbound" as const }),
      ...(sentAt !== undefined ? { latencyMs: Math.max(0, now() - sentAt) } : {}),
    })
    notify()
    return true
  }

  function publish(message: Envelope): void {
    const previousMode = transport.getMode()
    try {
      transport.send(message)
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Live sync is unavailable."
    }
    if (transport.getMode() !== previousMode || lastError) notify()
  }

  function makeEnvelope(message: OutgoingMessage): Envelope {
    return {
      proto: 1,
      ...message,
      from: actorId,
      msgId: nextMessageId(),
      sentAt: now(),
    } as Envelope
  }

  function publishUpdate(register: AnyRegister): void {
    publish(makeEnvelope({ type: "UPDATE", record: register }))
  }

  function flushPending(): void {
    const register = pendingFontRegister
    pendingFontRegister = null
    if (pendingFontFrame !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(pendingFontFrame)
      pendingFontFrame = null
    }
    if (register) publishUpdate(register)
  }

  function scheduleUpdate(register: AnyRegister): void {
    if (transport.getMode() !== "broadcast") return
    if (
      register.field !== "fontSize" ||
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      publishUpdate(register)
      return
    }

    pendingFontRegister = register
    if (pendingFontFrame === null) {
      pendingFontFrame = window.requestAnimationFrame(() => {
        pendingFontFrame = null
        const latest = pendingFontRegister
        pendingFontRegister = null
        if (latest) publishUpdate(latest)
      })
    }
  }

  function onMessage(raw: unknown): void {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return
    const message = raw as Record<string, unknown>
    if (
      message["proto"] !== 1 ||
      typeof message["type"] !== "string" ||
      typeof message["from"] !== "string" ||
      typeof message["msgId"] !== "string" ||
      message["from"] === actorId
    ) {
      return
    }

    const from = message["from"]
    const msgId = message["msgId"]
    const sentAt =
      typeof message["sentAt"] === "number" && Number.isFinite(message["sentAt"])
        ? message["sentAt"]
        : undefined
    if (!rememberMessage(msgId)) return

    if (transport.getMode() === "broadcast" && from !== "storage-event") {
      const isNewPeer = !peers.has(from)
      peers.set(from, now())
      if (isNewPeer) notify()
    }

    if (message["type"] === "HELLO") {
      publish(makeEnvelope({ type: "STATE", records: registers(state) }))
      appendLog({ kind: "lifecycle", detail: `Tab connected: ${from.slice(0, 8)}` })
      notify()
      return
    }

    if (message["type"] === "PING") {
      notify()
      return
    }

    if (message["type"] === "UPDATE") {
      applyRegister(
        message["record"],
        "remote",
        from === "storage-event" ? undefined : from,
        sentAt,
      )
      return
    }

    if (message["type"] === "STATE") {
      if (!Array.isArray(message["records"]) || message["records"].length > 3) {
        reject("Invalid state message.")
        return
      }
      for (const record of message["records"]) applyRegister(record, "remote", undefined, sentAt)
    }
  }

  function reconcile(): void {
    if (!storage) return
    const result = readRegisters(storage)
    if (result.error) {
      persistence = "degraded"
      lastError = result.error
      notify()
      return
    }

    let changed = false
    const previousRestored = restoredRecords
    const previousRejected = rejectedRecords
    restoredRecords = result.records.length
    rejectedRecords = Math.max(rejectedRecords, result.rejected)
    if (restoredRecords !== previousRestored || rejectedRecords !== previousRejected) changed = true

    for (const record of result.records) {
      clock.observe(record.version)
      const current = state[record.field] as AnyRegister
      const merged = mergeRegister(current, record)
      if (merged.changed) {
        setRegister(merged.register)
        appendLog({
          kind: "lifecycle",
          field: record.field,
          version: record.version,
          direction: "restored",
          detail: "Reconciled from browser storage.",
        })
        changed = true
      }
    }

    if (rejectedRecords > previousRejected) {
      appendLog({
        kind: "rejected",
        detail: `${rejectedRecords - previousRejected} saved record(s) were skipped.`,
      })
    }
    if (changed) {
      appendLog({ kind: "lifecycle", detail: "State reconciled from saved records." })
      notify()
    }
  }

  function setField<F extends FieldName>(field: F, value: FieldValueMap[F]): void {
    if (!isFieldName(field) || !isFieldValue(field, value)) {
      reject("Invalid local value.", isFieldName(field) ? field : undefined)
      return
    }

    const current = state[field]
    if (current.value === value) return

    const register = {
      v: 1,
      field,
      value,
      version: clock.tick(),
    } as AnyRegister

    setRegister(register)
    if (storage) {
      const saved = saveOwnRegister(storage, actorId, register)
      if (saved.ok) {
        persistence = "ok"
        lastError = null
      } else {
        persistence = "degraded"
        lastError = saved.reason
      }
    } else {
      persistence = "degraded"
      lastError = "Changes are not being saved in this browser."
    }

    appendLog({
      kind: "local",
      field,
      version: register.version,
      ...(transport.getMode() !== "none" ? { direction: "outbound" as const } : {}),
    })
    scheduleUpdate(register)
    notify()
  }

  function resetDefaults(): void {
    for (const field of FIELD_NAMES) {
      switch (field) {
        case "theme":
          setField("theme", DEFAULTS.theme)
          break
        case "language":
          setField("language", DEFAULTS.language)
          break
        case "fontSize":
          setField("fontSize", DEFAULTS.fontSize)
          break
      }
    }
    flushPending()
  }

  if (storage) {
    const loaded = readRegisters(storage)
    if (loaded.error) {
      persistence = "degraded"
      lastError = loaded.error
    } else {
      restoredRecords = loaded.records.length
      rejectedRecords = loaded.rejected
      for (const record of loaded.records) {
        clock.observe(record.version)
        const current = state[record.field] as AnyRegister
        const result = mergeRegister(current, record)
        if (result.changed) {
          setRegister(result.register)
          appendLog({
            kind: "lifecycle",
            field: record.field,
            version: record.version,
            direction: "restored",
            detail: "Restored from browser storage.",
          })
        }
      }
      if (loaded.rejected > 0) {
        appendLog({ kind: "rejected", detail: `${loaded.rejected} saved record(s) were skipped.` })
      }
    }
  } else {
    lastError = "Changes are not being saved in this browser."
  }

  snapshot = createSnapshot()
  unsubscribeTransport = transport.subscribe(onMessage)
  reconcile()
  publish(makeEnvelope({ type: "HELLO" }))

  const lifecycleHandler = () => reconcile()
  const visibilityHandler = () => {
    if (document.visibilityState === "visible") lifecycleHandler()
    else flushPending()
  }
  let heartbeatTimer: number | null = null
  if (typeof window !== "undefined") {
    window.addEventListener("focus", lifecycleHandler)
    window.addEventListener("pageshow", lifecycleHandler)
    window.addEventListener("pagehide", flushPending)
    document.addEventListener("visibilitychange", visibilityHandler)
    if (transport.getMode() === "broadcast") {
      heartbeatTimer = window.setInterval(() => {
        const before = peers.size
        for (const [peerId, seenAt] of peers) {
          if (now() - seenAt >= PEER_TIMEOUT_MS) peers.delete(peerId)
        }
        publish(makeEnvelope({ type: "PING" }))
        if (peers.size !== before) notify()
      }, HEARTBEAT_MS)
    }
  }

  return {
    getSnapshot(): SettingsSnapshot {
      return snapshot
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    setField,
    resetDefaults,
    flushPending,
    reconcile,

    dispose(): void {
      flushPending()
      unsubscribeTransport()
      transport.dispose()
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", lifecycleHandler)
        window.removeEventListener("pageshow", lifecycleHandler)
        window.removeEventListener("pagehide", flushPending)
        document.removeEventListener("visibilitychange", visibilityHandler)
        if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer)
      }
      listeners.clear()
    },
  }
}
