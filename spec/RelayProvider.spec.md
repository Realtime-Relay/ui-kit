# RelayProvider & Hooks — Spec

Source: `src/context/RelayProvider.tsx`, `src/hooks/*.ts`

## RelayProvider

### Purpose

Wraps the application and manages the RelayX App SDK connection lifecycle. Accepts a pre-built `RelayApp` instance, connects on mount, disconnects on unmount.

### Component Signature

```typescript
interface RelayProviderProps {
  app: RelayAppInstance;
  children: ReactNode;
}
```

### Usage

```tsx
import { RelayApp } from "relayx-app-js";

const app = new RelayApp({ api_key: "...", secret: "...", mode: "production" });

<RelayProvider app={app}>
  <App />
</RelayProvider>;
```

### Behavior

- Calls `app.connect()` on mount
- Calls `app.disconnect()` on unmount (cleanup)
- Listens to connection events: `connected`, `disconnected`, `reconnecting`, `reconnected`, `auth_failed`
- Provides `{ app, isConnected, error }` via React Context
- `auth_failed` → sets error, clears app reference

### Exposed Hooks

#### `useRelayApp(): RelayAppInstance | null`

- Returns the connected SDK instance, or `null` if not yet connected
- Does NOT throw — hooks should handle `null` gracefully

#### `useRelayConnection(): { app, isConnected, error }`

- Returns full connection state
- Useful for showing connection status in UI

---

## Hooks

### useRelayTimeSeries

```typescript
interface UseRelayTimeSeriesOptions {
  deviceIdent: string;
  metrics: string[];
  timeRange: { start: string; end: string };
  /** 'historical' fetches history only. 'realtime' subscribes to stream only. 'both' fetches history then streams. Default: 'historical'. */
  mode?: "realtime" | "historical" | "both";
  maxPoints?: number; // default: 10000
}

interface UseRelayTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}
```

Three modes:

#### `mode: 'historical'` (default)

- Fetches historical data via `app.telemetry.history()` using `timeRange` as the query window
- No stream subscription — data is fetched once and does not update
- Merges entries by timestamp, forward-fills missing metrics so each DataPoint has all values
- Suitable for static charts displaying a fixed time range

#### `mode: 'realtime'`

- Subscribes to live stream via `app.telemetry.stream()` — no history fetch
- Stream subscribes via `metric: metrics` (array)
- Buffers incoming points and flushes every 16ms (~1 frame)
- Flush merges buffer entries sharing the same timestamp (e.g. temperature + humidity arriving as separate messages), then forward-fills missing metrics from the last known values
- Caps accumulated data at `maxPoints` (default 10000), trimming oldest points
- Suitable for live-scrolling timeWindow charts
- Cleanup: calls `app.telemetry.off()` to unsubscribe NATS streams

#### `mode: 'both'`

- Fetches historical data first, then subscribes to the live stream
- Stream flush is gated by `historyLoaded` ref — buffered points are held until history arrives, preventing gaps
- After history loads, stream points are appended via the same merge/forward-fill logic as realtime mode
- Suitable for sparklines and charts that need historical context plus live updates

### useRelayLatest

```typescript
interface UseRelayLatestOptions {
  deviceIdent: string;
  metric: string;
  timeRange: TimeRange;
}

interface UseRelayLatestResult {
  value: number | null;
  timestamp: number | null;
  isLoading: boolean;
  error: Error | null;
}

function useRelayLatest(options: UseRelayLatestOptions): UseRelayLatestResult;
```

- Initiates both `telemetry.latest()` and `telemetry.stream()` concurrently in a single effect. Whichever delivers data first sets the value. Stream continues to update after.
- `latest()` now requires `start` and `end` ISO string params
- Stream uses `metric: [metric]` (array)
- Returns the most recent value and timestamp
- Cleanup: calls `app.telemetry.off()` to unsubscribe

### useRelayPresence

```typescript
interface UseRelayPresenceResult {
  online: boolean | null;
  lastEvent: PresenceEvent | null;
  isLoading: boolean;
  error: Error | null;
}

function useRelayPresence(deviceIdent: string): UseRelayPresenceResult;
```

- Subscribes to `app.connection.presence()` for real-time device presence events
- Filters events by `device_ident`
- `online` is `null` until first event received
- No unsubscribe method available (cleaned up when provider disconnects)

---

## RelayAppInstance Interface

The UI kit defines a minimal TypeScript interface for the SDK methods it uses. This avoids a hard dependency on the SDK package:

```typescript
interface RelayAppInstance {
  telemetry: {
    stream: (opts: {
      device_ident: string;
      metric: string | string[];
      callback: (data: any) => void;
    }) => Promise<void>;
    history: (opts: {
      device_ident: string;
      metric: string[];
      start: string;
      end: string;
    }) => Promise<Record<string, { value: any; timestamp: number }[]>>;
    latest: (opts: {
      device_ident: string;
      fields: string[];
      start: string;
      end: string;
    }) => Promise<Record<string, { value: any; timestamp: number }>>;
    off: (opts: { device_ident: string; metric?: string[] }) => Promise<void>;
  };
  connection: {
    listeners: (callback: (event: string) => void) => void;
    presence: (callback: (data: PresenceEvent) => void) => void;
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
```

## Data Flow

```
Developer's app
  └─ <RelayProvider app={relayApp}>
       └─ useRelayApp() → RelayAppInstance
       └─ useRelayTimeSeries() → DataPoint[] → <TimeSeries data={...} />
       └─ useRelayLatest() → RelayDataPoint → <StatCard data={latest} showLastUpdated />
       └─ useRelayLatest() → RelayDataPoint → <ArcGauge data={latest} showLastUpdated />
       └─ useRelayPresence() → { online } → <PresenceIndicator online={...} />
```

The recommended pattern for single-value components (StatCard, ProgressBar, NeedleGauge, ArcGauge, StatCardWithGraph) is to pass the full `useRelayLatest()` result via the `data` prop:

```tsx
const latest = useRelayLatest({
  deviceIdent: "sensor-1",
  metric: "temperature",
  timeRange,
});
<ArcGauge data={latest} showLastUpdated />;
```

The `data` prop is required on all single-value components. `data.value` provides the component value and `data.timestamp` provides the last updated timestamp.
