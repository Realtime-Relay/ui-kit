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
 * Fetch historical alert events.
 *
 * Uses the org-wide alert.history endpoint:
 *   - rule_type: "ORG"             → no filters, every alert in the org
 *   - filters.deviceIdents          → forwarded as device_idents
 *   - filters.ruleIds (length === 1) → forwarded as rule_id (rule_type: "RULE")
 *   - filters.ruleIds (length > 1)  → fan out, one query per rule (no
 *                                      multi-rule support on the endpoint yet)
 *
 * Backend yields `rule_id` and `device_id` on every event, so callers always
 * know which rule/device emitted. Rule-name / rule-type enrichment happens
 * client-side via `getCachedById` after fetch.
 */
async function fetchHistorical(
  app: any,
  filters: UseRelayAlertsOptions["filters"],
  startUTC: string,
  endUTC: string,
): Promise<RelayAlertEvent[]> {
  const ruleIds = filters?.ruleIds ?? [];
  const deviceIdents = filters?.deviceIdents ?? [];

  const all: RelayAlertEvent[] = [];

  if (ruleIds.length > 1) {
    // Multi-rule fan-out (endpoint accepts a single rule_id today).
    for (const ruleId of ruleIds) {
      try {
        const result: any = await app.alert.history({
          rule_type: "RULE",
          rule_id: ruleId,
          ...(deviceIdents.length > 0 ? { device_idents: deviceIdents } : {}),
          rule_states: ["fire", "resolved", "ack"],
          start: startUTC,
          end: endUTC,
        });
        mergeIntoEvents(all, result);
      } catch (err) {
        console.warn(
          "[RelayX alert.history] rule fetch failed",
          ruleId,
          err,
        );
      }
    }
  } else {
    // Single query: ORG-wide, optionally narrowed by deviceIdents and/or one rule.
    const ruleType = ruleIds.length === 1 ? "RULE" : "ORG";
    try {
      const result: any = await app.alert.history({
        rule_type: ruleType,
        ...(ruleIds.length === 1 ? { rule_id: ruleIds[0] } : {}),
        ...(deviceIdents.length > 0 ? { device_idents: deviceIdents } : {}),
        rule_states: ["fire", "resolved", "ack"],
        start: startUTC,
        end: endUTC,
      });
      mergeIntoEvents(all, result);
    } catch (err) {
      console.warn("[RelayX alert.history] org fetch failed", err);
    }
  }

  // ─── Enrichment ────────────────────────────────────────────
  // Backend returns rule_id and device_id as UUIDs. Resolve them to
  // human-readable rule_name / rule_type / device_ident in three passes:
  //   1. Warm both caches via list() once.
  //   2. For any UUID still missing after warm, refresh per-miss
  //      (alert.getById for rules, device.list() once for devices).
  //   3. Walk the events and patch in the resolved fields.

  // Pass 1 — warm caches.
  const ruleById = new Map<string, any>();
  if (typeof app.alert.list === "function") {
    try {
      const r = await app.alert.list();
      const rules: any[] = Array.isArray(r) ? r : (r?.data ?? []);
      for (const rule of rules) {
        if (rule?.id) ruleById.set(rule.id, rule);
      }
    } catch {
      /* noop */
    }
  }

  const identByDeviceId = new Map<string, string>();
  const refreshDeviceCacheMap = () => {
    if (!app.device?.cache) return;
    for (const [ident, dev] of app.device.cache) {
      if (dev?.id) identByDeviceId.set(dev.id, ident);
    }
  };
  if (app.device && typeof app.device.list === "function") {
    try {
      await app.device.list();
    } catch {
      /* noop */
    }
  }
  refreshDeviceCacheMap();

  // Pass 2 — resolve misses.
  const missingRuleIds = new Set<string>();
  const missingDeviceIds = new Set<string>();
  for (const e of all) {
    if (e.rule_id && !ruleById.has(e.rule_id)) missingRuleIds.add(e.rule_id);
    if (e.device_id && !identByDeviceId.has(e.device_id))
      missingDeviceIds.add(e.device_id);
  }

  // Per-rule lookup via getById (auto-refreshes internally).
  if (missingRuleIds.size > 0 && typeof app.alert.getById === "function") {
    await Promise.all(
      [...missingRuleIds].map(async (id) => {
        try {
          const rule = await app.alert.getById(id);
          if (rule?.id) ruleById.set(rule.id, rule);
        } catch {
          /* noop */
        }
      }),
    );
  }

  // Devices have no getById — re-run list() once if any are still missing
  // (covers the "device added since last warm" case).
  if (
    missingDeviceIds.size > 0 &&
    app.device &&
    typeof app.device.list === "function"
  ) {
    try {
      await app.device.list();
      refreshDeviceCacheMap();
    } catch {
      /* noop */
    }
  }

  // Pass 3 — patch.
  for (const e of all) {
    if (e.rule_id) {
      const rule = ruleById.get(e.rule_id);
      if (rule) {
        e.rule_name = rule.name;
        e.rule_type = rule.type ?? "THRESHOLD";
      }
    }
    if (e.device_id) {
      const ident = identByDeviceId.get(e.device_id);
      if (ident) e.device_ident = ident;
    }
  }

  // Deduplicate (belt-and-braces).
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

function mergeIntoEvents(out: RelayAlertEvent[], result: any) {
  // Spec shape: { events: [{ state, value, timestamp, incident_id, rule_id, device_id }] }
  // rule_name / rule_type are filled in later via the rule cache.
  if (Array.isArray(result?.events)) {
    for (const e of result.events) {
      out.push({
        state: e.state,
        rule_id: e.rule_id ?? "",
        ...(e.device_id ? { device_id: e.device_id } : {}),
        incident_id: e.incident_id ?? null,
        timestamp: e.timestamp,
        ...(e.value !== undefined ? { rolling_state: e.value } : {}),
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
        rule_id: entry.rule_id ?? "",
        ...(entry.device_id ? { device_id: entry.device_id } : {}),
        incident_id: entry.incident_id ?? null,
        timestamp: entry.timestamp,
        ...(entry.value !== undefined ? { rolling_state: entry.value } : {}),
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
