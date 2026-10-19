import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
})
