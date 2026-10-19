import { describe, expect, it } from "vitest"
import { isFieldName, isFieldValue, validateRecord } from "@/lib/tabsync/validation"
import type { AnyRegister } from "@/lib/tabsync/types"

const validTheme: AnyRegister = {
  v: 1,
  field: "theme",
  value: "dark",
  version: { wallMs: 1_700_000_000_000, counter: 4, actorId: "actor_1" },
}

describe("record and value validation", () => {
  it("accepts the supported field domains", () => {
    expect(isFieldName("theme")).toBe(true)
    expect(isFieldName("language")).toBe(true)
    expect(isFieldName("fontSize")).toBe(true)
    expect(isFieldName("anythingElse")).toBe(false)

    expect(isFieldValue("theme", "dark")).toBe(true)
    expect(isFieldValue("language", "ta")).toBe(true)
    expect(isFieldValue("fontSize", 14)).toBe(true)
    expect(isFieldValue("fontSize", 24)).toBe(true)
    expect(isFieldValue("fontSize", 14.5)).toBe(false)
    expect(isFieldValue("fontSize", 25)).toBe(false)
  })

  it("accepts a well-formed persisted register and returns a typed copy", () => {
    const result = validateRecord(validTheme)
    expect(result.success).toBe(true)
    if (result.success) expect(result.record).toEqual(validTheme)
  })

  it.each([
    [null, "not-an-object"],
    [[], "not-an-object"],
    [
      { v: 2, field: "theme", value: "dark", version: validTheme.version },
      "unknown-schema-version",
    ],
    [{ v: 1, field: "unknown", value: "dark", version: validTheme.version }, "unknown-field"],
    [{ ...validTheme, value: "blue" }, "invalid-value"],
    [{ ...validTheme, field: "language", value: "fr" }, "invalid-value"],
    [{ ...validTheme, field: "fontSize", value: 24.1 }, "invalid-value"],
    [{ ...validTheme, version: { ...validTheme.version, wallMs: -1 } }, "invalid-version"],
    [{ ...validTheme, version: { ...validTheme.version, counter: 65_536 } }, "invalid-version"],
    [
      { ...validTheme, version: { ...validTheme.version, actorId: "bad actor" } },
      "invalid-version",
    ],
    [{ ...validTheme, version: { ...validTheme.version, actorId: "default" } }, "reserved-actor"],
  ])("rejects malformed records with a reason", (input, reason) => {
    const result = validateRecord(input)
    expect(result).toEqual({ success: false, reason })
  })
})
