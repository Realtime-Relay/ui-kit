import { useState, useEffect, useRef } from 'react';
import type { DataPoint, TimeRange } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';
import { normalizeRealtimePoint, mergeData } from '../utils/data';

export interface UseRelayTimeSeriesOptions {
  deviceIdent: string;
  metrics: string[];
  timeRange: TimeRange;
  /** When true, subscribes to real-time stream. When false, only fetches history. Default: true. */
  live?: boolean;
  maxPoints?: number;
}

export interface UseRelayTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}

/** Convert a TimeRange start/end value to a UTC ISO string. */
function toUTCISO(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  // If it's already an ISO string with timezone info, return as-is
  if (value.includes('T') && (value.endsWith('Z') || value.includes('+'))) return value;
  // datetime-local format: "2026-03-26T14:30" — parse as local, convert to UTC ISO
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function useRelayTimeSeries({
  deviceIdent,
  metrics,
  timeRange,
  live = true,
  maxPoints = 10000,
}: UseRelayTimeSeriesOptions): UseRelayTimeSeriesResult {
  const app = useRelayApp();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const realtimeBuffer = useRef<DataPoint[]>([]);

  const startUTC = toUTCISO(timeRange.start);
  const endUTC = toUTCISO(timeRange.end);

  // Fetch historical data
  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchHistory() {
      try {
        console.log('[RelayX history] fetching', { device_ident: deviceIdent, fields: metrics, start: startUTC, end: endUTC });

        const result = await app!.telemetry.history({
          device_ident: deviceIdent,
          fields: metrics,
          start: startUTC,
          end: endUTC,
        });

        if (!cancelled && result.data) {
          const points: DataPoint[] = result.data.map((entry: any) => {
            const point: DataPoint = { timestamp: 0 };
            for (const metric of metrics) {
              if (entry[metric]) {
                point.timestamp = entry[metric].timestamp;
                point[metric] = entry[metric].value;
              }
            }
            return point;
          }).filter((p: DataPoint) => p.timestamp > 0);

          points.sort((a, b) => a.timestamp - b.timestamp);
          console.log('[RelayX history] received', points.length, 'points');
          setData(points);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[RelayX history] error', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    // fetchHistory();
    return () => { cancelled = true; };
  }, [app, deviceIdent, metrics.join(','), startUTC, endUTC]);

  // Subscribe to real-time streams (only in live mode)
  useEffect(() => {
    if (!app || !live) return;
    let cancelled = false;

    for (const metric of metrics) {
      app!.telemetry.stream({
        device_ident: deviceIdent,
        metric,
        callback: (msg) => {
          if (cancelled) return;
          console.log('[RelayX stream]', msg.metric, msg.data);
          const point = normalizeRealtimePoint(msg);
          realtimeBuffer.current.push(point);
        },
      });
    }

    // Flush realtime buffer into state periodically
    const interval = setInterval(() => {
      if (realtimeBuffer.current.length === 0) return;
      const newPoints = [...realtimeBuffer.current];
      realtimeBuffer.current = [];

      setData((prev) => {
        const merged = mergeData(prev, newPoints);
        if (merged.length > maxPoints) {
          return merged.slice(merged.length - maxPoints);
        }
        return merged;
      });
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(interval);
      // Unsubscribe from NATS streams
      app.telemetry.off({ device_ident: deviceIdent, metric: metrics }).catch(() => {});
    };
  }, [app, deviceIdent, metrics.join(','), maxPoints, live]);

  return { data, isLoading, error };
}
