import { useSyncExternalStore } from "react"
import { createSettingsStore } from "@/lib/tabsync/store"
import { DEFAULTS } from "@/lib/tabsync/types"
import type { SettingsSnapshot, SettingsState } from "@/lib/tabsync/types"

const serverVersion = Object.freeze({ wallMs: 0, counter: 0, actorId: "default" })
const serverState = Object.freeze({
  theme: Object.freeze({ v: 1, field: "theme", value: DEFAULTS.theme, version: serverVersion }),
  language: Object.freeze({
    v: 1,
    field: "language",
    value: DEFAULTS.language,
    version: serverVersion,
  }),
  fontSize: Object.freeze({
    v: 1,
    field: "fontSize",
    value: DEFAULTS.fontSize,
    version: serverVersion,
  }),
}) as SettingsState
const serverSnapshot: SettingsSnapshot = Object.freeze({
  state: serverState,
  status: Object.freeze({
    transport: "broadcast",
    persistence: "ok",
    peers: 0,
    lastError: null,
    restoredRecords: 0,
    rejectedRecords: 0,
  }),
  log: Object.freeze([]),
  actorId: "server",
})

function getServerSnapshot(): SettingsSnapshot {
  return serverSnapshot
}

let globalStore: ReturnType<typeof createSettingsStore> | null =
  typeof window === "undefined" ? null : createSettingsStore()

function getSettingsStore() {
  if (!globalStore) globalStore = createSettingsStore()
  return globalStore
}

export function useSettings() {
  const store = getSettingsStore()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)

  return {
    ...snapshot,
    setField: store.setField,
    resetDefaults: store.resetDefaults,
    flushPending: store.flushPending,
    reconcile: store.reconcile,
  }
}
