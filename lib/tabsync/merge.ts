import type { AnyRegister } from "./types"
import { compareVersions } from "./version"

export interface MergeResult {
  register: AnyRegister
  changed: boolean
  conflict: boolean
}

export function mergeRegister(local: AnyRegister, incoming: AnyRegister): MergeResult {
  if (local.field !== incoming.field) {
    throw new Error("Cannot merge registers for different fields")
  }

  const order = compareVersions(local.version, incoming.version)
  if (order < 0) return { register: incoming, changed: true, conflict: false }
  if (order > 0) return { register: local, changed: false, conflict: false }

  if (local.value !== incoming.value) {
    return { register: local, changed: false, conflict: true }
  }

  return { register: local, changed: false, conflict: false }
}
