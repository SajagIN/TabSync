import {
  DEFAULTS,
  FIELD_NAMES,
  type FieldName,
  type FieldValueMap,
  type Register,
  type SettingsState,
  type SettingsStore,
  type StoreDeps,
  type StorageLike,
  type SyncEvent,
  type SyncStatus,
  storageKey,
} from "./types"
import { mergeRegister } from "./merge"
import { validateRegister } from "./validation"
import { BroadcastTransport } from "./transport"
import { SafeStorage } from "./storage"
import { createHLC } from "./version"

const MAX_LOG_SIZE = 100

export function createSettingsStore(deps?: Partial<StoreDeps>): SettingsStore {
  const actorId = deps?.actorId ?? `tab_${Math.random().toString(36).substring(2, 9)}`
  const clock = deps?.clock ?? createHLC(actorId, deps?.now)
  const storage = deps?.storage ?? new SafeStorage()
  const transport = deps?.transport ?? new BroadcastTransport()
  const now = deps?.now ?? Date.now
  const testMode = deps?.testMode

  // Initialize state from storage or defaults
  const state: SettingsState = {
    theme: loadRegister("theme", DEFAULTS.theme, actorId, storage, now),
    language: loadRegister("language", DEFAULTS.language, actorId, storage, now),
    fontSize: loadRegister("fontSize", DEFAULTS.fontSize, actorId, storage, now),
  }

  const listeners = new Set<() => void>()
  const log: SyncEvent[] = []
  let peers = 0
  let lastError: string | null = null
  let transportMode: "broadcast" | "storage" | "none" = "broadcast"

  function addEvent(event: Omit<SyncEvent, "at">): void {
    const fullEvent: SyncEvent = { ...event, at: now() }
    log.unshift(fullEvent)
    if (log.length > MAX_LOG_SIZE) {
      log.pop()
    }
  }

  function notify(): void {
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        // ignore listener errors
      }
    }
  }

  // Broadcast HELLO on startup
  try {
    transport.send({
      proto: 1,
      t: "HELLO",
      from: actorId,
      msgId: `${actorId}_${now()}_${Math.random()}`,
      state: {
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
      },
    })
  } catch {
    transportMode = "storage"
  }

  // Subscribe to transport
  const unsubscribeTransport = transport.subscribe((env) => {
    try {
      if (env.from === actorId) return // ignore own messages

      if (env.t === "HELLO") {
        peers += 1
        addEvent({ kind: "lifecycle", detail: `Peer connected: ${env.from}` })
        // Reply with STATE
        transport.send({
          proto: 1,
          t: "STATE",
          from: actorId,
          msgId: `${actorId}_${now()}_${Math.random()}`,
          state: {
            theme: state.theme,
            language: state.language,
            fontSize: state.fontSize,
          },
        })
        notify()
      } else if (env.t === "STATE" || env.t === "UPDATE") {
        if (env.state && typeof env.state === "object") {
          const stateObj = env.state as Record<string, unknown>
          for (const field of ["theme", "language", "fontSize"] as FieldName[]) {
            if (stateObj[field]) {
              processRemoteRegister(field, stateObj[field])
            }
          }
        } else if (env.register) {
          const valRes = validateRegister(env.register)
          if (valRes.success) {
            processRemoteRegister(valRes.register.field, valRes.register)
          } else {
            addEvent({ kind: "rejected", detail: valRes.reason })
            if (testMode?.onReject) testMode.onReject(valRes.reason)
          }
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      addEvent({ kind: "lifecycle", detail: `Transport error: ${lastError}` })
    }
  })

  function processRemoteRegister(field: FieldName, rawRegister: unknown): void {
    const valRes = validateRegister(rawRegister)
    if (!valRes.success) {
      addEvent({ kind: "rejected", field, detail: valRes.reason })
      if (testMode?.onReject) testMode.onReject(valRes.reason)
      return
    }

    const remoteReg = valRes.register as Register<typeof field>
    clock.observe(remoteReg.version)

    const localReg = state[field]
    const mergeRes = mergeRegister(localReg, remoteReg)

    if (mergeRes.conflict) {
      addEvent({ kind: "merge", field, version: remoteReg.version, detail: "conflict-resolved-local" })
      if (testMode?.onMerge) testMode.onMerge(field, "local")
    } else if (mergeRes.winner === "remote") {
      state[field] = mergeRes.register as any
      storage.setItem(storageKey(field), JSON.stringify(mergeRes.register))
      addEvent({ kind: "remote", field, version: remoteReg.version })
      if (testMode?.onMerge) testMode.onMerge(field, "remote")
      notify()
    }
  }

  function loadRegister<F extends FieldName>(
    field: F,
    defaultValue: FieldValueMap[F],
    actId: string,
    store: StorageLike,
    currentTime: () => number,
  ): Register<F> {
    try {
      const raw = store.getItem(storageKey(field))
      if (raw) {
        const parsed = JSON.parse(raw)
        const valRes = validateRegister(parsed)
        if (valRes.success && valRes.register.field === field) {
          return valRes.register as Register<F>
        }
      }
    } catch {
      // fallback to default
    }

    return {
      field,
      value: defaultValue,
      version: { wallMs: currentTime(), counter: 0, actorId: actId },
    }
  }

  return {
    getState(): SettingsState {
      return {
        theme: { ...state.theme, version: { ...state.theme.version } },
        language: { ...state.language, version: { ...state.language.version } },
        fontSize: { ...state.fontSize, version: { ...state.fontSize.version } },
      }
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    setField<F extends FieldName>(field: F, value: FieldValueMap[F]): void {
      const current = state[field]
      if (current.value === value) return

      const newVersion = clock.tick()
      const newRegister: Register<F> = {
        field,
        value,
        version: newVersion,
      }

      state[field] = newRegister as any
      try {
        storage.setItem(storageKey(field), JSON.stringify(newRegister))
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      }

      addEvent({ kind: "local", field, version: newVersion })
      notify()

      if (!testMode?.skipBroadcast) {
        try {
          transport.send({
            proto: 1,
            t: "UPDATE",
            from: actorId,
            msgId: `${actorId}_${now()}_${Math.random()}`,
            register: newRegister,
          })
        } catch {
          transportMode = "storage"
        }
      }
    },

    resetDefaults(): void {
      for (const field of FIELD_NAMES) {
        this.setField(field, DEFAULTS[field] as any)
      }
    },

    getStatus(): SyncStatus {
      return {
        transport: transportMode,
        persistence: lastError ? "degraded" : "ok",
        peers,
        lastError,
      }
    },

    getLog(): readonly SyncEvent[] {
      return log
    },

    dispose(): void {
      unsubscribeTransport()
      transport.dispose()
      listeners.clear()
    },
  }
}
