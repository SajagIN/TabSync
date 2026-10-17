import { describe, it, expect } from "vitest"
import { createHLC, compareVersions } from "@/lib/tabsync/version"

describe("HLC (Hybrid Logical Clock)", () => {
  it("should generate strictly increasing versions", () => {
    let mockTime = 1000
    const hlc = createHLC("actor1", () => mockTime)

    const v1 = hlc.tick()
    const v2 = hlc.tick()

    expect(v1.wallMs).toBe(1000)
    expect(v1.counter).toBe(0)
    expect(v1.actorId).toBe("actor1")

    expect(v2.wallMs).toBe(1000)
    expect(v2.counter).toBe(1)
    expect(v2.actorId).toBe("actor1")
  })

  it("should advance wallMs when physical time increases", () => {
    let mockTime = 1000
    const hlc = createHLC("actor1", () => mockTime)

    const v1 = hlc.tick()
    mockTime = 1005
    const v2 = hlc.tick()

    expect(v1.wallMs).toBe(1000)
    expect(v2.wallMs).toBe(1005)
    expect(v2.counter).toBe(0)
  })

  it("should observe remote timestamps correctly", () => {
    let mockTime = 1000
    const hlc = createHLC("actor1", () => mockTime)

    hlc.tick() // wall 1000, counter 0
    hlc.observe({ wallMs: 1010, counter: 5, actorId: "actor2" })

    const v3 = hlc.tick()
    expect(v3.wallMs).toBe(1010)
    expect(v3.counter).toBe(7)
  })

  it("should compare versions correctly", () => {
    const v1 = { wallMs: 1000, counter: 0, actorId: "a" }
    const v2 = { wallMs: 1001, counter: 0, actorId: "a" }
    const v3 = { wallMs: 1000, counter: 1, actorId: "a" }
    const v4 = { wallMs: 1000, counter: 0, actorId: "b" }

    expect(compareVersions(v1, v2)).toBe(-1)
    expect(compareVersions(v2, v1)).toBe(1)
    expect(compareVersions(v1, v3)).toBe(-1)
    expect(compareVersions(v1, v4)).toBe(-1) // tie break by actorId ("a" < "b")
    expect(compareVersions(v1, v1)).toBe(0)
  })
})
