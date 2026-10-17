// ─── Field definitions ───────────────────────────────────────────

export type FieldName = "theme" | "language" | "fontSize"

export interface FieldValueMap {
  theme: "light" | "dark"
  language: "en" | "hi" | "ta"
  fontSize: number // 14–24, step 1
}

/** Domain constraints for validation */
export const FieldDomain: {
  readonly [F in FieldName]: F extends "fontSize"
    ? { readonly min: number; readonly max: number; readonly step: number }
    : { readonly values: readonly FieldValueMap[F][] }
} = {
  theme: { values: ["light", "dark"] as const },
  language: { values: ["en", "hi", "ta"] as const },
  fontSize: { min: 14, max: 24, step: 1 },
} as const

export const FIELD_NAMES: readonly FieldName[] = ["theme", "language", "fontSize"] as const

export const DEFAULTS: { readonly [F in FieldName]: FieldValueMap[F] } = {
  theme: "light",
  language: "en",
  fontSize: 16,
} as const

// ─── CRDT versioning ─────────────────────────────────────────────

export interface Version {
  wallMs: number
  counter: number
  actorId: string
}

export interface Register<F extends FieldName = FieldName> {
  field: F
  value: FieldValueMap[F]
  version: Version
}

export interface SettingsState {
  theme: Register<"theme">
  language: Register<"language">
  fontSize: Register<"fontSize">
}

// ─── Sync status & events ────────────────────────────────────────

export interface SyncStatus {
  transport: "broadcast" | "storage" | "none"
  persistence: "ok" | "degraded"
  peers: number
  lastError: string | null
}

export type SyncEventKind = "local" | "remote" | "merge" | "rejected" | "lifecycle"

export interface SyncEvent {
  at: number
  kind: SyncEventKind
  field?: FieldName
  version?: Version
  detail?: string
}

// ─── Envelope (wire protocol) ────────────────────────────────────

export type EnvelopeType = "HELLO" | "STATE" | "UPDATE" | "PING"

export interface Envelope {
  proto: 1
  t: EnvelopeType
  from: string
  msgId: string
  state?: unknown
  register?: unknown
}

// ─── Dependencies / interfaces ───────────────────────────────────

export interface Clock {
  tick(): Version
  observe(remote: Version): void
  now(): number
}

export interface Transport {
  send(envelope: Envelope): void
  subscribe(handler: (envelope: Envelope) => void): () => void
  dispose(): void
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface TestHooks {
  skipBroadcast?: boolean
  onMerge?: (field: FieldName, winner: "local" | "remote") => void
  onReject?: (reason: string) => void
}

export interface StoreDeps {
  clock: Clock
  storage: StorageLike
  actorId: string
  transport?: Transport
  now?: () => number
  testMode?: TestHooks
}

export interface SettingsStore {
  getState(): SettingsState
  subscribe(listener: () => void): () => void
  setField<F extends FieldName>(field: F, value: FieldValueMap[F]): void
  resetDefaults(): void
  getStatus(): SyncStatus
  getLog(): readonly SyncEvent[]
  dispose(): void
}

// ─── Storage key convention ──────────────────────────────────────

export const STORAGE_PREFIX = "tabsync:v1:register:" as const
export const storageKey = (field: FieldName): string => `${STORAGE_PREFIX}${field}`
