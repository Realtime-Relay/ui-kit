import type { AlertZone } from "./types";

/**
 * Structured error passed to onError callbacks.
 */
export interface ComponentError {
  /** Error category for programmatic handling. */
  type: "invalid_value" | "invalid_data_point" | "invalid_timestamp";
  /** Human-readable description of what went wrong. */
  message: string;
  /** The original invalid value that caused the error. */
  rawValue: unknown;
  /** Name of the component that fired the error. */
  component: string;
}

/**
 * Validate min/max range. Throws on invalid config.
 */
export function validateRange(
  min: number,
  max: number,
  component: string,
): void {
  if (min > max) {
    throw new Error(
      `${component}: min (${min}) must be less than or equal to max (${max}).`,
    );
  }
  if (min === max) {
    throw new Error(
      `${component}: min and max cannot be equal (both are ${min}). Range must be non-zero.`,
    );
  }
}

/**
 * Validate alert zones. Throws on inverted or overlapping zones.
 */
export function validateAlertZones(
  zones: AlertZone[],
  component: string,
): void {
  if (!zones || zones.length === 0) return;

  // Check each zone has required min and max
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (zone.min == null || zone.max == null) {
      throw new Error(
        `${component}: alert zone at index ${i} is missing ${zone.min == null ? "min" : ""}${zone.min == null && zone.max == null ? " and " : ""}${zone.max == null ? "max" : ""}. Both min and max are required.${zone.label ? ` Zone label: "${zone.label}"` : ""}`,
      );
    }
    if (typeof zone.min !== "number" || !Number.isFinite(zone.min)) {
      throw new Error(
        `${component}: alert zone at index ${i} has invalid min value (${zone.min}). Must be a finite number.${zone.label ? ` Zone label: "${zone.label}"` : ""}`,
      );
    }
    if (typeof zone.max !== "number" || !Number.isFinite(zone.max)) {
      throw new Error(
        `${component}: alert zone at index ${i} has invalid max value (${zone.max}). Must be a finite number.${zone.label ? ` Zone label: "${zone.label}"` : ""}`,
      );
    }
    if (zone.min > zone.max) {
      throw new Error(
        `${component}: alert zone has min (${zone.min}) greater than max (${zone.max}).${zone.label ? ` Zone label: "${zone.label}"` : ""}`,
      );
    }
  }

  // Check for overlaps (sort by min, then check consecutive pairs)
  const sorted = [...zones].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    // Overlapping if a.max > b.min (adjacent/touching is allowed: a.max === b.min)
    if (a.max > b.min) {
      throw new Error(
        `${component}: alert zones overlap. Zone [${a.min}, ${a.max}]${a.label ? ` ("${a.label}")` : ""} overlaps with [${b.min}, ${b.max}]${b.label ? ` ("${b.label}")` : ""}.`,
      );
    }
  }
}

/**
 * Check if a value is a finite number. Returns true if valid.
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validate a primary value prop. Returns the validated number if valid,
 * or null if invalid (fires onError).
 */
export function validateValue(
  value: unknown,
  component: string,
  onError?: (error: ComponentError) => void,
): number | null {
  if (value === null || value === undefined) return null;

  if (isValidNumber(value)) return value;

  // Invalid — fire onError
  const typeStr = value !== value ? "NaN" : typeof value; // NaN check
  onError?.({
    type: "invalid_value",
    message: `${component}: value must be a finite number, received ${typeStr}${typeof value === "string" ? ` '${value}'` : typeof value === "number" ? ` (${value})` : ""}.`,
    rawValue: value,
    component,
  });

  return null;
}

/**
 * Validate a timestamp. Returns true if valid positive finite number.
 */
export function isValidTimestamp(ts: unknown): ts is number {
  return typeof ts === "number" && Number.isFinite(ts) && ts >= 0;
}
