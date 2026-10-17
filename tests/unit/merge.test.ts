import { describe, it, expect } from "vitest"
import { mergeRegister } from "@/lib/tabsync/merge"
import type { Register } from "@/lib/tabsync/types"

describe("LWW Register Merge", () => {
  it("should prefer higher version (remote wins)", () => {
    const local: Register<"theme"> = {
      field: "theme",
      value: "light",
      version: { wallMs: 1000, counter: 0, actorId: "a" },
    }
    const remote: Register<"theme"> = {
      field: "theme",
      value: "dark",
      version: { wallMs: 1005, counter: 0, actorId: "b" },
    }

    const res = mergeRegister(local, remote)
    expect(res.winner).toBe("remote")
    expect(res.register.value).toBe("dark")
    expect(res.conflict).toBe(false)
  })

  it("should prefer local when local version is higher", () => {
    const local: Register<"theme"> = {
      field: "theme",
      value: "dark",
      version: { wallMs: 1010, counter: 0, actorId: "a" },
    }
    const remote: Register<"theme"> = {
      field: "theme",
      value: "light",
      version: { wallMs: 1000, counter: 0, actorId: "b" },
    }

    const res = mergeRegister(local, remote)
    expect(res.winner).toBe("local")
    expect(res.register.value).toBe("dark")
    expect(res.conflict).toBe(false)
  })

  it("should handle equal versions with same values (no-op)", () => {
    const reg: Register<"theme"> = {
      field: "theme",
      value: "dark",
      version: { wallMs: 1000, counter: 0, actorId: "a" },
    }

    const res = mergeRegister(reg, reg)
    expect(res.winner).toBe("local")
    expect(res.register.value).toBe("dark")
    expect(res.conflict).toBe(false)
  })

  it("should detect conflict on equal version with different values", () => {
    const local: Register<"theme"> = {
      field: "theme",
      value: "dark",
      version: { wallMs: 1000, counter: 0, actorId: "a" },
    }
    const remote: Register<"theme"> = {
      field: "theme",
      value: "light",
      version: { wallMs: 1000, counter: 0, actorId: "a" },
    }

    const res = mergeRegister(local, remote)
    expect(res.conflict).toBe(true)
    expect(res.register.value).toBe("dark") // keeps local
  })
})
