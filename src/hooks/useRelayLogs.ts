import { useState, useEffect, useRef } from "react";
import { useRelayApp } from "../context/RelayProvider";
import type { TimeRange } from "../utils/types";

export type LogLevel = "info" | "warn" | "error";

export interface RelayLog {
  deviceIdent: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}

export interface UseRelayLogsOptions {
  deviceIdent: string;
  levels?: LogLevel[];
  timeRange: TimeRange;
  /** 'historical' fetches history only. 'realtime' subscribes to stream only. 'both' fetches history then streams. Default: 'historical'. */
  mode?: "realtime" | "historical" | "both";
}

export interface UseRelayLogsResult {
  data: RelayLog[];
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

export function useRelayLogs({
  deviceIdent,
  levels,
  timeRange,
  mode = "historical",
}: UseRelayLogsOptions): UseRelayLogsResult {
  const app = useRelayApp();
  const [data, setData] = useState<RelayLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const buffer = useRef<RelayLog[]>([]);
  const historyLoaded = useRef(mode !== "both");
  const opChain = useRef<Promise<unknown>>(Promise.resolve());

  const startUTC = toUTCISO(timeRange.start);
  const endUTC = toUTCISO(timeRange.end);
  const levelsKey = (levels ?? []).join(",");

  const fetchHistory = mode === "historical" || mode === "both";
  useEffect(() => {
    if (!app || !fetchHistory) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    historyLoaded.current = false;

    (async () => {
      try {
        console.log("[RelayX log.history] fetching", {
          device_ident: deviceIdent,
          levels,
          start: startUTC,
          end: endUTC,
        });

        const result = await app.log.history({
          device_ident: deviceIdent,
          ...(levels ? { levels } : {}),
          start: startUTC,
          end: endUTC,
        });

        if (cancelled) return;

        const points: RelayLog[] = [];
        const wanted = (levels ?? ["info", "warn", "error"]) as LogLevel[];
        for (const level of wanted) {
          const entries = result[level];
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            const v = entry.value;
            let message: string;
            if (typeof v === "string") {
              message = v;
            } else if (v == null) {
              message = "";
            } else {
              try {
                message = JSON.stringify(v);
              } catch {
                message = String(v);
              }
            }
            points.push({ deviceIdent, level, message, timestamp: entry.timestamp });
          }
        }
        console.log("[RelayX log.history] raw result", result);
        points.sort((a, b) => a.timestamp - b.timestamp);

        console.log("[RelayX log.history] received", points.length, "logs");
        historyLoaded.current = true;
        setData(points);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[RelayX log.history] error", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, deviceIdent, levelsKey, startUTC, endUTC, fetchHistory]);

  const startStream = mode === "realtime" || mode === "both";
  useEffect(() => {
    if (!app || !startStream) return;
    let cancelled = false;
    if (mode === "realtime") setIsLoading(false);

    opChain.current = opChain.current
      .catch(() => {})
      .then(async () => {
        if (cancelled) return;
        try {
          await app.log.stream({
            device_ident: deviceIdent,
            ...(levels ? { levels } : {}),
            callback: (entry) => {
              if (cancelled) return;
              console.log("[RelayX log.stream]", entry.level, entry.data);
              buffer.current.push({
                deviceIdent,
                level: entry.level,
                message:
                  typeof entry.data === "string"
                    ? entry.data
                    : JSON.stringify(entry.data),
                timestamp: entry.timestamp,
              });
            },
          });
        } catch (err) {
          console.error("[RelayX log.stream] error", err);
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
      const ident = deviceIdent;
      opChain.current = opChain.current
        .catch(() => {})
        .then(async () => {
          try {
            await app.log.off({ device_ident: ident });
          } catch {
            /* noop */
          }
        });
    };
  }, [app, deviceIdent, levelsKey, startStream]);

  return { data, isLoading, error };
}
