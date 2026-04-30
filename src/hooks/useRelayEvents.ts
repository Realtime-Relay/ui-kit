import { useState, useEffect, useRef } from "react";
import { useRelayApp } from "../context/RelayProvider";
import type { TimeRange } from "../utils/types";

export interface RelayEvent {
  name: string;
  deviceIdent: string;
  value: any;
  timestamp: number;
}

export interface UseRelayEventsOptions {
  deviceIdent: string;
  eventNames: string[];
  timeRange: TimeRange;
  /** 'historical' fetches history only. 'realtime' subscribes to stream only. 'both' fetches history then streams. Default: 'historical'. */
  mode?: "realtime" | "historical" | "both";
}

export interface UseRelayEventsResult {
  data: RelayEvent[];
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

export function useRelayEvents({
  deviceIdent,
  eventNames,
  timeRange,
  mode = "historical",
}: UseRelayEventsOptions): UseRelayEventsResult {
  const app = useRelayApp();
  const [data, setData] = useState<RelayEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const buffer = useRef<RelayEvent[]>([]);
  const historyLoaded = useRef(mode !== "both");
  const opChain = useRef<Promise<unknown>>(Promise.resolve());

  const startUTC = toUTCISO(timeRange.start);
  const endUTC = toUTCISO(timeRange.end);

  const fetchHistory = mode === "historical" || mode === "both";
  useEffect(() => {
    if (!app || !fetchHistory) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    historyLoaded.current = false;

    (async () => {
      try {
        console.log("[RelayX events.history] fetching", {
          device_ident: deviceIdent,
          event_names: eventNames,
          start: startUTC,
          end: endUTC,
        });

        const result = await app.events.history({
          device_ident: deviceIdent,
          event_names: eventNames,
          start: startUTC,
          end: endUTC,
        });

        if (cancelled) return;

        const points: RelayEvent[] = [];
        for (const name of eventNames) {
          const entries = result[name];
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            points.push({
              name,
              deviceIdent,
              value: entry.value,
              timestamp: entry.timestamp,
            });
          }
        }
        points.sort((a, b) => a.timestamp - b.timestamp);

        console.log("[RelayX events.history] received", points.length, "events");
        historyLoaded.current = true;
        setData(points);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[RelayX events.history] error", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, deviceIdent, eventNames.join(","), startUTC, endUTC, fetchHistory]);

  const startStream = mode === "realtime" || mode === "both";
  useEffect(() => {
    if (!app || !startStream) return;
    let cancelled = false;
    if (mode === "realtime") setIsLoading(false);

    // Serialize subscribe/unsubscribe so strict-mode double-mount and
    // back-to-back hook re-renders don't race against the SDK's
    // "one subscription per name" lock.
    opChain.current = opChain.current
      .catch(() => {})
      .then(async () => {
        for (const name of eventNames) {
          if (cancelled) return;
          try {
            await app.events.stream({
              name,
              device_ident: [deviceIdent],
              callback: (payload) => {
                if (cancelled) return;
                for (const [ident, raw] of Object.entries(payload)) {
                  console.log("[RelayX events.stream]", name, ident, raw);
                  const hasShape =
                    raw && typeof raw === "object" && "value" in raw;
                  const value = hasShape ? (raw as any).value : raw;
                  const ts =
                    raw && typeof raw === "object" && "timestamp" in raw
                      ? (raw as any).timestamp
                      : Date.now();
                  buffer.current.push({
                    name,
                    deviceIdent: ident,
                    value,
                    timestamp: ts,
                  });
                }
              },
            });
          } catch (err) {
            console.error("[RelayX events.stream] error", err);
          }
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
      const names = eventNames.slice();
      opChain.current = opChain.current
        .catch(() => {})
        .then(async () => {
          for (const name of names) {
            try {
              await app.events.off({ name });
            } catch {
              /* noop */
            }
          }
        });
    };
  }, [app, deviceIdent, eventNames.join(","), startStream]);

  return { data, isLoading, error };
}
