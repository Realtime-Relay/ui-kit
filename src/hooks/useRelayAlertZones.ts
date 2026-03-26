import { useState, useEffect } from 'react';
import type { AlertZone } from '../utils/types';
import { useRelayApp } from '../context/RelayProvider';

export interface UseRelayAlertZonesResult {
  zones: AlertZone[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches alert rules from RelayX and converts threshold configs into AlertZone[].
 * Pass the result directly to a chart's `alertZones` prop.
 */
export function useRelayAlertZones(
  deviceIdent: string,
  metric: string
): UseRelayAlertZonesResult {
  const app = useRelayApp();
  const [zones, setZones] = useState<AlertZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;

    async function fetchAlertRules() {
      try {
        const result = await app!.alert.list();
        if (cancelled) return;

        if (result.data) {
          const alertZones: AlertZone[] = [];

          for (const rule of result.data) {
            // Filter rules relevant to this device/metric
            if (!rule.config) continue;

            const config = rule.config;
            // Threshold alert rules typically have min/max or threshold values
            if (config.type === 'THRESHOLD' && config.metric === metric) {
              if (config.threshold_upper != null) {
                alertZones.push({
                  min: config.threshold_upper,
                  max: config.threshold_upper * 1.5, // extend to visible range
                  color: '#ef4444', // red for upper threshold
                  label: rule.name ?? 'Alert',
                });
              }
              if (config.threshold_lower != null) {
                alertZones.push({
                  min: config.threshold_lower * 0.5,
                  max: config.threshold_lower,
                  color: '#f59e0b', // amber for lower threshold
                  label: rule.name ?? 'Alert',
                });
              }
            }
          }

          setZones(alertZones);
        }
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchAlertRules();
    return () => { cancelled = true; };
  }, [app, deviceIdent, metric]);

  return { zones, isLoading, error };
}
