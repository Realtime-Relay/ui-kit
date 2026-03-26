import { useState, useEffect, useRef, useCallback } from 'react';
import type { DataPoint, TimeRange } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';
import { normalizeRealtimePoint, mergeData } from '../utils/data';

export interface UseRelayTimeSeriesOptions {
  deviceIdent: string;
  metrics: string[];
  timeRange: TimeRange;
  maxPoints?: number;
}

export interface UseRelayTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}

export function useRelayTimeSeries({
  deviceIdent,
  metrics,
  timeRange,
  maxPoints = 10000,
}: UseRelayTimeSeriesOptions): UseRelayTimeSeriesResult {
  const app = useRelayApp();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const realtimeBuffer = useRef<DataPoint[]>([]);

  // Fetch historical data
  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchHistory() {
      try {
        const start = timeRange.start instanceof Date
          ? timeRange.start.toISOString()
          : timeRange.start;
        const end = timeRange.end instanceof Date
          ? timeRange.end.toISOString()
          : timeRange.end;

        const result = await app!.telemetry.history({
          device_ident: deviceIdent,
          fields: metrics,
          start,
          end,
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
          setData(points);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [app, deviceIdent, metrics.join(','), timeRange.start, timeRange.end]);

  // Subscribe to real-time streams
  useEffect(() => {
    if (!app) return;
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
        // Trim to maxPoints
        if (merged.length > maxPoints) {
          return merged.slice(merged.length - maxPoints);
        }
        return merged;
      });
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [app, deviceIdent, metrics.join(','), maxPoints]);

  return { data, isLoading, error };
}
