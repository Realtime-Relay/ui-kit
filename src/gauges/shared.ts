import type { AlertZone } from "../utils/types";

/** Clamp value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamp arc angle to valid range [30, 300] degrees. */
export function clampArcAngle(degrees: number | undefined): number {
  const d = degrees ?? 180;
  return Math.min(300, Math.max(30, d));
}

/** Get the color for a value based on alert zones, or return default. */
export function getZoneColor(
  value: number,
  zones: AlertZone[],
  defaultColor: string,
): string {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return defaultColor;
}

/** Get the matching zone for a value, or null. */
export function getZone(value: number, zones: AlertZone[]): AlertZone | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone;
  }
  return null;
}

/**
 * Build an arc path for a gauge.
 *
 * Convention: SVG angle 0 = right (+X), angles go clockwise.
 * The arc is symmetric around the top (12 o'clock from the center),
 * opening upward like a speedometer.
 *
 * For 180°: standard semi-circle, from 9 o'clock to 3 o'clock.
 * For 270°: from 7:30 to 4:30 (wrapping around the top).
 * For 90°:  small arc centered at 12 o'clock.
 *
 * We use SVG angles where:
 *   - 0° / 0 rad = right (3 o'clock)
 *   - π/2 = down (6 o'clock)
 *   - π = left (9 o'clock)
 *   - 3π/2 = up (12 o'clock)
 *
 * The arc is symmetric around π (left, 9 o'clock) for a 180° sweep,
 * which gives us the standard bottom-open semi-circle.
 *
 * Actually, let's think simply:
 * - For a gauge, min is on the left, max is on the right.
 * - The arc opens upward from the center point.
 * - A 180° arc goes from left to right (a semi-circle above center).
 *
 * In SVG terms (clockwise from +X):
 * - Start angle (left/min): π - halfSweep ... wait, that's confusing.
 *
 * Let me use a clean model:
 * - The arc center is at (cx, cy).
 * - The arc sweeps symmetrically around the "up" direction from the center.
 * - "Up" in SVG = negative Y direction = angle -π/2 (or 3π/2).
 *
 * SVG arc endpoint parameterization:
 * - Point on circle at SVG-angle θ: (cx + r*cos(θ), cy + r*sin(θ))
 *   where θ=0 is right, θ increases clockwise (because Y is down).
 *
 * For a semi-circle (180°) opening upward:
 * - Start (left):  θ = π (9 o'clock) → (cx - r, cy)
 * - End (right):   θ = 0 (3 o'clock) → (cx + r, cy)
 * - The arc goes counterclockwise from π to 0 through the top.
 *   But SVG A command: sweep-flag=0 means counterclockwise.
 *   Hmm, actually in SVG, sweep-flag=1 is clockwise.
 *
 * Let me just compute start and end points directly:
 */
export function buildArcPath(
  cx: number,
  cy: number,
  r: number,
  sweepDegrees: number,
): { path: string; startAngleRad: number; endAngleRad: number } {
  const sweepRad = (sweepDegrees * Math.PI) / 180;
  const halfSweep = sweepRad / 2;

  // SVG angles: 0=right, clockwise. The "up" direction is -π/2.
  // We want the arc symmetric around "up" (-π/2).
  // Start point (left/min): angle = -π/2 - halfSweep
  // End point (right/max): angle = -π/2 + halfSweep
  // The arc goes clockwise from start to end (sweep-flag=1).

  const startSvgAngle = -Math.PI / 2 - halfSweep;
  const endSvgAngle = -Math.PI / 2 + halfSweep;

  const x1 = cx + r * Math.cos(startSvgAngle);
  const y1 = cy + r * Math.sin(startSvgAngle);
  const x2 = cx + r * Math.cos(endSvgAngle);
  const y2 = cy + r * Math.sin(endSvgAngle);

  const largeArc = sweepDegrees > 180 ? 1 : 0;
  const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return { path, startAngleRad: startSvgAngle, endAngleRad: endSvgAngle };
}

/** Get the arc length for a given radius and sweep angle in degrees. */
export function arcLength(r: number, sweepDegrees: number): number {
  return (sweepDegrees / 360) * 2 * Math.PI * r;
}

// ---- Legacy helpers (180° semi-circle) ----

export function buildSemiCirclePath(cx: number, cy: number, r: number): string {
  return buildArcPath(cx, cy, r, 180).path;
}

export function semiCircleLength(r: number): number {
  return Math.PI * r;
}

// ---- Dash array helpers ----

export function ratioToDash(
  startRatio: number,
  endRatio: number,
  totalLength: number,
): { dasharray: string; dashoffset: number } {
  const segLength = (endRatio - startRatio) * totalLength;
  const offset = startRatio * totalLength;
  return {
    dasharray: `${segLength} ${totalLength}`,
    dashoffset: -offset,
  };
}

export function buildZoneDashes(
  zones: AlertZone[],
  min: number,
  max: number,
  totalLength: number,
): { dasharray: string; dashoffset: number; color: string }[] {
  const range = max - min;
  if (range <= 0) return [];

  return zones.map((zone) => {
    const startRatio = (Math.max(zone.min, min) - min) / range;
    const endRatio = (Math.min(zone.max, max) - min) / range;
    const { dasharray, dashoffset } = ratioToDash(
      startRatio,
      endRatio,
      totalLength,
    );
    return { dasharray, dashoffset, color: zone.color };
  });
}

export function buildValueDash(
  value: number,
  min: number,
  max: number,
  totalLength: number,
): { dasharray: string; dashoffset: number } {
  const range = max - min;
  if (range <= 0) return ratioToDash(0, 0, totalLength);
  const ratio = (clamp(value, min, max) - min) / range;
  return ratioToDash(0, ratio, totalLength);
}

/**
 * Convert a value to a needle angle in SVG coordinates.
 * Returns an angle where:
 * - min → left end of arc (startSvgAngle)
 * - max → right end of arc (endSvgAngle)
 */
export function valueToAngle(
  value: number,
  min: number,
  max: number,
  sweepDegrees: number = 180,
): number {
  const range = max - min;
  if (range <= 0) return -Math.PI / 2; // straight up
  const ratio = (clamp(value, min, max) - min) / range;
  const sweepRad = (sweepDegrees * Math.PI) / 180;
  const halfSweep = sweepRad / 2;
  const startAngle = -Math.PI / 2 - halfSweep;
  const endAngle = -Math.PI / 2 + halfSweep;
  return startAngle + ratio * (endAngle - startAngle);
}

/**
 * Get the positions for min/max labels, pushed outward from the arc endpoints.
 */
export function getArcEndpoints(
  cx: number,
  cy: number,
  r: number,
  sweepDegrees: number,
): { startX: number; startY: number; endX: number; endY: number } {
  const sweepRad = (sweepDegrees * Math.PI) / 180;
  const halfSweep = sweepRad / 2;
  const startAngle = -Math.PI / 2 - halfSweep;
  const endAngle = -Math.PI / 2 + halfSweep;

  return {
    startX: cx + r * Math.cos(startAngle),
    startY: cy + r * Math.sin(startAngle),
    endX: cx + r * Math.cos(endAngle),
    endY: cy + r * Math.sin(endAngle),
  };
}

/**
 * Get the x,y position for a value on the arc, at a given radius from center.
 * Used for placing zone boundary labels on the arc.
 */
export function getValuePosition(
  cx: number,
  cy: number,
  r: number,
  value: number,
  min: number,
  max: number,
  sweepDegrees: number,
): { x: number; y: number } {
  const angle = valueToAngle(value, min, max, sweepDegrees);
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

/**
 * Extract unique boundary values between adjacent alert zones.
 * E.g., zones [0-40, 40-70, 70-100] → [40, 70]
 * Excludes min and max since those are already shown.
 */
export function getZoneBoundaries(
  zones: AlertZone[],
  min: number,
  max: number,
): number[] {
  const boundaries = new Set<number>();
  for (const zone of zones) {
    if (zone.min > min && zone.min < max) boundaries.add(zone.min);
    if (zone.max > min && zone.max < max) boundaries.add(zone.max);
  }
  // Remove values that are equal to min or max
  boundaries.delete(min);
  boundaries.delete(max);
  return Array.from(boundaries).sort((a, b) => a - b);
}
