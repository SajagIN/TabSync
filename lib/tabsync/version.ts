import type { Version } from "./types"

const MAX_COUNTER = 0xffff

export function compareVersions(left: Version, right: Version): -1 | 0 | 1 {
  if (left.wallMs !== right.wallMs) return left.wallMs < right.wallMs ? -1 : 1
  if (left.counter !== right.counter) return left.counter < right.counter ? -1 : 1
  if (left.actorId === right.actorId) return 0
  return left.actorId < right.actorId ? -1 : 1
}

export interface HybridClock {
  tick(): Version
  observe(remote: Version): void
}

export function createHybridClock(actorId: string, now: () => number = Date.now): HybridClock {
  let wallMs = 0
  let counter = 0

  function promoteOverflow(): void {
    if (counter > MAX_COUNTER) {
      wallMs += 1
      counter = 0
    }
  }

  return {
    tick(): Version {
      const physical = Math.max(0, Math.floor(now()))
      if (physical > wallMs) {
        wallMs = physical
        counter = 0
      } else {
        counter += 1
        promoteOverflow()
      }
      return { wallMs, counter, actorId }
    },

    observe(remote): void {
      const physical = Math.max(0, Math.floor(now()))
      const nextWall = Math.max(physical, wallMs, remote.wallMs)

      if (nextWall === wallMs && nextWall === remote.wallMs) {
        counter = Math.max(counter, remote.counter) + 1
      } else if (nextWall === wallMs) {
        counter += 1
      } else if (nextWall === remote.wallMs) {
        counter = remote.counter + 1
      } else {
        counter = 0
      }

      wallMs = nextWall
      promoteOverflow()
    },
  }
}
