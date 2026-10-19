import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { compareVersions, createHybridClock } from "@/lib/tabsync/version"
import type { Version } from "@/lib/tabsync/types"

describe("hybrid logical clock", () => {
  it("ticks monotonically when wall time is constant or moves backwards", () => {
    let time = 1_000
    const clock = createHybridClock("actor_a", () => time)
    const first = clock.tick()
    const second = clock.tick()
    time = 900
    const third = clock.tick()

    expect(first).toEqual({ wallMs: 1_000, counter: 0, actorId: "actor_a" })
    expect(second).toEqual({ wallMs: 1_000, counter: 1, actorId: "actor_a" })
    expect(third).toEqual({ wallMs: 1_000, counter: 2, actorId: "actor_a" })
    expect(compareVersions(first, second)).toBe(-1)
    expect(compareVersions(second, third)).toBe(-1)
  })

  it("starts a new logical range when physical time moves forward", () => {
    let time = 1_000
    const clock = createHybridClock("actor_a", () => time)
    clock.tick()
    clock.tick()
    time = 1_005

    expect(clock.tick()).toEqual({ wallMs: 1_005, counter: 0, actorId: "actor_a" })
  })

  it("observes a future remote version and makes the next local tick outrank it", () => {
    const clock = createHybridClock("local", () => 1_000)
    clock.tick()
    const remote: Version = { wallMs: 1_010, counter: 5, actorId: "remote" }
    clock.observe(remote)

    const local = clock.tick()
    expect(local).toEqual({ wallMs: 1_010, counter: 7, actorId: "local" })
    expect(compareVersions(local, remote)).toBe(1)
  })

  it("promotes counter overflow into the wall component", () => {
    const clock = createHybridClock("actor_a", () => 1_000)
    let version: Version = clock.tick()
    for (let index = 0; index < 65_536; index += 1) version = clock.tick()

    expect(version).toEqual({ wallMs: 1_001, counter: 0, actorId: "actor_a" })
  })

  it("compares versions lexicographically by wall time, counter, then actor", () => {
    const base: Version = { wallMs: 100, counter: 0, actorId: "a" }
    expect(compareVersions(base, { ...base, wallMs: 101 })).toBe(-1)
    expect(compareVersions(base, { ...base, counter: 1 })).toBe(-1)
    expect(compareVersions(base, { ...base, actorId: "b" })).toBe(-1)
    expect(compareVersions(base, base)).toBe(0)
  })

  it("defines a total, antisymmetric order for generated versions", () => {
    const versionArbitrary = fc.record({
      wallMs: fc.nat({ max: 10_000 }),
      counter: fc.nat({ max: 0xffff }),
      actorId: fc.stringMatching(/^[A-Za-z0-9_-]{1,8}$/),
    })

    fc.assert(
      fc.property(versionArbitrary, versionArbitrary, (left, right) => {
        const order = compareVersions(left, right)
        const reverse = compareVersions(right, left)
        expect(order).toBe(-reverse)
        expect(order).toBeGreaterThanOrEqual(-1)
        expect(order).toBeLessThanOrEqual(1)
      }),
      { numRuns: 250 },
    )
  })
})
