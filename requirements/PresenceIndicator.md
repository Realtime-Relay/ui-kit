# PresenceIndicator — Requirements

## Purpose
A visual dot indicator that communicates whether a device or entity is online or offline. Designed for IoT dashboards where device connectivity status needs to be shown at a glance.

## Functional Requirements

### FR-1: Online/Offline State
- **FR-1.1**: Accept a boolean `online` prop (required)
- **FR-1.2**: Render a filled circle in the online color when `online=true`
- **FR-1.3**: Render a filled circle in the offline color when `online=false`
- **FR-1.4**: Show a subtle outer glow (box-shadow) when online to provide additional visual differentiation beyond color
- **FR-1.5**: No glow when offline

### FR-2: Customization
- **FR-2.1**: Accept optional `onlineColor` string (CSS color) — overrides default
- **FR-2.2**: Accept optional `offlineColor` string (CSS color) — overrides default
- **FR-2.3**: Accept optional `size` number (pixels) — controls dot diameter

### FR-3: Theming
- **FR-3.1**: Default online color from CSS variable `--relay-presence-online` (fallback: #22c55e)
- **FR-3.2**: Default offline color from CSS variable `--relay-presence-offline` (fallback: #ef4444)
- **FR-3.3**: CSS variables can be overridden on any parent element for global theming
- **FR-3.4**: Per-instance props take precedence over CSS variables

### FR-4: Layout
- **FR-4.1**: Render as `inline-block` so it can be placed inline with text
- **FR-4.2**: `flexShrink: 0` to prevent compression in flex containers
- **FR-4.3**: Default size: 12px diameter

### FR-5: Animation
- **FR-5.1**: Color transitions animate over 200ms ease
- **FR-5.2**: Glow (box-shadow) transitions animate over 200ms ease

### FR-6: Accessibility
- **FR-6.1**: Render with `role="status"` for screen reader announcements
- **FR-6.2**: `aria-label` set to "Online" or "Offline" based on state

## Non-Functional Requirements

### NFR-1: Performance
- Zero runtime dependencies (pure CSS styling)
- No re-renders beyond prop changes

### NFR-2: Bundle Size
- Component is a single function with no imports beyond React types
- Should be <1KB minified

## RelayX SDK Integration

### SDK-1: useRelayPresence Hook
- **SDK-1.1**: Hook subscribes to `app.connection.presence(callback)` for real-time device presence events
- **SDK-1.2**: Filters events by `device_ident` to match the specified device
- **SDK-1.3**: Returns `{ online: boolean | null, lastEvent: PresenceEvent | null, isLoading: boolean, error: Error | null }`
- **SDK-1.4**: `online` is `null` until the first presence event is received
- **SDK-1.5**: `lastEvent` contains `{ event: 'connected' | 'disconnected', device_ident: string, data: { start: number, stop?: number } }`

## Props Interface

```typescript
interface PresenceIndicatorProps {
  online: boolean;         // required
  onlineColor?: string;    // default: var(--relay-presence-online, #22c55e)
  offlineColor?: string;   // default: var(--relay-presence-offline, #ef4444)
  size?: number;           // default: 12 (pixels)
}
```
