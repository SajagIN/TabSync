export const FIELD_NAMES = ["theme", "language", "fontSize"] as const

export type FieldName = (typeof FIELD_NAMES)[number]
export type Theme = "light" | "dark"
export type Language = "en" | "hi" | "ta"

export interface FieldValueMap {
  theme: Theme
  language: Language
  fontSize: number
}

export const DEFAULTS: Readonly<FieldValueMap> = Object.freeze({
  theme: "light",
  language: "en",
  fontSize: 16,
})

export interface Version {
  wallMs: number
  counter: number
  actorId: string
}

export interface Register<F extends FieldName> {
  v: 1
  field: F
  value: FieldValueMap[F]
  version: Version
}

export type AnyRegister = {
  [F in FieldName]: Register<F>
}[FieldName]

export interface SettingsState {
  theme: Register<"theme">
  language: Register<"language">
  fontSize: Register<"fontSize">
}

export type TransportMode = "broadcast" | "storage" | "none"
export type PersistenceMode = "ok" | "degraded"
export type SyncEventKind = "local" | "remote" | "merge" | "rejected" | "lifecycle"

export interface SyncEvent {
  id: string
  at: number
  kind: SyncEventKind
  field?: FieldName
  version?: Version
  direction?: "outbound" | "inbound" | "restored"
  latencyMs?: number
  detail?: string
}

export interface SyncStatus {
  transport: TransportMode
  persistence: PersistenceMode
  peers: number
  lastError: string | null
  restoredRecords: number
  rejectedRecords: number
}

export interface SettingsSnapshot {
  state: SettingsState
  status: SyncStatus
  log: readonly SyncEvent[]
  actorId: string
}

interface EnvelopeBase {
  proto: 1
  from: string
  msgId: string
  sentAt?: number
}

export type Envelope =
  | (EnvelopeBase & { type: "HELLO" | "PING" })
  | (EnvelopeBase & { type: "STATE"; records: unknown })
  | (EnvelopeBase & { type: "UPDATE"; record: unknown })

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SyncTransport {
  getMode(): TransportMode
  send(message: Envelope): void
  subscribe(handler: (message: unknown) => void): () => void
  dispose(): void
}

export interface SettingsStore {
  getSnapshot(): SettingsSnapshot
  subscribe(listener: () => void): () => void
  setField<F extends FieldName>(field: F, value: FieldValueMap[F]): void
  resetDefaults(): void
  flushPending(): void
  reconcile(): void
  dispose(): void
}

export interface StoreDependencies {
  actorId?: string
  storage?: StorageLike | null
  transport?: SyncTransport
  now?: () => number
}
