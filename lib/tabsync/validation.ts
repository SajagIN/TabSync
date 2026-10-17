import { FIELD_NAMES, FieldDomain, type FieldName, type FieldValueMap, type Register } from "./types"

export type ValidationError =
  | "malformed-json"
  | "not-an-object"
  | "unknown-schema-version"
  | "unknown-field"
  | "out-of-domain"
  | "invalid-version"
  | "reserved-actor"

export interface ValidationSuccess<F extends FieldName> {
  success: true
  register: Register<F>
}

export interface ValidationFailure {
  success: false
  reason: ValidationError
}

export type ValidationResult<F extends FieldName> = ValidationSuccess<F> | ValidationFailure

/**
 * Validate raw input (e.g. from BroadcastChannel or Storage event) against protocol specs.
 * Hand-written guards per PRD §11.
 */
export function validateRegister(input: unknown): ValidationResult<FieldName> {
  if (input === null || typeof input !== "object") {
    return { success: false, reason: "not-an-object" }
  }

  const rec = input as Record<string, unknown>

  if (typeof rec["field"] !== "string" || !FIELD_NAMES.includes(rec["field"] as FieldName)) {
    return { success: false, reason: "unknown-field" }
  }

  const field = rec["field"] as FieldName

  // Validate value against domain constraints
  const value = rec["value"]
  if (!validateFieldValue(field, value)) {
    return { success: false, reason: "out-of-domain" }
  }

  // Validate version object
  const ver = rec["version"]
  if (ver === null || typeof ver !== "object") {
    return { success: false, reason: "invalid-version" }
  }

  const verRec = ver as Record<string, unknown>
  if (
    typeof verRec["wallMs"] !== "number" ||
    !Number.isInteger(verRec["wallMs"]) ||
    verRec["wallMs"] < 0 ||
    typeof verRec["counter"] !== "number" ||
    !Number.isInteger(verRec["counter"]) ||
    verRec["counter"] < 0 ||
    typeof verRec["actorId"] !== "string" ||
    verRec["actorId"].length === 0
  ) {
    return { success: false, reason: "invalid-version" }
  }

  if (verRec["actorId"] === "system" || verRec["actorId"] === "anonymous") {
    return { success: false, reason: "reserved-actor" }
  }

  return {
    success: true,
    register: {
      field,
      value: value as FieldValueMap[typeof field],
      version: {
        wallMs: verRec["wallMs"],
        counter: verRec["counter"],
        actorId: verRec["actorId"],
      },
    },
  }
}

function validateFieldValue(field: FieldName, value: unknown): boolean {
  const domain = FieldDomain[field]

  if (field === "fontSize") {
    const numDomain = domain as { min: number; max: number; step: number }
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= numDomain.min &&
      value <= numDomain.max &&
      (value - numDomain.min) % numDomain.step === 0
    )
  } else {
    const strDomain = domain as { values: readonly string[] }
    return typeof value === "string" && strDomain.values.includes(value)
  }
}

export function validateEnvelope(raw: string): { success: true; envelope: unknown } | { success: false; reason: ValidationError } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, reason: "malformed-json" }
  }

  if (parsed === null || typeof parsed !== "object") {
    return { success: false, reason: "not-an-object" }
  }

  const env = parsed as Record<string, unknown>
  if (env["proto"] !== 1) {
    return { success: false, reason: "unknown-schema-version" }
  }

  if (typeof env["from"] !== "string" || env["from"] === "system" || env["from"] === "anonymous") {
    return { success: false, reason: "reserved-actor" }
  }

  return { success: true, envelope: parsed }
}
