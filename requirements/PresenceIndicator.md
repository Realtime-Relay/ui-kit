# PresenceIndicator — Requirements

## Purpose

A visual dot indicator that communicates whether a device or entity is online or offline. Designed for IoT dashboards where device connectivity status needs to be shown at a glance alongside device names, table rows, or card headers. The indicator is a single colored circle with an optional animated glow halo that provides redundant visual differentiation beyond color alone.

## Use Cases

- **Device list rows** — inline dot next to a device name showing live/dead status.
- **Dashboard cards** — small indicator in a card header confirming the data source is connected.
- **Map overlays** — colored dot on a floor plan or site map.
- **Status tables** — column cell showing presence for each row.

---

## Functional Requirements

### FR-1: Online/Offline State

| ID | Requirement |
|----|-------------|
| FR-1.1 | Accept a `online` prop (required, typed as `boolean`). |
| FR-1.2 | When `online` is `true`, render the dot in the **online color** with a box-shadow glow halo. |
| FR-1.3 | When `online` is `false`, render the dot in the **offline color** with no box-shadow. |
| FR-1.4 | The glow halo is a solid-color ring at 20% opacity (`#RRGGBB33` hex suffix) surrounding the dot. It provides additional differentiation beyond color for users who may not distinguish green from red. |
| FR-1.5 | The glow spread radius scales proportionally with the parent container width so the halo remains visually proportionate at any dashboard size. |
| FR-1.6 | When the `online` prop toggles, both the background color and the glow animate smoothly (see FR-5). There is no "jump" or flicker. |

### FR-2: Color Customization

| ID | Requirement |
|----|-------------|
| FR-2.1 | Accept an optional `onlineColor` prop (`string`, any valid CSS color value). When provided, this color is used for the dot background and glow when online, overriding both the CSS custom property and the hardcoded fallback. |
| FR-2.2 | Accept an optional `offlineColor` prop (`string`, any valid CSS color value). When provided, this color is used for the dot background when offline, overriding both the CSS custom property and the hardcoded fallback. |
| FR-2.3 | Color resolution priority (highest to lowest): (1) per-instance prop, (2) CSS custom property on nearest ancestor, (3) hardcoded fallback. |
| FR-2.4 | The component does **not** validate color strings. If an invalid CSS color is passed, the browser renders the default (transparent) background. This is intentional — no runtime error is thrown. |

### FR-3: Size

| ID | Requirement |
|----|-------------|
| FR-3.1 | Accept an optional `size` prop (`number`, in CSS pixels). Controls both width and height of the dot. |
| FR-3.2 | Default size is **12px** when `size` is not provided. |
| FR-3.3 | The dot is always a perfect circle (`borderRadius: 50%`). |
| FR-3.4 | `size` is applied as exact pixels. The dot itself does **not** scale proportionally with the parent container — only the glow spread scales. |
| FR-3.5 | A `size` of `0` produces a zero-dimension element. The component still renders in the DOM (for accessibility) but is visually invisible. |

### FR-4: Theming via CSS Custom Properties

| ID | Requirement |
|----|-------------|
| FR-4.1 | Default online color reads from `--relay-presence-online` with a fallback of `#22c55e` (Tailwind green-500). |
| FR-4.2 | Default offline color reads from `--relay-presence-offline` with a fallback of `#ef4444` (Tailwind red-500). |
| FR-4.3 | CSS custom properties can be set on any ancestor element. The component uses `var()` syntax so the browser resolves the nearest ancestor value at paint time. |
| FR-4.4 | Per-instance color props (`onlineColor`, `offlineColor`) take absolute precedence over CSS custom properties. When a prop is supplied, the `var()` expression is not emitted at all. |

### FR-5: Animation

| ID | Requirement |
|----|-------------|
| FR-5.1 | `background-color` transitions over **200ms** with `ease` timing. |
| FR-5.2 | `box-shadow` transitions over **200ms** with `ease` timing. |
| FR-5.3 | Both transitions are declared in a single `transition` shorthand so they animate in parallel when the `online` prop toggles. |
| FR-5.4 | There is no entry animation on mount. The component renders in its final state immediately. |
| FR-5.5 | There is no `prefers-reduced-motion` override. The 200ms transition is short enough to be non-disruptive. |

### FR-6: Layout

| ID | Requirement |
|----|-------------|
| FR-6.1 | Renders as `display: inline-block` so it flows inline with text, labels, or other inline content. |
| FR-6.2 | `flexShrink: 0` prevents the dot from being compressed when placed inside a flex container with limited space. |
| FR-6.3 | The component contributes its `size` to layout width and height. It does not have intrinsic margins or padding. |

### FR-7: Accessibility

| ID | Requirement |
|----|-------------|
| FR-7.1 | The root element has `role="status"`. This causes screen readers to announce changes as a live region update without interrupting the user. |
| FR-7.2 | `aria-label` is set to the string `"Online"` when online and `"Offline"` when offline. |
| FR-7.3 | The label updates reactively when `online` changes, triggering a screen reader announcement. |
| FR-7.4 | No `aria-live` attribute is needed because `role="status"` implies `aria-live="polite"`. |

### FR-8: Boolean Coercion and Error Handling

| ID | Requirement |
|----|-------------|
| FR-8.1 | If `online` is not a boolean (e.g., `null`, `undefined`, a number, a string), the component coerces it to `false`. This prevents a truthy non-boolean from producing an unexpected online state. |
| FR-8.2 | The coercion uses strict type checking: `typeof online === 'boolean' ? online : false`. This means `0`, `""`, `null`, and `undefined` all resolve to `false` (offline). |
| FR-8.3 | No `onError` callback is provided. The component silently handles invalid input by defaulting to offline. |
| FR-8.4 | No `showLoading` prop is supported. The component renders immediately regardless of data availability. Consumers should coalesce loading states externally (e.g., `online={value ?? false}`). |

---

## Non-Functional Requirements

### NFR-1: Performance
- Zero runtime dependencies beyond React.
- Pure CSS styling — no CSS-in-JS library, no stylesheet injection.
- Single `<span>` element per instance. No children, no nested DOM.
- No re-renders beyond React's standard prop-change reconciliation.
- ResizeObserver is attached to the **parent element** of the span. This is a single observer per instance. It disconnects on unmount via the effect cleanup function.

### NFR-2: Bundle Size
- Component file imports only `useRef`, `useState`, `useEffect` from React and `createScaler`/`CHART_REFERENCE` from the shared scaler utility.
- Target: under 1KB minified (component function only, excluding shared utilities).

### NFR-3: Responsive Glow Scaling
- The glow spread radius (the `3px` in the box-shadow at reference width) scales proportionally with the parent container width using the shared `createScaler` utility.
- Reference dimension: `CHART_REFERENCE` (500px).
- Scaling mode: `'width'` (uses parent width only, not min of width/height).
- At 250px parent width, the glow spread is 1.5px. At 1000px, it is 6px.

---

## RelayX SDK Integration

### SDK-1: useRelayPresence Hook
| ID | Detail |
|----|--------|
| SDK-1.1 | The hook subscribes to `app.connection.presence(callback)` for real-time device presence events. |
| SDK-1.2 | It filters events by `device_ident` to match the specified device. |
| SDK-1.3 | Returns `{ online: boolean \| null, lastEvent: PresenceEvent \| null, isLoading: boolean, error: Error \| null }`. |
| SDK-1.4 | `online` is `null` until the first presence event is received. Consumers should coalesce: `online={online ?? false}`. |
| SDK-1.5 | `lastEvent` shape: `{ event: 'connected' \| 'disconnected', device_ident: string, data: { start: number, stop?: number } }`. |

### SDK-2: Typical Integration Pattern
```tsx
import { useRelayPresence } from '@anthropic/relay-sdk';
import { PresenceIndicator } from '@anthropic/relay-ui-kit';

function DeviceStatus({ deviceIdent }: { deviceIdent: string }) {
  const { online, isLoading } = useRelayPresence(deviceIdent);
  return <PresenceIndicator online={online ?? false} />;
}
```

---

## Props Interface

```typescript
export interface PresenceIndicatorProps {
  /** Whether the entity is online. Required. Non-boolean values are coerced to false. */
  online: boolean;

  /**
   * CSS color string for the online state.
   * Overrides --relay-presence-online.
   * Default: var(--relay-presence-online, #22c55e)
   */
  onlineColor?: string;

  /**
   * CSS color string for the offline state.
   * Overrides --relay-presence-offline.
   * Default: var(--relay-presence-offline, #ef4444)
   */
  offlineColor?: string;

  /**
   * Dot diameter in CSS pixels.
   * Does not scale with the parent container — only the glow scales.
   * Default: 12
   */
  size?: number;
}
```
