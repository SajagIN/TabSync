import { describe, expect, it } from "vitest"
import { readRegisters, saveOwnRegister, storageKey } from "@/lib/tabsync/storage"
import type { AnyRegister, StorageLike } from "@/lib/tabsync/types"

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class UnavailableStorage implements StorageLike {
  get length(): number {
    throw new Error("Storage unavailable")
  }

  key(): string | null {
    throw new Error("Storage unavailable")
  }

  getItem(): string | null {
    throw new Error("Storage unavailable")
  }

  setItem(): void {
    throw new Error("Storage unavailable")
  }

  removeItem(): void {
    throw new Error("Storage unavailable")
  }
}

function register(wallMs: number, value: "light" | "dark" = "dark"): AnyRegister {
  return {
    v: 1,
    field: "theme",
    value,
    version: { wallMs, counter: 0, actorId: "writer" },
  }
}

describe("per-actor browser storage", () => {
  it("loads only valid records stored under their canonical key", () => {
    const storage = new MemoryStorage()
    const valid = register(100)
    storage.setItem(storageKey("theme", "writer"), JSON.stringify(valid))
    storage.setItem(storageKey("language", "bad"), "not json")
    storage.setItem(storageKey("theme", "wrong-key"), JSON.stringify(valid))
    storage.setItem("unrelated:key", JSON.stringify(valid))

    expect(readRegisters(storage)).toEqual({
      records: [valid],
      scanned: 3,
      rejected: 2,
      error: null,
    })
  })

  it("writes only a register owned by the current actor", () => {
    const storage = new MemoryStorage()
    expect(saveOwnRegister(storage, "writer", register(100))).toEqual({ ok: true, written: true })
    expect(storage.getItem(storageKey("theme", "writer"))).toBe(JSON.stringify(register(100)))
    expect(saveOwnRegister(storage, "other", register(101))).toEqual({
      ok: false,
      reason: "A tab may only write its own records.",
    })
  })

  it("never replaces an equal or newer own value with an older write", () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey("theme", "writer"), JSON.stringify(register(200, "light")))

    expect(saveOwnRegister(storage, "writer", register(199))).toEqual({ ok: true, written: false })
    expect(saveOwnRegister(storage, "writer", register(200))).toEqual({ ok: true, written: false })
    expect(JSON.parse(storage.getItem(storageKey("theme", "writer")) ?? "null").value).toBe("light")
  })

  it("reports storage exceptions without throwing", () => {
    const storage = new UnavailableStorage()
    expect(readRegisters(storage)).toMatchObject({
      records: [],
      scanned: 0,
      rejected: 0,
      error: "Storage unavailable",
    })
    expect(saveOwnRegister(storage, "writer", register(100))).toMatchObject({
      ok: false,
      reason: "Storage unavailable",
    })
  })

  it("replaces a corrupt record with a validated local write", () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey("theme", "writer"), "{bad json")

    const result = saveOwnRegister(storage, "writer", register(100))
    expect(result).toEqual({ ok: true, written: true })
    expect(readRegisters(storage).records).toEqual([register(100)])
  })
})
