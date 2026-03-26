import { useRef, useEffect } from 'react';
import type { AlertZone } from './types';

export interface ZoneTransition {
  previousZone: AlertZone | null;
  currentZone: AlertZone | null;
  value: number;
}

function findZone(value: number, zones: AlertZone[]): AlertZone | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone;
  }
  return null;
}

/**
 * Detects when a value transitions between alert zones and fires a callback.
 * Compares zones by min/max/color identity — not by reference.
 */
export function useZoneTransition(
  value: number | undefined | null,
  zones: AlertZone[],
  onZoneChange?: (transition: ZoneTransition) => void
) {
  const prevZoneRef = useRef<AlertZone | null | undefined>(undefined);

  useEffect(() => {
    if (value == null || !onZoneChange || zones.length === 0) return;

    const currentZone = findZone(value, zones);

    // First call — initialize without firing
    if (prevZoneRef.current === undefined) {
      prevZoneRef.current = currentZone;
      return;
    }

    const prev = prevZoneRef.current;

    // Zone changed if one is null and other isn't, or if they differ
    const changed =
      (prev === null) !== (currentZone === null) ||
      (prev !== null && currentZone !== null && (
        prev.min !== currentZone.min ||
        prev.max !== currentZone.max ||
        prev.color !== currentZone.color
      ));

    if (changed) {
      onZoneChange({ previousZone: prev, currentZone, value });
      prevZoneRef.current = currentZone;
    }
  }, [value, zones, onZoneChange]);
}
