import type { AnyRegister, FieldName, StorageLike } from "./types"
import { compareVersions } from "./version"
import { validateRecord } from "./validation"

export const STORAGE_PREFIX = "tabsync:v1:register:"

export function storageKey(field: FieldName, actorId: string): string {
  return `${STORAGE_PREFIX}${field}:${actorId}`
}

export interface LoadResult {
  records: AnyRegister[]
  scanned: number
  rejected: number
  error: string | null
}

export type SaveResult = { ok: true; written: boolean } | { ok: false; reason: string }

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null
  try {
    const storage = window.localStorage
    const key = `${STORAGE_PREFIX}probe`
    storage.setItem(key, "1")
    storage.removeItem(key)
    return storage
  } catch {
    return null
  }
}

export function readRegisters(storage: StorageLike): LoadResult {
  const records: AnyRegister[] = []
  let scanned = 0
  let rejected = 0

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key?.startsWith(STORAGE_PREFIX)) continue
      scanned += 1

      const raw = storage.getItem(key)
      if (!raw) {
        rejected += 1
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        rejected += 1
        continue
      }

      const result = validateRecord(parsed)
      if (
        !result.success ||
        key !== storageKey(result.record.field, result.record.version.actorId)
      ) {
        rejected += 1
        continue
      }
      records.push(result.record)
    }
    return { records, scanned, rejected, error: null }
  } catch (error) {
    return {
      records,
      scanned,
      rejected,
      error: error instanceof Error ? error.message : "Storage could not be read.",
    }
  }
}

export function saveOwnRegister(
  storage: StorageLike,
  actorId: string,
  register: AnyRegister,
): SaveResult {
  const validation = validateRecord(register)
  if (!validation.success) return { ok: false, reason: validation.reason }
  if (register.version.actorId !== actorId) {
    return { ok: false, reason: "A tab may only write its own records." }
  }

  const key = storageKey(register.field, actorId)

  try {
    const raw = storage.getItem(key)
    if (raw) {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = null
      }
      const previous = validateRecord(parsed)
      if (
        previous.success &&
        previous.record.field === register.field &&
        compareVersions(previous.record.version, register.version) >= 0
      ) {
        return { ok: true, written: false }
      }
    }

    storage.setItem(key, JSON.stringify(register))
    return { ok: true, written: true }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Storage is unavailable.",
    }
  }
}
