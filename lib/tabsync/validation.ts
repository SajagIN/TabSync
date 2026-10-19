import { FIELD_NAMES, type AnyRegister, type FieldName, type FieldValueMap } from "./types"

const ACTOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_COUNTER = 0xffff

export type RecordValidation =
  { success: true; record: AnyRegister } | { success: false; reason: string }

export function isFieldName(value: unknown): value is FieldName {
  return typeof value === "string" && FIELD_NAMES.includes(value as FieldName)
}

export function isFieldValue<F extends FieldName>(
  field: F,
  value: unknown,
): value is FieldValueMap[F] {
  if (field === "theme") return value === "light" || value === "dark"
  if (field === "language") return value === "en" || value === "hi" || value === "ta"
  return typeof value === "number" && Number.isInteger(value) && value >= 14 && value <= 24
}

export function validateRecord(input: unknown): RecordValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, reason: "not-an-object" }
  }

  const record = input as Record<string, unknown>
  if (record["v"] !== 1) return { success: false, reason: "unknown-schema-version" }
  if (!isFieldName(record["field"])) return { success: false, reason: "unknown-field" }

  const field = record["field"]
  if (!isFieldValue(field, record["value"])) {
    return { success: false, reason: "invalid-value" }
  }

  const rawVersion = record["version"]
  if (!rawVersion || typeof rawVersion !== "object" || Array.isArray(rawVersion)) {
    return { success: false, reason: "invalid-version" }
  }

  const version = rawVersion as Record<string, unknown>
  if (
    typeof version["wallMs"] !== "number" ||
    !Number.isSafeInteger(version["wallMs"]) ||
    version["wallMs"] < 0 ||
    typeof version["counter"] !== "number" ||
    !Number.isSafeInteger(version["counter"]) ||
    version["counter"] < 0 ||
    version["counter"] > MAX_COUNTER ||
    typeof version["actorId"] !== "string" ||
    !ACTOR_ID_PATTERN.test(version["actorId"])
  ) {
    return { success: false, reason: "invalid-version" }
  }

  if (version["actorId"] === "default") {
    return { success: false, reason: "reserved-actor" }
  }

  const parsedVersion = {
    wallMs: version["wallMs"],
    counter: version["counter"],
    actorId: version["actorId"],
  }

  switch (field) {
    case "theme":
      return {
        success: true,
        record: { v: 1, field, value: record["value"], version: parsedVersion } as AnyRegister,
      }
    case "language":
      return {
        success: true,
        record: { v: 1, field, value: record["value"], version: parsedVersion } as AnyRegister,
      }
    case "fontSize":
      return {
        success: true,
        record: { v: 1, field, value: record["value"], version: parsedVersion } as AnyRegister,
      }
  }
}
