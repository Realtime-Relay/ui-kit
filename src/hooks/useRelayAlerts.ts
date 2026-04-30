import { useState, useEffect } from "react";
import { useRelayApp } from "../context/RelayProvider";
import type { TimeRange } from "../utils/types";

export type AlertState = "fire" | "resolved" | "ack";

export interface RelayAlertEvent {
  state: AlertState;
  value: any;
  timestamp: number;
  incidentId: string | null;
}

export interface UseRelayAlertsOptions {
  ruleType: "DEVICE" | "RULE";
  deviceIdent?: string;
  ruleId?: string;
  ruleStates?: AlertState[];
  incidentId?: string;
  timeRange: TimeRange;
  /** Refresh interval in ms. If set, history is re-fetched on this interval. */
  refreshInterval?: number;
}

export interface UseRelayAlertsResult {
  data: RelayAlertEvent[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

function toUTCISO(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  if (value.includes("T") && (value.endsWith("Z") || value.includes("+")))
    return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function useRelayAlerts({
  ruleType,
  deviceIdent,
  ruleId,
  ruleStates,
  incidentId,
  timeRange,
  refreshInterval,
}: UseRelayAlertsOptions): UseRelayAlertsResult {
  const app = useRelayApp();
  const [data, setData] = useState<RelayAlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const startUTC = toUTCISO(timeRange.start);
  const endUTCFixed = toUTCISO(timeRange.end);
  const statesKey = (ruleStates ?? []).join(",");
  // When polling, slide `end` to "now" on each tick so new alerts are picked up.
  const sliding = (refreshInterval ?? 0) > 0;

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const endUTC = sliding ? new Date().toISOString() : endUTCFixed;

    (async () => {
      try {
        console.log("[RelayX alert.history] fetching", {
          rule_type: ruleType,
          device_ident: deviceIdent,
          rule_id: ruleId,
          rule_states: ruleStates,
          incident_id: incidentId,
          start: startUTC,
          end: endUTC,
        });

        const effectiveStates: AlertState[] =
          ruleStates && ruleStates.length > 0
            ? ruleStates
            : ["fire", "resolved", "ack"];

        const result: any = await app.alert.history({
          rule_type: ruleType,
          ...(deviceIdent ? { device_ident: deviceIdent } : {}),
          ...(ruleId ? { rule_id: ruleId } : {}),
          rule_states: effectiveStates,
          ...(incidentId ? { incident_id: incidentId } : {}),
          start: startUTC,
          end: endUTC,
        });

        if (cancelled) return;

        // Spec shape: { events: [{ state, value, timestamp, incident_id }] }
        // Older SDK shape: { fire: [...], resolved: [...], ack: [...] }
        let events: RelayAlertEvent[];
        if (Array.isArray(result?.events)) {
          events = result.events.map((e: any) => ({
            state: e.state,
            value: e.value,
            timestamp: e.timestamp,
            incidentId: e.incident_id ?? null,
          }));
        } else {
          events = [];
          for (const state of effectiveStates) {
            const entries = result?.[state];
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
              events.push({
                state,
                value: entry.value,
                timestamp: entry.timestamp,
                incidentId: entry.incident_id ?? null,
              });
            }
          }
          events.sort((a, b) => a.timestamp - b.timestamp);
        }

        console.log(
          "[RelayX alert.history] received",
          events.length,
          "alert events",
        );
        setData(events);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[RelayX alert.history] error", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    app,
    ruleType,
    deviceIdent,
    ruleId,
    statesKey,
    incidentId,
    startUTC,
    endUTCFixed,
    sliding,
    tick,
  ]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return { data, isLoading, error, refresh: () => setTick((t) => t + 1) };
}
