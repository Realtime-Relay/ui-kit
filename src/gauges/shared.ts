import type { AlertZone } from '../utils/types';

/** Clamp value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get the color for a value based on alert zones, or return default. */
export function getZoneColor(value: number, zones: AlertZone[], defaultColor: string): string {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return defaultColor;
}

/**
 * Gauge geometry using stroke-dasharray on a single semi-circle path.
 * This approach is simple and reliable — one <path> per segment,
 * all sharing the same d attribute, differentiated by dasharray offset.
 */

/** Build the semi-circle path string for a gauge. */
export function buildSemiCirclePath(cx: number, cy: number, r: number): string {
  // Semi-circle from left to right (clockwise in SVG coordinates)
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

/** Get the circumference of the semi-circle. */
export function semiCircleLength(r: number): number {
  return Math.PI * r;
}

/** Convert a value ratio [0,1] to dasharray params for a semi-circle stroke. */
export function ratioToDash(
  startRatio: number,
  endRatio: number,
  totalLength: number
): { dasharray: string; dashoffset: number } {
  const segLength = (endRatio - startRatio) * totalLength;
  const offset = startRatio * totalLength;
  // dasharray: segment length, then gap for the rest
  return {
    dasharray: `${segLength} ${totalLength}`,
    dashoffset: -offset,
  };
}

/** Build zone dash params for alert zones. */
export function buildZoneDashes(
  zones: AlertZone[],
  min: number,
  max: number,
  totalLength: number
): { dasharray: string; dashoffset: number; color: string }[] {
  const range = max - min;
  if (range <= 0) return [];

  return zones.map((zone) => {
    const startRatio = (Math.max(zone.min, min) - min) / range;
    const endRatio = (Math.min(zone.max, max) - min) / range;
    const { dasharray, dashoffset } = ratioToDash(startRatio, endRatio, totalLength);
    return { dasharray, dashoffset, color: zone.color };
  });
}

/** Build value fill dash params. */
export function buildValueDash(
  value: number,
  min: number,
  max: number,
  totalLength: number
): { dasharray: string; dashoffset: number } {
  const ratio = (clamp(value, min, max) - min) / (max - min);
  return ratioToDash(0, ratio, totalLength);
}

/** Convert a value to needle angle (radians). PI = left, 0 = right. */
export function valueToAngle(value: number, min: number, max: number): number {
  const ratio = (clamp(value, min, max) - min) / (max - min);
  return Math.PI * (1 - ratio);
}
