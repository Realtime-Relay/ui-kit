# RelayX UI Kit

Pre-built React components and data hooks for building real-time IoT dashboards on top of the RelayX App SDK.

> **[View Full Documentation →](https://docs.relay-x.io/ui-kit/overview)**

## Quick start

```tsx
import { RelayApp } from "@relay-x/app-sdk";
import { RelayProvider, useRelayTimeSeries, TimeSeries } from "@relayx/ui";

const app = new RelayApp({ api_key: "...", secret: "...", mode: "production" });

function Chart() {
  const { data } = useRelayTimeSeries({
    deviceIdent: "sensor-1",
    metrics: ["temperature", "humidity"],
    timeRange: { start: "2026-04-29T00:00:00Z", end: "2026-04-30T00:00:00Z" },
    mode: "both",
  });
  return <TimeSeries data={{ sensor1: data }} metricKeys={["temperature"]} />;
}

<RelayProvider app={app}>
  <Chart />
</RelayProvider>;
```

## Hooks

All data hooks share the envelope `{ data, isLoading, error }`. Streaming hooks accept `mode: 'historical' | 'realtime' | 'both'`. Polling hooks accept `refreshInterval` (ms) and expose a manual `refresh()`.

| Hook | Purpose | Modes |
|---|---|---|
| `useRelayTimeSeries` | Telemetry — multi-metric, merged + forward-filled. Supports `interval` + `aggregateFn` (Flux bucketing, server-side aggregation: mean/min/max/sum/count/first/last/median/stddev). NaN values are dropped. | `historical` / `realtime` / `both` |
| `useRelayLatest` | Latest single-metric value with auto-refresh from the live stream. | n/a (always live) |
| `useRelayPresence` | Device online/offline state. | n/a (always live) |
| `useRelayEvents` | Named device events. | `historical` / `realtime` / `both` |
| `useRelayLogs` | Device logs filtered by level (info/warn/error). | `historical` / `realtime` / `both` |
| `useRelayCommands` | Command-send history per device. Sliding `end` on refresh. | `historical` only (poll via `refreshInterval`) |
| `useRelayAlerts` | Fire/resolved/ack feed across the org with optional `ruleIds` / `deviceIdents` / `groupIds` filters. Returns flat snake_case events; frontend reduces by `incident_id` for incident-level UI. | `historical` / `realtime` / `both` |

### Aggregation example

```tsx
useRelayTimeSeries({
  deviceIdent: "sensor-1",
  metrics: ["cpu_usage"],
  timeRange,
  interval: "5m",
  aggregateFn: "mean", // 5-minute mean buckets
});
```

### Polling example

```tsx
const { data, refresh } = useRelayCommands({
  name: "reboot",
  deviceIdents: ["sensor-1", "sensor-2"],
  timeRange,
  refreshInterval: 5000, // every 5s; `end` slides to "now" each tick
});
```

### Alerts feed example

```tsx
const { data } = useRelayAlerts({
  mode: "both",
  filters: { deviceIdents: ["sensor-1"] },
  timeRange: { start: new Date(Date.now() - 24 * 3600 * 1000), end: new Date() },
});

// Each event (snake_case, matches app.alert.stream() payload):
// { state, rule_id, rule_name, rule_type, device_id, device_ident,
//   incident_id, timestamp, rolling_state? | last_value? | ack? }

// Reduce to active-incident view (one row per incident):
const active = new Map<string, (typeof data)[number]>();
for (const e of data) {
  if (!e.incident_id) continue;
  if (e.state === "resolved") active.delete(e.incident_id);
  else active.set(e.incident_id, e); // latest event wins
}
```

`mode: 'both'` reconciles via `app.alert.history()` (silent on page load) then takes over with `app.alert.stream()` from `now`. Filters are AND-combined; omit them all to subscribe to every alert in the org.

## Components

`TimeSeries`, `BarGraph`, `NeedleGauge`, `ArcGauge`, `StatCard`, `StatCardWithGraph`, `PresenceIndicator`, `ProgressBar`, `StateTimeline`. See the [docs site](https://docs.relay-x.io/ui-kit/overview) for prop reference.

## See also

- Spec: `Specs/UI Kit/spec/RelayProvider.spec.md` (provider + hooks)
- Example app: `example/`
