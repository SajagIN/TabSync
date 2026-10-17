import type { Clock, Version } from "./types"

const MAX_COUNTER = 0xffff

/**
 * Compare two HLC versions.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Order: wallMs → counter → actorId (lexicographic tiebreak).
 */
export function compareVersions(a: Version, b: Version): -1 | 0 | 1 {
  if (a.wallMs !== b.wallMs) return a.wallMs < b.wallMs ? -1 : 1
  if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1
  if (a.actorId === b.actorId) return 0
  return a.actorId < b.actorId ? -1 : 1
}

/**
 * Create a Hybrid Logical Clock bound to the given actorId.
 *
 * tick() produces a monotonically increasing Version for local events.
 * observe(remote) advances the clock on receipt of a remote Version.
 *
 * §7 of the PRD specifies the exact algorithm:
 * - tick: physical = floor(now()). If physical > wallMs → wallMs = physical, counter = 0.
 *   Else counter += 1. Overflow (counter > 0xffff) → wallMs += 1, counter = 0.
 * - observe: maxWall = max(physical, wallMs, remote.wallMs). Counter logic
 *   depends on which sources matched maxWall. Same overflow protection.
 */
export function createHLC(actorId: string, now: () => number = Date.now): Clock {
  let wallMs = 0
  let counter = 0

  function tick(): Version {
    const physical = Math.floor(now())

    if (physical > wallMs) {
      wallMs = physical
      counter = 0
    } else {
      counter += 1
      if (counter > MAX_COUNTER) {
        wallMs += 1
        counter = 0
      }
    }

    return { wallMs, counter, actorId }
  }

  function observe(remote: Version): void {
    const physical = Math.floor(now())
    const maxWall = Math.max(physical, wallMs, remote.wallMs)

    if (maxWall === wallMs && maxWall === remote.wallMs) {
      // All three tied — pick max counter and advance
      counter = Math.max(counter, remote.counter) + 1
    } else if (maxWall === wallMs) {
      // Local wall wins — just advance local counter
      counter += 1
    } else if (maxWall === remote.wallMs) {
      // Remote wall wins — adopt remote counter and advance
      counter = remote.counter + 1
    } else {
      // Physical wins — reset
      counter = 0
    }

    wallMs = maxWall

    if (counter > MAX_COUNTER) {
      wallMs += 1
      counter = 0
    }
  }

  return {
    tick,
    observe,
    now: () => Math.floor(now()),
  }
}
