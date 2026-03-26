# PresenceIndicator — Spec

Source: `src/indicators/PresenceIndicator.tsx`
Requirements: `requirements/PresenceIndicator.md`
Tests: `tests/PresenceIndicator.test.tsx` (unit, 22 tests), `e2e/progress-bar.spec.ts` (Playwright, tested within presence demo)

## Component Signature

```typescript
interface PresenceIndicatorProps {
  online: boolean;
  onlineColor?: string;   // default: var(--relay-presence-online, #22c55e)
  offlineColor?: string;  // default: var(--relay-presence-offline, #ef4444)
  size?: number;          // default: 12 (pixels)
}
```

## Rendering

### DOM Structure
```html
<span role="status" aria-label="Online|Offline" style="...">
```
Single `<span>` element — no children, no nesting.

### Online State
- Background color: `onlineColor` or CSS variable fallback
- Box shadow glow: `0 0 0 3px {color}33` (20% alpha halo)
- Glow width scales proportionally with parent container

### Offline State
- Background color: `offlineColor` or CSS variable fallback
- No box shadow

### Sizing
- Dot diameter: `size` prop (default 12px)
- Does NOT scale proportionally — `size` is always in exact pixels
- `inline-block` display, `flexShrink: 0`

### Animation
- `transition: background-color 200ms ease, box-shadow 200ms ease`
- Smooth color change when `online` prop toggles

## Validation
- Non-boolean `online` coerced to `false` via `typeof online === 'boolean' ? online : false`
- No `onError` prop — no data validation needed
- No `showLoading` — always renders immediately

## Accessibility
- `role="status"` for screen reader announcements
- `aria-label="Online"` when online, `"Offline"` when offline

## CSS Variables
| Variable | Default | Purpose |
|---|---|---|
| `--relay-presence-online` | `#22c55e` | Default online color |
| `--relay-presence-offline` | `#ef4444` | Default offline color |

## SDK Integration
```tsx
const { online } = useRelayPresence(deviceIdent);
<PresenceIndicator online={online ?? false} />
```

## Test Coverage (22 unit tests)
- Rendering: online=true, online=false, renders as span
- Accessibility: role="status", aria-label Online/Offline
- Sizing: default 12px, custom size, small/large sizes
- Colors: custom online/offline colors, CSS variable fallback
- Visual: circle (border-radius 50%), inline-block, flexShrink 0, transition
- Glow: box-shadow when online with custom color, no shadow when offline
- Edge cases: size=0, rapid toggling
