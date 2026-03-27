import { describe, it, expect } from 'vitest';
import {
  getStateColor,
  groupStateEntries,
  DEFAULT_STATE_COLORS,
  FALLBACK_COLORS,
} from '../src/timelines/stateUtils';
import type { DataPoint } from '../src/utils/types';

// ─── getStateColor ──────────────────────────────────────────

describe('getStateColor', () => {
  it('returns custom color when stateColors has a match', () => {
    expect(getStateColor('hot', { hot: '#ff0000' }, 0)).toBe('#ff0000');
  });

  it('falls back to DEFAULT_STATE_COLORS for known state', () => {
    expect(getStateColor('normal', undefined, 0)).toBe('#22c55e');
  });

  it('falls back to DEFAULT_STATE_COLORS even when stateColors is provided but lacks the key', () => {
    expect(getStateColor('warning', { other: '#000' }, 0)).toBe('#f59e0b');
  });

  it('falls back to FALLBACK_COLORS by index for unknown state', () => {
    expect(getStateColor('unknown', undefined, 0)).toBe(FALLBACK_COLORS[0]);
    expect(getStateColor('unknown', undefined, 1)).toBe(FALLBACK_COLORS[1]);
    expect(getStateColor('unknown', undefined, 5)).toBe(FALLBACK_COLORS[5]);
  });

  it('FALLBACK_COLORS wraps around with modulo', () => {
    expect(getStateColor('x', undefined, 6)).toBe(FALLBACK_COLORS[0]);
    expect(getStateColor('x', undefined, 7)).toBe(FALLBACK_COLORS[1]);
  });

  it('index defaults to 0 when undefined', () => {
    expect(getStateColor('x', undefined, undefined)).toBe(FALLBACK_COLORS[0]);
  });

  it('resolves each DEFAULT_STATE_COLORS key correctly', () => {
    for (const [state, color] of Object.entries(DEFAULT_STATE_COLORS)) {
      expect(getStateColor(state, undefined, 0)).toBe(color);
    }
  });

  it('custom color takes priority over DEFAULT_STATE_COLORS', () => {
    expect(getStateColor('normal', { normal: '#abcdef' }, 0)).toBe('#abcdef');
  });
});

// ─── groupStateEntries ──────────────────────────────────────

describe('groupStateEntries', () => {
  const mapper = (v: any) => {
    const n = Number(v);
    if (n >= 70) return 'critical';
    if (n >= 40) return 'warning';
    return 'normal';
  };

  it('returns empty array for empty data', () => {
    expect(groupStateEntries([], 'value', mapper)).toEqual([]);
  });

  it('returns empty array when metricKey is empty string', () => {
    const data: DataPoint[] = [{ timestamp: 1000, value: 50 }];
    expect(groupStateEntries(data, '', mapper)).toEqual([]);
  });

  it('single data point produces one entry with start === end', () => {
    const data: DataPoint[] = [{ timestamp: 1000, value: 30 }];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ state: 'normal', start: 1000, end: 1000 });
  });

  it('two consecutive same-state points collapse into one entry', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 30 },
      { timestamp: 2000, value: 35 },
    ];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ state: 'normal', start: 1000, end: 2000 });
  });

  it('two different-state points produce two entries', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 30 },
      { timestamp: 2000, value: 80 },
    ];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result).toHaveLength(2);
    expect(result[0].state).toBe('normal');
    expect(result[1].state).toBe('critical');
    expect(result[0].end).toBe(2000);
    expect(result[1].start).toBe(2000);
  });

  it('sorts by timestamp regardless of input order', () => {
    const data: DataPoint[] = [
      { timestamp: 3000, value: 80 },
      { timestamp: 1000, value: 30 },
      { timestamp: 2000, value: 50 },
    ];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result[0].start).toBe(1000);
    expect(result[result.length - 1].end).toBe(3000);
  });

  it('collapses multi-point runs correctly', () => {
    // N, N, W, W, N → 3 entries
    const data: DataPoint[] = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 20 },
      { timestamp: 3000, value: 50 },
      { timestamp: 4000, value: 60 },
      { timestamp: 5000, value: 10 },
    ];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.state)).toEqual(['normal', 'warning', 'normal']);
  });

  it('uses stateMapper to transform raw values', () => {
    const customMapper = (v: any) => (Number(v) > 50 ? 'high' : 'low');
    const data: DataPoint[] = [
      { timestamp: 1000, value: 30 },
      { timestamp: 2000, value: 60 },
    ];
    const result = groupStateEntries(data, 'value', customMapper);
    expect(result).toHaveLength(2);
    expect(result[0].state).toBe('low');
    expect(result[1].state).toBe('high');
  });

  it('handles non-numeric metric values through mapper', () => {
    const stringMapper = (v: any) => (v === 'on' ? 'online' : 'offline');
    const data: DataPoint[] = [
      { timestamp: 1000, status: 'on' },
      { timestamp: 2000, status: 'off' },
    ];
    const result = groupStateEntries(data, 'status', stringMapper);
    expect(result).toHaveLength(2);
    expect(result[0].state).toBe('online');
    expect(result[1].state).toBe('offline');
  });

  it('all same state produces single entry spanning full range', () => {
    const data: DataPoint[] = [
      { timestamp: 1000, value: 10 },
      { timestamp: 2000, value: 20 },
      { timestamp: 3000, value: 30 },
    ];
    const result = groupStateEntries(data, 'value', mapper);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ state: 'normal', start: 1000, end: 3000 });
  });
});

// ─── Constants ──────────────────────────────────────────────

describe('constants', () => {
  it('DEFAULT_STATE_COLORS has exactly 6 keys', () => {
    expect(Object.keys(DEFAULT_STATE_COLORS)).toHaveLength(6);
  });

  it('FALLBACK_COLORS has exactly 6 entries', () => {
    expect(FALLBACK_COLORS).toHaveLength(6);
  });

  it('all DEFAULT_STATE_COLORS values are valid hex color strings', () => {
    for (const color of Object.values(DEFAULT_STATE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('all FALLBACK_COLORS values are valid hex color strings', () => {
    for (const color of FALLBACK_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
