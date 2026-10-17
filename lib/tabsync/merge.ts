import { type FieldName, type Register } from "./types"
import { compareVersions } from "./version"

export interface MergeResult<F extends FieldName> {
  register: Register<F>
  winner: "local" | "remote" | "conflict"
  conflict: boolean
}

/**
 * Merge two registers for the same field using LWW-Register semantics.
 *
 * Rules:
 * 1. Compare versions using compareVersions (wallMs → counter → actorId).
 * 2. Higher version wins.
 * 3. If versions are equal:
 *    a. If values are equal, no-op (local wins).
 *    b. If values are different, conflict! Keep local value but advance/bump version
 *       or return conflict flag as specified in PRD §8.
 */
export function mergeRegister<F extends FieldName>(
  local: Register<F>,
  remote: Register<F>,
): MergeResult<F> {
  const cmp = compareVersions(local.version, remote.version)

  if (cmp > 0) {
    return { register: local, winner: "local", conflict: false }
  }

  if (cmp < 0) {
    return { register: remote, winner: "remote", conflict: false }
  }

  // Versions are equal (cmp === 0)
  if (local.value === remote.value) {
    return { register: local, winner: "local", conflict: false }
  }

  // Equal version, different value -> conflict
  // PRD §8: "Equal version + different value = corruption (keep local, count as conflict)"
  return {
    register: local,
    winner: "local",
    conflict: true,
  }
}
