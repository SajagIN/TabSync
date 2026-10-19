import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { mergeRegister } from "@/lib/tabsync/merge"
import type { AnyRegister, Theme, Version } from "@/lib/tabsync/types"

function theme(value: Theme, version: Version): AnyRegister {
  return { v: 1, field: "theme", value, version }
}

function maxRegister(left: AnyRegister, right: AnyRegister): AnyRegister {
  return mergeRegister(left, right).register
}

describe("per-field register merge", () => {
  it("chooses the greater version regardless of arrival order", () => {
    const earlier = theme("light", { wallMs: 1_000, counter: 0, actorId: "a" })
    const later = theme("dark", { wallMs: 1_000, counter: 1, actorId: "b" })

    expect(mergeRegister(earlier, later)).toEqual({
      register: later,
      changed: true,
      conflict: false,
    })
    expect(mergeRegister(later, earlier)).toEqual({
      register: later,
      changed: false,
      conflict: false,
    })
  })

  it("is idempotent for the same register", () => {
    const record = theme("dark", { wallMs: 1_000, counter: 0, actorId: "a" })
    expect(mergeRegister(record, record)).toEqual({
      register: record,
      changed: false,
      conflict: false,
    })
  })

  it("reports equal-version, different-value records as corruption", () => {
    const version = { wallMs: 1_000, counter: 0, actorId: "a" }
    const current = theme("dark", version)
    const incoming = theme("light", version)
    const result = mergeRegister(current, incoming)

    expect(result.register).toBe(current)
    expect(result.changed).toBe(false)
    expect(result.conflict).toBe(true)
  })

  it("rejects attempts to merge different fields", () => {
    const themeRecord = theme("light", { wallMs: 1, counter: 0, actorId: "a" })
    const languageRecord: AnyRegister = {
      v: 1,
      field: "language",
      value: "en",
      version: { wallMs: 2, counter: 0, actorId: "b" },
    }
    expect(() => mergeRegister(themeRecord, languageRecord)).toThrow(/different fields/)
  })

  it("is commutative, associative, and idempotent for compliant records", () => {
    const recordArbitrary = fc
      .record({
        wallMs: fc.nat({ max: 10_000 }),
        counter: fc.nat({ max: 0xffff }),
        actorNumber: fc.integer({ min: 0, max: 7 }),
      })
      .map(({ wallMs, counter, actorNumber }) => {
        const actorId = `actor_${actorNumber}`
        const value: Theme = actorNumber % 2 === 0 ? "light" : "dark"
        return theme(value, { wallMs, counter, actorId })
      })

    fc.assert(
      fc.property(recordArbitrary, recordArbitrary, recordArbitrary, (a, b, c) => {
        expect(maxRegister(a, b)).toEqual(maxRegister(b, a))
        expect(maxRegister(a, a)).toEqual(a)
        expect(maxRegister(maxRegister(a, b), c)).toEqual(maxRegister(a, maxRegister(b, c)))
      }),
      { numRuns: 250 },
    )
  })
})
