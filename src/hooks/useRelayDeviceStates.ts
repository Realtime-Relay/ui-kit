import { useState, useEffect } from 'react';
import type { DataPoint, TimeRange } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';

export interface UseRelayDeviceStatesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches telemetry history for use with StateTimeline.
 * Returns raw DataPoint[] — pass to StateTimeline with a stateMapper function.
 */
export function useRelayDeviceStates(
  deviceIdent: string,
  metric: string,
  timeRange: TimeRange
): UseRelayDeviceStatesResult {
  const app = useRelayApp();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setIsLoading(true);

    async function fetch() {
      try {
        const start = timeRange.start instanceof Date
          ? timeRange.start.toISOString()
          : timeRange.start;
        const end = timeRange.end instanceof Date
          ? timeRange.end.toISOString()
          : timeRange.end;

        const result = await app!.telemetry.history({
          device_ident: deviceIdent,
          fields: [metric],
          start,
          end,
        });

        if (!cancelled && result.data) {
          const points: DataPoint[] = result.data
            .map((entry: any) => {
              if (entry[metric]) {
                return {
                  timestamp: entry[metric].timestamp,
                  [metric]: entry[metric].value,
                };
              }
              return null;
            })
            .filter(Boolean) as DataPoint[];

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

    fetch();
    return () => { cancelled = true; };
  }, [app, deviceIdent, metric, timeRange.start, timeRange.end]);

  return { data, isLoading, error };
}
