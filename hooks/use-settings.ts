import { useSyncExternalStore } from "react"
import { createSettingsStore } from "@/lib/tabsync/store"
import type { FieldName, FieldValueMap, SettingsStore } from "@/lib/tabsync/types"

// Singleton store instance for the app
let globalStore: SettingsStore | null = null

export function getSettingsStore(): SettingsStore {
  if (!globalStore) {
    globalStore = createSettingsStore()
  }
  return globalStore
}

export function useSettings() {
  const store = getSettingsStore()
  const state = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getState(),
    () => store.getState(),
  )

  const status = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getStatus(),
    () => store.getStatus(),
  )

  const log = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getLog(),
    () => store.getLog(),
  )

  return {
    state,
    status,
    log,
    setField: <F extends FieldName>(field: F, value: FieldValueMap[F]) => store.setField(field, value),
    resetDefaults: () => store.resetDefaults(),
  }
}
