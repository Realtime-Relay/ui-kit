import { useState, useEffect } from 'react';
import { useRelayApp } from '../context/RelayProvider';
import { normalizeRealtimePoint } from '../utils/data';

export interface UseRelayLatestResult {
  value: number | null;
  timestamp: number | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRelayLatest(
  deviceIdent: string,
  metric: string
): UseRelayLatestResult {
  const app = useRelayApp();
  const [value, setValue] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch latest value
  useEffect(() => {
    if (!app) return;
    let cancelled = false;

    async function fetchLatest() {
      try {
        const result = await app!.telemetry.latest({
          device_ident: deviceIdent,
          fields: [metric],
        });

        if (!cancelled && result.data && result.data.length > 0) {
          const entry = result.data[result.data.length - 1];
          if (entry[metric]) {
            setValue(Number(entry[metric].value));
            setTimestamp(entry[metric].timestamp);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchLatest();
    return () => { cancelled = true; };
  }, [app, deviceIdent, metric]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!app) return;
    let cancelled = false;

    app.telemetry.stream({
      device_ident: deviceIdent,
      metric,
      callback: (msg) => {
        if (cancelled) return;
        const point = normalizeRealtimePoint(msg);
        setValue(Number(point[metric]));
        setTimestamp(point.timestamp);
        setIsLoading(false);
      },
    });

    return () => {
      cancelled = true;
      app.telemetry.off({ device_ident: deviceIdent, metric: [metric] }).catch(() => {});
    };
  }, [app, deviceIdent, metric]);

  return { value, timestamp, isLoading, error };
}
