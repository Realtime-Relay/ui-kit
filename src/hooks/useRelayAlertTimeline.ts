import { useState, useEffect } from 'react';
import type { DataPoint, TimeRange } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';

export interface UseRelayAlertTimelineResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches alert history for use with StateTimeline.
 * Returns DataPoint[] where the value is the alert state (fire, resolved, ack).
 * Pass to StateTimeline with a stateMapper that returns the state string.
 */
export function useRelayAlertTimeline(
  ruleId: string,
  ruleType: 'RULE' | 'DEVICE',
  timeRange: TimeRange
): UseRelayAlertTimelineResult {
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

        const result = await app!.alert.history({
          rule_type: ruleType,
          rule_id: ruleId,
          rule_states: ['fire', 'resolved', 'ack', 'ack_all'],
          start,
          end,
        });

        if (!cancelled && result.data) {
          const points: DataPoint[] = result.data.map((entry: any) => ({
            timestamp: entry.timestamp,
            alertState: entry.state ?? entry.rule_state ?? 'unknown',
          }));

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
  }, [app, ruleId, ruleType, timeRange.start, timeRange.end]);

  return { data, isLoading, error };
}
