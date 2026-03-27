import type { DataPoint } from '../utils/types';

export interface StateEntry {
  state: string;
  start: number;
  end: number;
  color?: string;
}

export const DEFAULT_STATE_COLORS: Record<string, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  error: '#ef4444',
  offline: '#6b7280',
  online: '#22c55e',
};

export const FALLBACK_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

export function getStateColor(state: string, stateColors?: Record<string, string>, index?: number): string {
  if (stateColors?.[state]) return stateColors[state];
  if (DEFAULT_STATE_COLORS[state]) return DEFAULT_STATE_COLORS[state];
  return FALLBACK_COLORS[(index ?? 0) % FALLBACK_COLORS.length];
}

/**
 * Groups consecutive data points into state bands.
 * Sorts by timestamp, then collapses runs of the same mapped state.
 */
export function groupStateEntries(
  data: DataPoint[],
  metricKey: string,
  stateMapper: (value: any) => string,
): StateEntry[] {
  if (!metricKey || data.length === 0) return [];
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const result: StateEntry[] = [];
  let currentState: string | null = null;
  let start = 0;

  for (let i = 0; i < sorted.length; i++) {
    const state = stateMapper(sorted[i][metricKey]);
    if (state !== currentState) {
      if (currentState !== null) {
        result.push({ state: currentState, start, end: sorted[i].timestamp });
      }
      currentState = state;
      start = sorted[i].timestamp;
    }
  }
  // Close last entry
  if (currentState !== null) {
    const lastTs = sorted[sorted.length - 1].timestamp;
    result.push({ state: currentState, start, end: lastTs });
  }

  return result;
}
