# PresenceIndicator — Spec

Source: `src/indicators/PresenceIndicator.tsx`
Requirements: `requirements/PresenceIndicator.md`
Tests: `tests/PresenceIndicator.test.tsx` (unit, 22 tests), `e2e/progress-bar.spec.ts` (Playwright, tested within presence demo)

---

## Component Signature

```typescript
import { useRef, useState, useEffect } from "react";
import { createScaler, CHART_REFERENCE } from "../utils/scaler";

export interface PresenceIndicatorProps {
  online: boolean;
  onlineColor?: string;
  offlineColor?: string;
  size?: number;
}

export function PresenceIndicator(props: PresenceIndicatorProps): JSX.Element;
```

### Prop Details

| Prop           | Type      | Required | Default                                  | Description                                                                      |
| -------------- | --------- | -------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `online`       | `boolean` | Yes      | —                                        | Whether the entity is online. Non-boolean values are coerced to `false`.         |
| `onlineColor`  | `string`  | No       | `var(--relay-presence-online, #22c55e)`  | CSS color for the online state. Takes precedence over the CSS custom property.   |
| `offlineColor` | `string`  | No       | `var(--relay-presence-offline, #ef4444)` | CSS color for the offline state. Takes precedence over the CSS custom property.  |
| `size`         | `number`  | No       | `12`                                     | Dot diameter in CSS pixels. Applied as exact pixels; does not scale with parent. |

---

## DOM Structure

```html
<span
  ref={containerRef}
  role="status"
  aria-label="Online"  <!-- or "Offline" -->
  style="display: inline-block; width: 12px; height: 12px; border-radius: 50%;
         background-color: var(--relay-presence-online, #22c55e);
         box-shadow: 0 0 0 3px var(--relay-presence-online, #22c55e)33;
         transition: background-color 200ms ease, box-shadow 200ms ease;
         flex-shrink: 0;"
>
  <!-- no children -->
</span>
```

Single `<span>` element. No children, no nesting, no wrapper. The `ref` is attached to this span and used to locate the parent element for ResizeObserver measurement.

---

## Inline Styles — Complete Property List

Every style is applied via the `style` attribute (no className, no CSS modules).

| Property          | Value (online)                                         | Value (offline)  | Notes                                                          |
| ----------------- | ------------------------------------------------------ | ---------------- | -------------------------------------------------------------- |
| `display`         | `'inline-block'`                                       | `'inline-block'` | Always. Allows inline flow with text.                          |
| `width`           | `{dotSize}px`                                          | `{dotSize}px`    | `dotSize = size ?? 12`.                                        |
| `height`          | `{dotSize}px`                                          | `{dotSize}px`    | Same as width. Always a square.                                |
| `borderRadius`    | `'50%'`                                                | `'50%'`          | Always. Makes the square a circle.                             |
| `backgroundColor` | `{color}`                                              | `{color}`        | See Color Resolution below.                                    |
| `boxShadow`       | `'0 0 0 {s(3)}px {color}33'`                           | `undefined`      | Glow halo. `s(3)` is the scaled spread. `33` is hex 20% alpha. |
| `transition`      | `'background-color 200ms ease, box-shadow 200ms ease'` | Same             | Always applied regardless of state.                            |
| `flexShrink`      | `0`                                                    | `0`              | Prevents compression in flex layouts.                          |

---

## Color Resolution Priority Chain

The resolved `color` variable is determined by this priority chain (highest first):

### Online state

1. `onlineColor` prop (if provided and not `undefined`)
2. `'var(--relay-presence-online, #22c55e)'` (CSS custom property with hardcoded fallback)

### Offline state

1. `offlineColor` prop (if provided and not `undefined`)
2. `'var(--relay-presence-offline, #ef4444)'` (CSS custom property with hardcoded fallback)

Implementation:

```typescript
const color = isOnline
  ? (onlineColor ?? "var(--relay-presence-online, #22c55e)")
  : (offlineColor ?? "var(--relay-presence-offline, #ef4444)");
```

When a prop is supplied, the `var()` expression is **not emitted** — the prop value is used directly as the `backgroundColor` and in the `boxShadow` string. This means CSS custom property overrides on ancestors have no effect when the prop is present.

---

## CSS Custom Properties

| Variable                   | Default Fallback | Used When                                              |
| -------------------------- | ---------------- | ------------------------------------------------------ |
| `--relay-presence-online`  | `#22c55e`        | `onlineColor` prop is not provided and `online=true`   |
| `--relay-presence-offline` | `#ef4444`        | `offlineColor` prop is not provided and `online=false` |

These are consumed via `var()` in the inline style string. The browser resolves them at paint time from the nearest ancestor that defines them.

---

## Boolean Coercion Logic

```typescript
const isOnline = typeof online === "boolean" ? online : false;
```

| Input `online` value | `typeof` result | `isOnline` output |
| -------------------- | --------------- | ----------------- |
| `true`               | `'boolean'`     | `true`            |
| `false`              | `'boolean'`     | `false`           |
| `null`               | `'object'`      | `false`           |
| `undefined`          | `'undefined'`   | `false`           |
| `0`                  | `'number'`      | `false`           |
| `1`                  | `'number'`      | `false`           |
| `""`                 | `'string'`      | `false`           |
| `"online"`           | `'string'`      | `false`           |

This is strict boolean checking, **not** JavaScript truthiness. The number `1` and the string `"true"` both resolve to `false` (offline). This is intentional to prevent accidental truthy values from showing an incorrect online state.

---

## ResizeObserver Setup and Teardown

The component uses a ResizeObserver to measure the parent element width for proportional glow scaling.

### Setup (in `useEffect`)

1. Get `containerRef.current?.parentElement`. If null, return early (no observer).
2. Create `new ResizeObserver(callback)`.
3. Callback reads `entries[0].contentRect.width` and calls `setMeasuredWidth(width)`.
4. Call `ro.observe(parentElement)`.

### Teardown

5. Effect cleanup calls `ro.disconnect()`.

### Dependency array

- `[]` (empty). The observer is created once on mount and disconnected on unmount. It does **not** re-attach if the parent element changes after mount.

### Initial state

- `measuredWidth` is initialized to `CHART_REFERENCE` (500). This means on the first render before the observer fires, the scaler factor is `500/500 = 1.0` and the glow spread is exactly `3px`.

### Edge case: missing parent

- If `containerRef.current?.parentElement` is `null` (e.g., the span is a root-level element in a detached fragment), no observer is created, `measuredWidth` stays at `CHART_REFERENCE`, and scaling operates at factor 1.0.

### Edge case: zero-width container

- If the parent has `width: 0`, `measuredWidth` becomes `0`, the scaler factor is `0/500 = 0`, and the glow spread is `s(3) = 0px`. The dot renders with no visible glow but is otherwise correct.

---

## Scaler Configuration

| Parameter           | Value                                                      | Source                     |
| ------------------- | ---------------------------------------------------------- | -------------------------- |
| Reference dimension | `CHART_REFERENCE` = `500`                                  | `src/utils/scaler.ts`      |
| Scaling mode        | `'width'`                                                  | Passed to `createScaler`   |
| Height argument     | `0`                                                        | Not used in `'width'` mode |
| Scaler creation     | `createScaler(measuredWidth, 0, CHART_REFERENCE, 'width')` | Per render                 |

### Scaling function

```typescript
const s = createScaler(measuredWidth, 0, CHART_REFERENCE, "width");
// s(px) => px * (measuredWidth / 500)
```

### Glow spread formula

```
glowSpread = 3 * (parentWidth / 500)
```

| Parent width | Factor | Glow spread |
| ------------ | ------ | ----------- |
| 250px        | 0.5    | 1.5px       |
| 500px        | 1.0    | 3.0px       |
| 750px        | 1.5    | 4.5px       |
| 1000px       | 2.0    | 6.0px       |

---

## Box Shadow Formula

### Online state

```
box-shadow: 0 0 0 {s(3)}px {color}33
```

Broken down:

- `0` — horizontal offset (none)
- `0` — vertical offset (none)
- `0` — blur radius (none — sharp ring, not a soft glow)
- `{s(3)}px` — spread radius (scaled 3px)
- `{color}33` — shadow color = the resolved dot color with `33` appended (hex for ~20% alpha)

The `33` suffix is string-concatenated to the color value. This works correctly when:

- The color is a 6-digit hex (e.g., `#22c55e` becomes `#22c55e33`)
- The color is a CSS `var()` expression — the browser resolves the variable first, then appends `33` (this actually breaks the `var()` syntax, but in practice the prop color is typically a hex string when customized, and the `var()` fallback path produces `var(--relay-presence-online, #22c55e)33` which the browser handles as an invalid box-shadow, falling back to none)

**Important caveat**: When using CSS custom properties (no color prop), the glow shadow color string becomes `var(--relay-presence-online, #22c55e)33`, which is technically invalid CSS. Browsers silently ignore the invalid box-shadow and render no glow. The glow only works reliably when: (a) a color prop is explicitly provided as a hex value, or (b) the resolved `var()` expression is a hex color. This is a known limitation.

### Offline state

```
box-shadow: undefined  (property omitted from style object)
```

---

## Accessibility

| Attribute    | Online value | Offline value |
| ------------ | ------------ | ------------- |
| `role`       | `"status"`   | `"status"`    |
| `aria-label` | `"Online"`   | `"Offline"`   |

- `role="status"` implies `aria-live="polite"` — screen readers announce changes without interrupting the user.
- The `aria-label` is derived from `isOnline` (the coerced boolean), not the raw `online` prop. So non-boolean inputs produce `aria-label="Offline"`.
- No `aria-live` attribute is explicitly set (it is implicit via the role).
- No `tabindex` — the indicator is not focusable. It is a passive status display.

---

## Hook Dependencies

| Hook                      | Arguments               | Dependency Array | Purpose                                                               |
| ------------------------- | ----------------------- | ---------------- | --------------------------------------------------------------------- |
| `useRef<HTMLSpanElement>` | `null`                  | —                | Holds reference to the `<span>` to find its parent for ResizeObserver |
| `useState<number>`        | `CHART_REFERENCE`       | —                | Stores measured parent width; initialized to 500                      |
| `useEffect`               | Setup/teardown function | `[]`             | Creates and disconnects ResizeObserver on mount/unmount               |

All three hooks are called unconditionally on every render (React rules of hooks). The `createScaler` call and all style computations happen during render (not inside effects).

---

## Edge Cases

### Non-boolean `online` value

- Coerced to `false` via strict type check. Renders offline state. See Boolean Coercion table above.

### Missing parent element

- `containerRef.current?.parentElement` returns `null`. No ResizeObserver is created. `measuredWidth` remains at `CHART_REFERENCE` (500). Glow spread defaults to 3px.

### Zero-width parent container

- `measuredWidth` is `0`. Scaler factor is `0`. Glow spread is `0px`. Dot renders without visible glow.

### `size` of 0

- Dot renders at 0x0 pixels. Still present in DOM with `role="status"` and `aria-label`. Visually invisible.

### `size` of negative number

- CSS treats negative width/height as invalid. Browser ignores them and the element collapses. The component does not validate or clamp the `size` prop.

### Rapid toggling of `online`

- Each toggle triggers a React re-render. The CSS transition (200ms ease) handles visual interpolation. If toggled faster than 200ms, the transition is interrupted and restarts from the current interpolated color. No debouncing is applied.

### Invalid color string

- Passed directly to `backgroundColor` and `boxShadow`. Browser ignores the invalid value and falls back to transparent / no shadow. No runtime error.

### `onlineColor` with CSS `var()` syntax

- Works for `backgroundColor` (browser resolves it). The glow `boxShadow` string-concatenates `33` to the value, which may produce invalid CSS depending on the color format.

---

## SDK Integration Example

```tsx
import { useRelayPresence } from "@anthropic/relay-sdk";
import { PresenceIndicator } from "@anthropic/relay-ui-kit";

function DeviceRow({ deviceIdent }: { deviceIdent: string }) {
  const { online, isLoading, error } = useRelayPresence(deviceIdent);

  if (error) return <span>Error</span>;

  return <PresenceIndicator online={online ?? false} />;
}
```

The `online` value from `useRelayPresence` is `boolean | null`. The `null` case (no presence event received yet) must be coalesced by the consumer. The component's internal coercion handles it as `false`, but explicit `?? false` is recommended for type safety.

---

## Test Coverage (22 unit tests)

| Category          | Tests                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Rendering**     | Renders as `<span>`, correct background for online=true, correct background for online=false                            |
| **Accessibility** | `role="status"` present, `aria-label="Online"` when online, `aria-label="Offline"` when offline                         |
| **Sizing**        | Default 12px diameter, custom size prop, small sizes (e.g., 4px), large sizes (e.g., 48px)                              |
| **Colors**        | Custom `onlineColor` applied, custom `offlineColor` applied, CSS variable fallback strings present when no prop         |
| **Layout**        | `display: inline-block`, `flexShrink: 0`, `borderRadius: 50%`, transition property present                              |
| **Glow**          | `boxShadow` present when online, `boxShadow` uses custom color when `onlineColor` provided, no `boxShadow` when offline |
| **Edge cases**    | `size=0` renders without error, rapid toggling does not throw                                                           |
