import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { HEAD_BOOTSTRAP_SCRIPT } from "@/app/head-bootstrap"
import { createSettingsStore } from "@/lib/tabsync/store"
import { storageKey } from "@/lib/tabsync/storage"
import type { AnyRegister, StorageLike, SyncTransport } from "@/lib/tabsync/types"

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

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

class QuietTransport implements SyncTransport {
  getMode(): "none" {
    return "none"
  }

  send(): void {}

  subscribe(): () => void {
    return () => {}
  }

  dispose(): void {}
}

function runBootstrap(storage: MemoryStorage) {
  const classes = new Set<string>()
  const cssProperties = new Map<string, string>()
  const root = {
    classList: {
      toggle(name: string, enabled: boolean) {
        if (enabled) classes.add(name)
        else classes.delete(name)
      },
    },
    style: {
      colorScheme: "",
      setProperty(name: string, value: string) {
        cssProperties.set(name, value)
      },
    },
    lang: "",
    dataset: {} as Record<string, string>,
  }
  const window: Record<string, unknown> = {}

  runInNewContext(HEAD_BOOTSTRAP_SCRIPT, {
    localStorage: storage,
    document: { documentElement: root },
    window,
  })

  return { classes, cssProperties, root, window }
}

function record(
  field: "theme" | "language" | "fontSize",
  value: "light" | "dark" | "en" | "hi" | "ta" | number,
  actorId: string,
  wallMs: number,
  counter = 0,
): AnyRegister {
  if (field === "theme") {
    return { v: 1, field, value: value as "light" | "dark", version: { actorId, wallMs, counter } }
  }
  if (field === "language") {
    return {
      v: 1,
      field,
      value: value as "en" | "hi" | "ta",
      version: { actorId, wallMs, counter },
    }
  }
  return { v: 1, field, value: value as number, version: { actorId, wallMs, counter } }
}

function seed(storage: MemoryStorage, records: readonly AnyRegister[]) {
  for (const item of records) {
    storage.setItem(storageKey(item.field, item.version.actorId), JSON.stringify(item))
  }
}

describe("pre-paint bootstrap", () => {
  it("applies saved winners before the application renders", () => {
    const storage = new MemoryStorage()
    seed(storage, [
      record("theme", "light", "actor_a", 10),
      record("theme", "dark", "actor_b", 10),
      record("language", "ta", "actor_c", 11),
      record("fontSize", 22, "actor_d", 12),
    ])

    const result = runBootstrap(storage)
    expect(result.classes.has("dark")).toBe(true)
    expect(result.root.style.colorScheme).toBe("dark")
    expect(result.root.lang).toBe("ta")
    expect(result.cssProperties.get("--tabsync-font-size")).toBe("22px")
    expect(result.root.dataset.tabsyncBootstrapApplied).toBe("true")
    expect(result.window.__tabsyncBootstrapApplied).toBe(true)
  })

  it("skips corrupt, invalid, future-schema, and wrongly keyed records", () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey("theme", "broken"), "{bad json")
    storage.setItem(
      storageKey("language", "future"),
      JSON.stringify({
        v: 2,
        field: "language",
        value: "ta",
        version: { wallMs: 99, counter: 0, actorId: "future" },
      }),
    )
    storage.setItem(
      storageKey("fontSize", "wrong-key"),
      JSON.stringify(record("fontSize", 24, "other_actor", 99)),
    )
    seed(storage, [record("theme", "dark", "valid", 10)])

    const result = runBootstrap(storage)
    expect(result.classes.has("dark")).toBe(true)
    expect(result.root.lang).toBe("en")
    expect(result.cssProperties.get("--tabsync-font-size")).toBe("16px")
  })

  it("agrees with the runtime fold for generated persisted record sets", () => {
    const recordArbitrary = fc
      .oneof(
        fc.record({
          field: fc.constant("theme" as const),
          value: fc.constantFrom("light" as const, "dark" as const),
          actor: fc.integer({ min: 0, max: 4 }),
          wallMs: fc.integer({ min: 1, max: 10_000 }),
          counter: fc.integer({ min: 0, max: 0xffff }),
        }),
        fc.record({
          field: fc.constant("language" as const),
          value: fc.constantFrom("en" as const, "hi" as const, "ta" as const),
          actor: fc.integer({ min: 0, max: 4 }),
          wallMs: fc.integer({ min: 1, max: 10_000 }),
          counter: fc.integer({ min: 0, max: 0xffff }),
        }),
        fc.record({
          field: fc.constant("fontSize" as const),
          value: fc.integer({ min: 14, max: 24 }),
          actor: fc.integer({ min: 0, max: 4 }),
          wallMs: fc.integer({ min: 1, max: 10_000 }),
          counter: fc.integer({ min: 0, max: 0xffff }),
        }),
      )
      .map(({ field, value, actor, wallMs, counter }) =>
        record(field, value, `actor_${actor}`, wallMs, counter),
      )

    fc.assert(
      fc.property(fc.array(recordArbitrary, { maxLength: 30 }), (records) => {
        const storage = new MemoryStorage()
        seed(storage, records)
        const bootstrap = runBootstrap(storage)
        const store = createSettingsStore({
          actorId: "reader",
          storage,
          transport: new QuietTransport(),
          now: () => 20_000,
        })
        const state = store.getSnapshot().state

        expect(bootstrap.classes.has("dark")).toBe(state.theme.value === "dark")
        expect(bootstrap.root.lang).toBe(state.language.value)
        expect(bootstrap.cssProperties.get("--tabsync-font-size")).toBe(`${state.fontSize.value}px`)
        store.dispose()
      }),
      { numRuns: 100 },
    )
  })
})
