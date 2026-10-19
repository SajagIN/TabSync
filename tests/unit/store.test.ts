import { describe, expect, it } from "vitest"
import { createSettingsStore } from "@/lib/tabsync/store"
import { storageKey } from "@/lib/tabsync/storage"
import type { Envelope, StorageLike, SyncTransport } from "@/lib/tabsync/types"

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

class FakeTransport implements SyncTransport {
  readonly messages: Envelope[] = []
  private readonly handlers = new Set<(message: unknown) => void>()

  constructor(private readonly mode: "broadcast" | "storage" | "none" = "broadcast") {}

  getMode(): "broadcast" | "storage" | "none" {
    return this.mode
  }

  send(message: Envelope): void {
    this.messages.push(message)
  }

  subscribe(handler: (message: unknown) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  deliver(message: unknown): void {
    for (const handler of this.handlers) handler(message)
  }

  dispose(): void {
    this.handlers.clear()
  }
}

function createTestStore(
  options: {
    actorId?: string
    storage?: StorageLike | null
    transport?: FakeTransport
    now?: () => number
  } = {},
) {
  const storage = options.storage === undefined ? new MemoryStorage() : options.storage
  const transport = options.transport ?? new FakeTransport()
  const store = createSettingsStore({
    actorId: options.actorId ?? "test_actor",
    storage,
    transport,
    now: options.now ?? (() => 1_000),
  })
  return { store, storage, transport }
}

describe("settings store", () => {
  it("provides stable, immutable snapshots until a change", () => {
    const { store } = createTestStore()
    const before = store.getSnapshot()

    expect(store.getSnapshot()).toBe(before)
    expect(Object.isFrozen(before)).toBe(true)
    expect(Object.isFrozen(before.state)).toBe(true)
    expect(Object.isFrozen(before.state.theme.version)).toBe(true)
    expect(Object.isFrozen(before.status)).toBe(true)
    expect(Object.isFrozen(before.log)).toBe(true)
    expect(before.state.theme.value).toBe("light")

    store.setField("theme", "dark")
    const after = store.getSnapshot()
    expect(after).not.toBe(before)
    expect(store.getSnapshot()).toBe(after)
    expect(after.state.theme.value).toBe("dark")
    expect(before.state.theme.value).toBe("light")
    expect(after.log).toHaveLength(1)
    expect(after.log[0]?.kind).toBe("local")

    store.dispose()
  })

  it("writes an actor-owned register and broadcasts the update", () => {
    const { store, storage, transport } = createTestStore({ actorId: "writer" })
    store.setField("fontSize", 21)

    const raw = storage?.getItem(storageKey("fontSize", "writer"))
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? "null")).toMatchObject({
      v: 1,
      field: "fontSize",
      value: 21,
      version: { actorId: "writer" },
    })
    expect(transport.messages.some((message) => message.type === "UPDATE")).toBe(true)

    store.dispose()
  })

  it("does not create a new version or event for an unchanged value", () => {
    const { store } = createTestStore()
    const before = store.getSnapshot()
    store.setField("theme", "light")
    expect(store.getSnapshot()).toBe(before)
    expect(store.getSnapshot().log).toHaveLength(0)
    store.dispose()
  })

  it("notifies subscribers after publishing the new cached snapshot", () => {
    const { store } = createTestStore()
    let observedTheme: string | undefined
    const unsubscribe = store.subscribe(() => {
      observedTheme = store.getSnapshot().state.theme.value
    })

    store.setField("theme", "dark")
    expect(observedTheme).toBe("dark")

    unsubscribe()
    store.dispose()
  })

  it("accepts valid remote updates and rejects a sender mismatch", () => {
    const { store, transport } = createTestStore()
    transport.deliver({
      proto: 1,
      type: "UPDATE",
      from: "peer",
      msgId: "peer:1",
      record: {
        v: 1,
        field: "theme",
        value: "dark",
        version: { wallMs: 1_100, counter: 0, actorId: "peer" },
      },
    })
    expect(store.getSnapshot().state.theme.value).toBe("dark")

    transport.deliver({
      proto: 1,
      type: "UPDATE",
      from: "another_peer",
      msgId: "peer:2",
      record: {
        v: 1,
        field: "language",
        value: "ta",
        version: { wallMs: 1_200, counter: 0, actorId: "peer" },
      },
    })
    expect(store.getSnapshot().state.language.value).toBe("en")
    expect(store.getSnapshot().status.rejectedRecords).toBe(1)
    expect(store.getSnapshot().log[0]?.kind).toBe("rejected")
    store.dispose()
  })

  it("converges concurrent updates and preserves independent field changes", () => {
    const sharedStorage = new MemoryStorage()
    const transportA = new FakeTransport()
    const transportB = new FakeTransport()
    const { store: storeA } = createTestStore({
      actorId: "actor_a",
      storage: sharedStorage,
      transport: transportA,
      now: () => 2_000,
    })
    const { store: storeB } = createTestStore({
      actorId: "actor_b",
      storage: sharedStorage,
      transport: transportB,
      now: () => 2_000,
    })

    storeA.setField("fontSize", 20)
    storeB.setField("fontSize", 22)
    storeA.setField("theme", "dark")
    storeB.setField("language", "hi")

    const updatesA = transportA.messages.filter((message) => message.type === "UPDATE")
    const updatesB = transportB.messages.filter((message) => message.type === "UPDATE")
    for (const update of updatesA) transportB.deliver(update)
    for (const update of updatesB) transportA.deliver(update)

    expect(storeA.getSnapshot().state.theme.value).toBe("dark")
    expect(storeB.getSnapshot().state.theme.value).toBe("dark")
    expect(storeA.getSnapshot().state.language.value).toBe("hi")
    expect(storeB.getSnapshot().state.language.value).toBe("hi")
    expect(storeA.getSnapshot().state.fontSize.value).toBe(22)
    expect(storeB.getSnapshot().state.fontSize.value).toBe(22)
    expect(storeA.getSnapshot().state.fontSize.version.actorId).toBe("actor_b")

    const recovered = createTestStore({ actorId: "recovered", storage: sharedStorage }).store
    expect(recovered.getSnapshot().state.theme.value).toBe("dark")
    expect(recovered.getSnapshot().state.language.value).toBe("hi")
    expect(recovered.getSnapshot().state.fontSize.value).toBe(22)

    storeA.dispose()
    storeB.dispose()
    recovered.dispose()
  })

  it("restores saved state and accounts for malformed records", () => {
    const storage = new MemoryStorage()
    storage.setItem(
      storageKey("theme", "saved"),
      JSON.stringify({
        v: 1,
        field: "theme",
        value: "dark",
        version: { wallMs: 1_500, counter: 2, actorId: "saved" },
      }),
    )
    storage.setItem(storageKey("language", "broken"), "{not-json")

    const { store } = createTestStore({ storage })
    expect(store.getSnapshot().state.theme.value).toBe("dark")
    expect(store.getSnapshot().status.restoredRecords).toBe(1)
    expect(store.getSnapshot().status.rejectedRecords).toBe(1)
    expect(new Set(store.getSnapshot().log.map((event) => event.id)).size).toBe(
      store.getSnapshot().log.length,
    )
    store.dispose()
  })

  it("stays usable when persistence is unavailable", () => {
    const { store } = createTestStore({ storage: null, transport: new FakeTransport("broadcast") })
    store.setField("language", "hi")

    expect(store.getSnapshot().state.language.value).toBe("hi")
    expect(store.getSnapshot().status.persistence).toBe("degraded")
    expect(store.getSnapshot().status.transport).toBe("broadcast")
    expect(store.getSnapshot().status.lastError).toMatch(/not being saved/)
    store.dispose()
  })

  it("keeps controls usable and reports both impairments without APIs", () => {
    const { store } = createTestStore({ storage: null, transport: new FakeTransport("none") })
    store.setField("theme", "dark")

    expect(store.getSnapshot().state.theme.value).toBe("dark")
    expect(store.getSnapshot().status.transport).toBe("none")
    expect(store.getSnapshot().status.persistence).toBe("degraded")
    store.dispose()
  })

  it("rejects invalid local values at the store boundary", () => {
    const { store } = createTestStore()
    store.setField("fontSize", 99 as never)

    expect(store.getSnapshot().state.fontSize.value).toBe(16)
    expect(store.getSnapshot().status.rejectedRecords).toBe(1)
    expect(store.getSnapshot().log[0]?.detail).toBe("Invalid local value.")
    store.dispose()
  })

  it("answers HELLO with current state and tracks a live peer", () => {
    const { store, transport } = createTestStore({ actorId: "local" })
    transport.deliver({ proto: 1, type: "HELLO", from: "peer", msgId: "peer:hello" })

    expect(store.getSnapshot().status.peers).toBe(1)
    expect(transport.messages.some((message) => message.type === "STATE")).toBe(true)
    expect(store.getSnapshot().log.some((event) => event.detail?.includes("Tab connected"))).toBe(
      true,
    )
    store.dispose()
  })
})
