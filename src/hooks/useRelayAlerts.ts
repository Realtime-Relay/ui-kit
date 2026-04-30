import { useState, useEffect, useRef } from "react";
import { useRelayApp } from "../context/RelayProvider";
import type { TimeRange } from "../utils/types";

export type AlertState = "fire" | "resolved" | "ack";

/**
 * Uniform alert event shape — matches `app.alert.stream()` payload.
 * Historical events from `app.alert.history()` are normalized into this shape;
 * fields the history endpoint doesn't carry (rule_name, device_ident, etc.)
 * are best-effort enriched from the SDK rule cache.
 */
export interface RelayAlertEvent {
  state: AlertState;
  rule_id: string;
  rule_name?: string;
  rule_type?: "THRESHOLD" | "RATE_CHANGE" | "EPHEMERAL" | string;
  device_id?: string;
  device_ident?: string;
  incident_id: string | null;
  timestamp: number;
  rolling_state?: any;
  last_value?: any;
  ack?: { acked_by: string; acked_at: number; ack_notes: string | null };
}

export interface UseRelayAlertsOptions {
  /** 'historical' fetches history. 'realtime' subscribes to stream. 'both' fetches history then streams. Default: 'historical'. */
  mode?: "historical" | "realtime" | "both";
  filters?: {
    ruleIds?: string[];
    deviceIdents?: string[];
    groupIds?: string[];
  };
  /** Required for 'historical' / 'both'. Ignored for 'realtime'. */
  timeRange?: TimeRange;
}

export interface UseRelayAlertsResult {
  data: RelayAlertEvent[];
  isLoading: boolean;
  error: Error | null;
}

function toUTCISO(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  if (value.includes("T") && (value.endsWith("Z") || value.includes("+")))
    return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString();
}

/**
 * Fetch historical alert events for a single rule or device. The SDK only
 * exposes per-rule / per-device history queries — this helper iterates the
 * relevant filter list and merges results.
 */
async function fetchHistorical(
  app: any,
  filters: UseRelayAlertsOptions["filters"],
  startUTC: string,
  endUTC: string,
): Promise<RelayAlertEvent[]> {
  const ruleIds = filters?.ruleIds ?? [];
  const deviceIdents = filters?.deviceIdents ?? [];

  // If neither is set, we can't query history — the SDK requires at least
  // one. Iterate the rule list as a fallback so the dashboard still gets
  // a reconciled snapshot.
  let effectiveRuleIds = ruleIds;
  if (effectiveRuleIds.length === 0 && deviceIdents.length === 0) {
    const listResult = await app.alert.list();
    const rules = Array.isArray(listResult)
      ? listResult
      : (listResult?.data ?? []);
    effectiveRuleIds = rules.map((r: any) => r.id).filter(Boolean);
  }

  const all: RelayAlertEvent[] = [];

  // Per-rule queries
  for (const ruleId of effectiveRuleIds) {
    try {
      const result: any = await app.alert.history({
        rule_type: "RULE",
        rule_id: ruleId,
        rule_states: ["fire", "resolved", "ack"],
        start: startUTC,
        end: endUTC,
      });
      const enrich = await enrichmentForRule(app, ruleId);
      mergeIntoEvents(all, result, ruleId, enrich);
    } catch (err) {
      console.warn("[RelayX alert.history] rule fetch failed", ruleId, err);
    }
  }

  // Per-device queries
  for (const ident of deviceIdents) {
    try {
      const result: any = await app.alert.history({
        rule_type: "DEVICE",
        device_ident: ident,
        rule_states: ["fire", "resolved", "ack"],
        start: startUTC,
        end: endUTC,
      });
      mergeIntoEvents(all, result, undefined, { device_ident: ident });
    } catch (err) {
      console.warn("[RelayX alert.history] device fetch failed", ident, err);
    }
  }

  // Deduplicate (same incident_id + state + timestamp may appear via both
  // per-rule and per-device queries).
  const seen = new Set<string>();
  const deduped: RelayAlertEvent[] = [];
  for (const e of all) {
    const key = `${e.incident_id}|${e.state}|${e.timestamp}|${e.rule_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }
  deduped.sort((a, b) => a.timestamp - b.timestamp);
  return deduped;
}

async function enrichmentForRule(app: any, ruleId: string) {
  let rule: any = null;
  if (typeof app.alert.getCachedById === "function") {
    rule = app.alert.getCachedById(ruleId);
  }
  if (!rule && typeof app.alert.getById === "function") {
    try {
      rule = await app.alert.getById(ruleId);
    } catch {
      /* noop */
    }
  }
  return rule
    ? { rule_name: rule.name, rule_type: rule.type ?? "THRESHOLD" }
    : {};
}

function mergeIntoEvents(
  out: RelayAlertEvent[],
  result: any,
  ruleId: string | undefined,
  enrich: Partial<RelayAlertEvent>,
) {
  // Spec shape: { events: [{ state, value, timestamp, incident_id }] }
  if (Array.isArray(result?.events)) {
    for (const e of result.events) {
      out.push({
        state: e.state,
        rule_id: ruleId ?? e.rule_id ?? "",
        incident_id: e.incident_id ?? null,
        timestamp: e.timestamp,
        ...(e.value !== undefined ? { rolling_state: e.value } : {}),
        ...enrich,
      });
    }
    return;
  }
  // Older grouped shape: { fire: [...], resolved: [...], ack: [...] }
  for (const state of ["fire", "resolved", "ack"] as AlertState[]) {
    const entries = result?.[state];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      out.push({
        state,
        rule_id: ruleId ?? "",
        incident_id: entry.incident_id ?? null,
        timestamp: entry.timestamp,
        ...(entry.value !== undefined ? { rolling_state: entry.value } : {}),
        ...enrich,
      });
    }
  }
}

export function useRelayAlerts({
  mode = "historical",
  filters,
  timeRange,
}: UseRelayAlertsOptions): UseRelayAlertsResult {
  const app = useRelayApp();
  const [data, setData] = useState<RelayAlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const buffer = useRef<RelayAlertEvent[]>([]);
  const historyLoaded = useRef(mode !== "both");
  const opChain = useRef<Promise<unknown>>(Promise.resolve());

  const ruleIdsKey = (filters?.ruleIds ?? []).join(",");
  const deviceIdentsKey = (filters?.deviceIdents ?? []).join(",");
  const groupIdsKey = (filters?.groupIds ?? []).join(",");
  const startUTC = timeRange ? toUTCISO(timeRange.start) : "";
  const endUTC = timeRange ? toUTCISO(timeRange.end) : "";

  const fetchHistory = mode === "historical" || mode === "both";
  useEffect(() => {
    if (!app || !fetchHistory) return;
    if (!timeRange) {
      setError(new Error("timeRange is required for historical/both mode"));
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    historyLoaded.current = false;

    (async () => {
      try {
        console.log("[RelayX alert.history] fetching", {
          filters,
          start: startUTC,
          end: endUTC,
        });
        const events = await fetchHistorical(app, filters, startUTC, endUTC);
        if (cancelled) return;
        console.log(
          "[RelayX alert.history] received",
          events.length,
          "alert events",
        );
        historyLoaded.current = true;
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
    ruleIdsKey,
    deviceIdentsKey,
    groupIdsKey,
    startUTC,
    endUTC,
    fetchHistory,
  ]);

  const startStream = mode === "realtime" || mode === "both";
  useEffect(() => {
    if (!app || !startStream) return;
    if (typeof app.alert.stream !== "function") {
      setError(
        new Error(
          "app.alert.stream is not implemented in this SDK version — upgrade to use 'realtime' / 'both' modes",
        ),
      );
      return;
    }
    let cancelled = false;
    if (mode === "realtime") setIsLoading(false);

    let subscription: { off: () => Promise<void> } | null = null;

    // Serialize subscribe/unsubscribe so strict-mode double-mount or
    // back-to-back hook re-renders don't race against the SDK consumers.
    opChain.current = opChain.current
      .catch(() => {})
      .then(async () => {
        if (cancelled) return;
        try {
          subscription = await app.alert.stream({
            filters: filters ?? {},
            callback: (e: any) => {
              if (cancelled) return;
              console.log("[RelayX alert.stream]", e.state, e.rule_name, e);
              buffer.current.push(e as RelayAlertEvent);
            },
          });
        } catch (err) {
          console.error("[RelayX alert.stream] error", err);
        }
      });

    const interval = setInterval(() => {
      if (buffer.current.length === 0) return;
      if (!historyLoaded.current) return;
      const incoming = buffer.current;
      buffer.current = [];
      setData((prev) => [...prev, ...incoming]);
    }, 16);

    return () => {
      cancelled = true;
      clearInterval(interval);
      const captured = subscription;
      opChain.current = opChain.current
        .catch(() => {})
        .then(async () => {
          if (captured) {
            try {
              await captured.off();
            } catch {
              /* noop */
            }
          }
        });
    };
  }, [app, ruleIdsKey, deviceIdentsKey, groupIdsKey, startStream]);

  return { data, isLoading, error };
}
