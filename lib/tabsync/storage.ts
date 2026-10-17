import type { StorageLike } from "./types"

/**
 * Robust storage adapter wrapping localStorage with safe fallbacks (memory fallback)
 * when localStorage throws (e.g. quota exceeded, disabled in incognito / iframe).
 */
export class SafeStorage implements StorageLike {
  private memoryFallback = new Map<string, string>()
  private useMemory = false

  constructor() {
    try {
      const testKey = "__tabsync_test__"
      localStorage.setItem(testKey, "1")
      localStorage.removeItem(testKey)
    } catch {
      this.useMemory = true
    }
  }

  getItem(key: string): string | null {
    if (this.useMemory) {
      return this.memoryFallback.get(key) ?? null
    }
    try {
      return localStorage.getItem(key)
    } catch {
      this.useMemory = true
      return this.memoryFallback.get(key) ?? null
    }
  }

  setItem(key: string, value: string): void {
    if (this.useMemory) {
      this.memoryFallback.set(key, value)
      return
    }
    try {
      localStorage.setItem(key, value)
    } catch {
      this.useMemory = true
      this.memoryFallback.set(key, value)
    }
  }

  removeItem(key: string): void {
    if (this.useMemory) {
      this.memoryFallback.delete(key)
      return
    }
    try {
      localStorage.removeItem(key)
    } catch {
      this.useMemory = true
      this.memoryFallback.delete(key)
    }
  }
}
