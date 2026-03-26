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
import { RelayApp } from 'relayx-app-js';

const app = new RelayApp({ api_key: '...', secret: '...', mode: 'production' });

<RelayProvider app={app}>
  <App />
</RelayProvider>
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
  live?: boolean;        // default: true
  maxPoints?: number;    // default: 10000
}

interface UseRelayTimeSeriesResult {
  data: DataPoint[];
  isLoading: boolean;
  error: Error | null;
}
```

- Fetches historical data via `app.telemetry.history()`
- Subscribes to real-time stream via `app.telemetry.stream()` (when `live=true`)
- Merges historical + real-time data with forward-fill for missing metrics
- Buffers real-time points and flushes every 250ms
- Cleanup: calls `app.telemetry.off()` to unsubscribe NATS streams

### useRelayLatest

```typescript
interface UseRelayLatestResult {
  value: number | null;
  timestamp: number | null;
  isLoading: boolean;
  error: Error | null;
}

function useRelayLatest(deviceIdent: string, metric: string): UseRelayLatestResult
```

- Fetches latest value via `app.telemetry.latest()`
- Subscribes to real-time stream for that single metric
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

function useRelayPresence(deviceIdent: string): UseRelayPresenceResult
```

- Subscribes to `app.connection.presence()` for real-time device presence events
- Filters events by `device_ident`
- `online` is `null` until first event received
- No unsubscribe method available (cleaned up when provider disconnects)

### useRelayAlertZones

```typescript
function useRelayAlertZones(deviceIdent: string, metric: string): {
  zones: AlertZone[];
  isLoading: boolean;
  error: Error | null;
}
```

- Fetches alert rules via `app.alert.list()`
- Filters for rules matching the device/metric
- Maps rule thresholds to `AlertZone[]` format
- One-time fetch (no real-time subscription)

### useRelayAlertTimeline

```typescript
function useRelayAlertTimeline(ruleId: string, timeRange: TimeRange): {
  data: StateEntry[];
  isLoading: boolean;
  error: Error | null;
}
```

- Fetches alert history via `app.alert.history()`
- Maps fire/resolved/ack events to `StateEntry[]` for StateTimeline

### useRelayDeviceStates

```typescript
function useRelayDeviceStates(deviceIdent: string, timeRange: TimeRange): {
  data: StateEntry[];
  isLoading: boolean;
  error: Error | null;
}
```

- Fetches device state changes over time
- Maps to `StateEntry[]` for StateTimeline

---

## RelayAppInstance Interface

The UI kit defines a minimal TypeScript interface for the SDK methods it uses. This avoids a hard dependency on the SDK package:

```typescript
interface RelayAppInstance {
  telemetry: {
    stream: (opts) => Promise<void>;
    history: (opts) => Promise<{ status: string; data: any[] }>;
    latest: (opts) => Promise<{ status: string; data: any[] }>;
    off: (opts: { device_ident: string; metric?: string[] }) => Promise<void>;
  };
  connection: {
    listeners: (callback: (event: string) => void) => void;
    presence: (callback: (data: PresenceEvent) => void) => void;
  };
  alert: {
    list: () => Promise<{ status: string; data: any[] }>;
    history: (opts) => Promise<{ status: string; data: any[] }>;
  };
  device: {
    get: (ident: string) => Promise<{ status: string; data: any }>;
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
       └─ useRelayLatest() → { value, timestamp } → <StatCard value={...} />
       └─ useRelayPresence() → { online } → <PresenceIndicator online={...} />
```
