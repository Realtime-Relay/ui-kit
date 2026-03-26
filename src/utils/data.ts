import type { DataPoint } from './types';

/**
 * Normalize a real-time SDK telemetry message into a DataPoint.
 * SDK shape: { metric: string, data: { value: any, timestamp: number } }
 */
export function normalizeRealtimePoint(msg: {
  metric: string;
  data: { value: any; timestamp: number };
}): DataPoint {
  return {
    timestamp: msg.data.timestamp,
    [msg.metric]: msg.data.value,
  };
}

/**
 * Normalize a historical SDK data entry into a DataPoint.
 * SDK shape varies — this handles the { [metric]: { value, timestamp } } format.
 */
export function normalizeHistoricalPoint(
  entry: Record<string, { value: any; timestamp: number }>
): DataPoint {
  const point: DataPoint = { timestamp: 0 };
  for (const [metric, data] of Object.entries(entry)) {
    if (data && typeof data === 'object' && 'timestamp' in data) {
      point.timestamp = data.timestamp;
      point[metric] = data.value;
    }
  }
  return point;
}

/**
 * Merge historical and real-time data into a single sorted array.
 * Points with the same timestamp are combined (all metric values merged).
 * Missing metric values are forward-filled from the previous point so
 * lines don't drop to zero when only one metric arrives per message.
 */
export function mergeData(
  historical: DataPoint[],
  realtime: DataPoint[]
): DataPoint[] {
  const merged = [...historical, ...realtime];
  merged.sort((a, b) => a.timestamp - b.timestamp);

  // Deduplicate by timestamp — merge metric values
  const seen = new Map<number, DataPoint>();
  for (const point of merged) {
    const existing = seen.get(point.timestamp);
    if (existing) {
      seen.set(point.timestamp, { ...existing, ...point });
    } else {
      seen.set(point.timestamp, point);
    }
  }

  const result = Array.from(seen.values());

  // Forward-fill: if a point is missing a metric that existed in the previous point,
  // carry the previous value forward. This prevents lines from dropping to 0.
  if (result.length > 1) {
    const allKeys = new Set<string>();
    for (const p of result) {
      for (const k of Object.keys(p)) {
        if (k !== 'timestamp') allKeys.add(k);
      }
    }

    for (let i = 1; i < result.length; i++) {
      for (const key of allKeys) {
        if (result[i][key] === undefined && result[i - 1][key] !== undefined) {
          result[i][key] = result[i - 1][key];
        }
      }
    }
  }

  return result;
}

/**
 * Apply a sliding window to keep only the most recent N points.
 */
export function applyWindow(data: DataPoint[], maxPoints: number): DataPoint[] {
  if (data.length <= maxPoints) return data;
  return data.slice(data.length - maxPoints);
}
