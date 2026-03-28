import { useState, useEffect, useRef } from 'react';
import type { TimeRange } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';
import { normalizeRealtimePoint } from '../utils/data';

export interface UseRelayLatestOptions {
  deviceIdent: string;
  metric: string;
  timeRange: TimeRange;
}

export interface UseRelayLatestResult {
  value: number | null;
  timestamp: number | null;
  isLoading: boolean;
  error: Error | null;
}

/** Convert a TimeRange start/end value to a UTC ISO string. */
function toUTCISO(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  if (value.includes('T') && (value.endsWith('Z') || value.includes('+'))) return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function useRelayLatest({
  deviceIdent,
  metric,
  timeRange,
}: UseRelayLatestOptions): UseRelayLatestResult {
  const app = useRelayApp();
  const [value, setValue] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasData = useRef(false);

  const startUTC = toUTCISO(timeRange.start);
  const endUTC = toUTCISO(timeRange.end);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    hasData.current = false;

    // Start stream
    app.telemetry.stream({
      device_ident: deviceIdent,
      metric: [metric],
      callback: (msg) => {
        if (cancelled) return;
        
        hasData.current = true;
        
        const point = normalizeRealtimePoint(msg);
        
        setValue(Number(point[metric]));
        setTimestamp(point.timestamp);
        setIsLoading(false);
      },
    });

    // Fetch latest — only apply if stream hasn't delivered yet
    async function fetchLatest() {
      try {
        const result = await app!.telemetry.latest({
          device_ident: deviceIdent,
          fields: [metric],
          start: startUTC,
          end: endUTC,
        });

        if (!cancelled && !hasData.current && result[metric]) {
          
          hasData.current = true;
          
          setValue(Number(result[metric].value));
          setTimestamp(result[metric].timestamp);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled && !hasData.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchLatest();

    return () => {
      cancelled = true;
      app.telemetry.off({ device_ident: deviceIdent, metric: [metric] }).catch(() => {});
    };
  }, [app, deviceIdent, metric, startUTC, endUTC]);

  return { value, timestamp, isLoading, error };
}
