import { useState, useEffect } from "react";
import { useRelayApp } from "../context/RelayProvider";
import type { TimeRange } from "../utils/types";

export interface RelayCommand {
  name: string;
  deviceIdent: string;
  value: any;
  timestamp: number;
}

export interface UseRelayCommandsOptions {
  name: string;
  deviceIdents: string[];
  timeRange: TimeRange;
  /** Refresh interval in ms. If set, history is re-fetched on this interval. */
  refreshInterval?: number;
}

export interface UseRelayCommandsResult {
  data: RelayCommand[];
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

export function useRelayCommands({
  name,
  deviceIdents,
  timeRange,
  refreshInterval,
}: UseRelayCommandsOptions): UseRelayCommandsResult {
  const app = useRelayApp();
  const [data, setData] = useState<RelayCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const startUTC = toUTCISO(timeRange.start);
  const endUTCFixed = toUTCISO(timeRange.end);
  const identsKey = deviceIdents.join(",");
  // When polling, slide `end` to "now" on each tick so new commands are picked up.
  const sliding = (refreshInterval ?? 0) > 0;

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const endUTC = sliding ? new Date().toISOString() : endUTCFixed;

    (async () => {
      try {
        console.log("[RelayX command.history] fetching", {
          name,
          device_idents: deviceIdents,
          start: startUTC,
          end: endUTC,
        });

        const result = await app.command.history({
          name,
          device_idents: deviceIdents,
          start: startUTC,
          end: endUTC,
        });

        if (cancelled) return;

        console.log("[RelayX command.history] raw result", result);

        const points: RelayCommand[] = [];
        const identErrors: string[] = [];
        for (const ident of deviceIdents) {
          const entries = result[ident];
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              points.push({
                name,
                deviceIdent: ident,
                value: entry.value,
                timestamp: entry.timestamp,
              });
            }
          } else if (entries && typeof entries === "object" && "error" in entries) {
            identErrors.push(`${ident}: ${(entries as any).error}`);
          }
        }
        points.sort((a, b) => a.timestamp - b.timestamp);

        if (identErrors.length > 0) {
          console.warn("[RelayX command.history] ident errors", identErrors);
        }

        console.log(
          "[RelayX command.history] received",
          points.length,
          "commands across",
          deviceIdents.length,
          "ident(s)",
        );
        setData(points);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[RelayX command.history] error", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, name, identsKey, startUTC, endUTCFixed, sliding, tick]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return { data, isLoading, error, refresh: () => setTick((t) => t + 1) };
}
