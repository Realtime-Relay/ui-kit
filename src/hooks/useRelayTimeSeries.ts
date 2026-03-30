import { useState, useEffect, useRef } from "react";
import type { DataPoint, TimeRange } from "../utils/types";
import { useRelayApp } from "../context/RelayProvider";
import { normalizeRealtimePoint } from "../utils/data";

export interface UseRelayTimeSeriesOptions {
  deviceIdent: string;
  metrics: string[];
  timeRange: TimeRange;
  /** 'historical' fetches history only. 'realtime' subscribes to stream only. 'both' fetches history then streams. Default: 'historical'. */
  mode?: "realtime" | "historical" | "both";
  maxPoints?: number;
}

export interface UseRelayTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}

/** Convert a TimeRange start/end value to a UTC ISO string. */
function toUTCISO(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  if (value.includes("T") && (value.endsWith("Z") || value.includes("+")))
    return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function useRelayTimeSeries({
  deviceIdent,
  metrics,
  timeRange,
  mode = "historical",
  maxPoints = 10000,
}: UseRelayTimeSeriesOptions): UseRelayTimeSeriesResult {
  const app = useRelayApp();
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const realtimeBuffer = useRef<DataPoint[]>([]);
  const historyLoaded = useRef(mode !== "both"); // only gate stream flush in 'both' mode

  const startUTC = toUTCISO(timeRange.start);
  const endUTC = toUTCISO(timeRange.end);

  // Historical / both mode: fetch history
  const fetchHistory = mode === "historical" || mode === "both";
  useEffect(() => {
    if (!app || !fetchHistory) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    historyLoaded.current = false;

    async function fetchHistory() {
      try {
        console.log("[RelayX history] fetching", {
          device_ident: deviceIdent,
          fields: metrics,
          start: startUTC,
          end: endUTC,
        });

        const result = await app!.telemetry.history({
          device_ident: deviceIdent,
          fields: metrics,
          start: startUTC,
          end: endUTC,
        });

        if (!cancelled && result) {
          const byTimestamp = new Map<number, DataPoint>();

          for (const metric of metrics) {
            const entries = result[metric];
            if (!Array.isArray(entries)) continue;

            for (const entry of entries) {
              const point = normalizeRealtimePoint({ metric, data: entry });
              const existing = byTimestamp.get(point.timestamp);
              if (existing) {
                Object.assign(existing, point);
              } else {
                byTimestamp.set(point.timestamp, point);
              }
            }
          }

          const points = Array.from(byTimestamp.values());
          points.sort((a, b) => a.timestamp - b.timestamp);

          // Forward-fill missing metrics so each point has all values
          const lastKnown: Record<string, any> = {};
          for (const point of points) {
            for (const metric of metrics) {
              if (point[metric] !== undefined) {
                lastKnown[metric] = point[metric];
              } else if (lastKnown[metric] !== undefined) {
                point[metric] = lastKnown[metric];
              }
            }
          }

          console.log("[RelayX history] received", points.length, "points");
          historyLoaded.current = true;
          setData(points);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[RelayX history] error", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [app, deviceIdent, metrics.join(","), startUTC, endUTC, fetchHistory]);

  // Realtime / both mode: subscribe to stream
  const startStream = mode === "realtime" || mode === "both";
  useEffect(() => {
    if (!app || !startStream) return;
    let cancelled = false;
    if (mode === "realtime") setIsLoading(false);

    app!.telemetry.stream({
      device_ident: deviceIdent,
      metric: metrics,
      callback: (msg) => {
        if (cancelled) return;
        console.log("[RelayX stream]", msg.metric, msg.data);
        const point = normalizeRealtimePoint(msg);
        realtimeBuffer.current.push(point);
      },
    });

    // Flush realtime buffer — merge same-timestamp points, forward-fill,
    // then append. Only the small buffer is processed, not the full dataset.
    const interval = setInterval(() => {
      if (realtimeBuffer.current.length === 0) return;
      if (!historyLoaded.current) return; // in 'both' mode, wait for history

      const raw = realtimeBuffer.current;
      realtimeBuffer.current = [];

      // Merge buffer entries that share a timestamp (e.g. temp + humidity arrive separately)
      const byTs = new Map<number, DataPoint>();
      for (const p of raw) {
        const existing = byTs.get(p.timestamp);
        if (existing) {
          Object.assign(existing, p);
        } else {
          byTs.set(p.timestamp, { ...p });
        }
      }
      const merged = Array.from(byTs.values());

      setData((prev) => {
        // Forward-fill from the last existing point, then across the new batch
        const lastPoint = prev.length > 0 ? prev[prev.length - 1] : null;
        const lastKnown: Record<string, any> = {};
        if (lastPoint) {
          for (const m of metrics) {
            if (lastPoint[m] !== undefined) lastKnown[m] = lastPoint[m];
          }
        }
        for (const p of merged) {
          for (const m of metrics) {
            if (p[m] !== undefined) {
              lastKnown[m] = p[m];
            } else if (lastKnown[m] !== undefined) {
              p[m] = lastKnown[m];
            }
          }
        }

        const combined =
          prev.length + merged.length > maxPoints
            ? [...prev, ...merged].slice(-maxPoints)
            : [...prev, ...merged];
        return combined;
      });
    }, 16);

    return () => {
      cancelled = true;
      clearInterval(interval);
      app.telemetry
        .off({ device_ident: deviceIdent, metric: metrics })
        .catch(() => {});
    };
  }, [app, deviceIdent, metrics.join(","), maxPoints, startStream]);

  return { data, isLoading, error };
}
