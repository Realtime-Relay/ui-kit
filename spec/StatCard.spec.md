# StatCard — Component Specification

Source: `src/cards/StatCard.tsx`
Requirements: `requirements/StatCard.md`

---

## Component Signature

```typescript
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import type { ComponentError } from '../utils/validation';
import type { ZoneTransition } from '../utils/useZoneTransition';

export interface StatCardStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

export interface StatCardProps {
  value: any;
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
  lastUpdatedMargin?: number;
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}
```

**Prop defaults applied via destructuring:**
```typescript
alertZones = []
showLastUpdated = false
formatTimestamp = defaultFormatTimestamp
lastUpdatedMargin = 8
showLoading = true
```

---

## Internal Constants

```typescript
const STAT_REFERENCE = 300;
```

All proportional scaling is relative to a 300px-wide container.

---

## Internal Utility Functions

### `resolveBorderRadius(value?: number | 'rounded' | 'sharp'): string`

```typescript
function resolveBorderRadius(value?: number | 'rounded' | 'sharp'): string {
  if (value === 'sharp') return '0';
  if (value === 'rounded') return 'var(--relay-border-radius, 8px)';
  if (typeof value === 'number') return `${value}px`;
  return 'var(--relay-border-radius, 8px)';  // undefined falls through to rounded
}
```

### `defaultDisplayFormat(value: any): string`

Type-aware formatting for values when no custom `formatValue` is provided:

```typescript
function defaultDisplayFormat(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return defaultFormatValue(value);  // up to 2 decimals, trailing zeros trimmed
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);  // string, boolean, symbol, bigint
}
```

`defaultFormatValue` (from `utils/formatters`): returns `value.toString()` for integers, `parseFloat(value.toFixed(2)).toString()` for floats (trims trailing zeros after 2-decimal rounding).

### `getZoneColor(value: number, zones: AlertZone[]): string | null`

```typescript
function getZoneColor(value: number, zones: AlertZone[]): string | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return null;
}
```

Iterates zones in array order. First matching zone wins (inclusive on both bounds). Returns `null` if no zone matches.

### `toCss(val: string | number | undefined): string | undefined`

```typescript
function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === 'number' ? `${val}px` : val;
}
```

Converts dimension values for `styles.width` / `styles.height` to CSS strings.

---

## ResizeObserver Setup

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [dims, setDims] = useState({ width: STAT_REFERENCE, height: STAT_REFERENCE });

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setDims((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

Key details:
- Initial state: `{ width: 300, height: 300 }` (matches `STAT_REFERENCE`), so the first render uses 1:1 scale before measurement.
- Dimensions are rounded to integers via `Math.round` to avoid sub-pixel jitter.
- **Dedup logic:** `setDims` uses a functional updater that returns the previous object reference when width and height are unchanged. This prevents unnecessary re-renders from ResizeObserver firing multiple times with the same dimensions.
- Cleanup: `ro.disconnect()` on unmount.
- Dependency array: `[]` (runs once on mount).

---

## Scaler Configuration

```typescript
const s = createScaler(dims.width, dims.height, STAT_REFERENCE, 'width');
```

- Mode: `'width'` — scale factor is `dims.width / 300`.
- `s(px)` returns `px * (dims.width / 300)`.
- At 300px container: `s(32) === 32`, `s(16) === 16`.
- At 150px container: `s(32) === 16`, `s(16) === 8`.
- At 600px container: `s(32) === 64`, `s(16) === 32`.

---

## Font Resolution via `resolveFont`

```typescript
const valueStyleR = resolveFont(styles?.value);
const labelStyleR = resolveFont(styles?.label);
const lastUpdatedStyleR = resolveFont(styles?.lastUpdated);
```

`resolveFont` (from `utils/useResolvedStyles`):
1. If `style` is `undefined`, returns `undefined`.
2. If `style.fontFile` is set, calls `resolveFontFamily(fontFile)` which injects a `@font-face` declaration into the document head (idempotent) and returns a generated family name. Returns a new style object with `fontFamily` replaced.
3. If `style.fontFamily` looks like a font URL, resolves it the same way.
4. Otherwise returns the style unchanged.

---

## Value Display Chain

### Step 1: Last-valid retention

```typescript
const lastValidRef = useRef<any>(null);

if (value !== null && value !== undefined) {
  lastValidRef.current = value;
} else {
  onError?.({ type: 'invalid_value', message: '...', rawValue: value, component: 'StatCard' });
}

const renderValue = value !== null && value !== undefined ? value : lastValidRef.current;
```

- Non-null/non-undefined `value` is stored in the ref immediately (during render, not in an effect).
- `renderValue` is the value used for all display and formatting.

### Step 2: Zone numeric resolution

```typescript
const zoneNumeric = numericValue ?? (typeof renderValue === 'number' ? renderValue : null);
```

### Step 3: Zone transition tracking

```typescript
useZoneTransition(zoneNumeric ?? 0, alertZones, zoneNumeric !== null ? onZoneChange : undefined);
```

When `zoneNumeric` is `null`, `onZoneChange` is passed as `undefined`, which disables the hook. The fallback `0` is passed as the value but has no effect since the callback is disabled.

### Step 4: Zone color computation

```typescript
const zoneColor = zoneNumeric !== null && alertZones.length > 0
  ? getZoneColor(zoneNumeric, alertZones)
  : null;
```

### Step 5: Format display string

```typescript
const displayValue = renderValue !== null && renderValue !== undefined
  ? (formatValue ? formatValue(renderValue) : defaultDisplayFormat(renderValue))
  : '';
```

**Chain:** `renderValue` -> `formatValue(renderValue)` (if provided) OR `defaultDisplayFormat(renderValue)` (if not) -> `displayValue` string.

---

## DOM Tree

### Loading State (skeleton)

Condition: `showLoading === true && renderValue === null`

```
div (ref=containerRef)
  style:
    width:            toCss(styles?.width) ?? '100%'
    height:           toCss(styles?.height) ?? '100%'
    borderRadius:     resolveBorderRadius(borderRadius)
    background:       linear-gradient(90deg,
                        var(--relay-skeleton-base, #e5e7eb) 25%,
                        var(--relay-skeleton-shine, #f3f4f6) 50%,
                        var(--relay-skeleton-base, #e5e7eb) 75%)
    backgroundSize:   '200% 100%'
    animation:        'relay-skeleton-shimmer 1.5s ease-in-out infinite'
```

### Normal State

Condition: NOT loading (either `showLoading === false` or `renderValue !== null`)

```
div.container (ref=containerRef)
  style:
    width:            toCss(styles?.width) ?? '100%'
    height:           toCss(styles?.height) ?? '100%'
    display:          'flex'
    flexDirection:    'column'
    alignItems:       'center'
    justifyContent:   'center'
    backgroundColor:  styles?.background?.color ?? 'transparent'
    borderRadius:     resolveBorderRadius(borderRadius)
    border:           (borderColor || borderThickness)
                        ? `${borderThickness ?? 1}px solid ${borderColor ?? 'var(--relay-border-color, #e0e0e0)'}`
                        : undefined
    padding:          s(16)
    boxSizing:        'border-box'
  │
  ├─ [if label is truthy]
  │  div.label
  │    style:
  │      fontFamily:   labelStyleR?.fontFamily ?? 'var(--relay-font-family)'
  │      fontSize:     labelStyleR?.fontSize ?? s(13)
  │      fontWeight:   labelStyleR?.fontWeight ?? 400
  │      color:        labelStyleR?.color ?? zoneColor ?? '#6b7280'
  │      marginBottom: s(4)
  │    text: {label}
  │
  ├─ div.value
  │    style:
  │      fontFamily:   valueStyleR?.fontFamily ?? 'var(--relay-font-family)'
  │      fontSize:     valueStyleR?.fontSize ?? s(32)
  │      fontWeight:   valueStyleR?.fontWeight ?? 700
  │      color:        valueStyleR?.color ?? zoneColor ?? 'currentColor'
  │      lineHeight:   1.2
  │      textAlign:    'center'
  │      wordBreak:    'break-word'
  │      overflowWrap: 'anywhere'
  │      maxWidth:     '100%'
  │    text: {displayValue}
  │
  └─ [if showLastUpdated === true AND lastUpdated != null]
     div.timestamp
       style:
         fontFamily:   lastUpdatedStyleR?.fontFamily ?? 'var(--relay-font-family)'
         fontSize:     lastUpdatedStyleR?.fontSize ?? s(11)
         fontWeight:   lastUpdatedStyleR?.fontWeight ?? 400
         color:        lastUpdatedStyleR?.color ?? zoneColor ?? '#9ca3af'
         marginTop:    s(lastUpdatedMargin)
       text: {formatTimestamp(lastUpdated)}
```

---

## Zone Color Resolution and Propagation

Zone color is computed once and applied as a fallback for three elements:

| Element | Color Resolution (left to right, first non-null wins) |
|---|---|
| Label | `labelStyleR?.color` -> `zoneColor` -> `'#6b7280'` |
| Value | `valueStyleR?.color` -> `zoneColor` -> `'currentColor'` |
| Timestamp | `lastUpdatedStyleR?.color` -> `zoneColor` -> `'#9ca3af'` |

The `??` (nullish coalescing) chain means:
- If the developer sets an explicit `styles.value.color`, zone color is ignored for the value.
- If the developer does NOT set an explicit color, zone color is used when present.
- If no zone matches, the default color applies.

---

## Skeleton Animation Keyframes

The component references a CSS `@keyframes` animation named `relay-skeleton-shimmer`. This keyframe must be globally available (typically injected by the library's style setup):

```css
@keyframes relay-skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Animation properties:
- Duration: `1.5s`
- Timing function: `ease-in-out`
- Iteration: `infinite`
- Background gradient is `200%` wide, creating the sweeping shimmer effect.

---

## Loading State Conditions

The loading skeleton is displayed when ALL of these are true:
1. `showLoading === true` (default)
2. `renderValue === null` (meaning: `value` is null/undefined AND no previous valid value exists in `lastValidRef`)

If `showLoading === false` and `renderValue === null`, the normal card renders with `displayValue === ''` (empty string in the value div).

If `value` transitions from a valid value to `null`, `lastValidRef.current` retains the previous value, so `renderValue` is non-null and the card displays the stale value (no skeleton shown). `onError` still fires.

---

## Alert Zone Validation

`validateAlertZones(alertZones, 'StatCard')` runs synchronously during render when `alertZones.length > 0`. Validation errors throw `Error` objects (not caught internally):

1. **Missing bounds:** Zone at index `i` has `null`/`undefined` for `min` or `max`.
2. **Non-finite bounds:** `min` or `max` is `NaN`, `Infinity`, or `-Infinity`.
3. **Inverted range:** `min > max`.
4. **Overlapping zones:** After sorting by `min`, if `zones[i].max > zones[i+1].min` for any consecutive pair. Touching (`a.max === b.min`) is allowed.

---

## Accessibility

- The container is a plain `div` with no ARIA roles or labels (it is a passive display card, not an interactive widget).
- Text content is rendered as regular DOM text nodes, accessible to screen readers.
- Value text uses `wordBreak: 'break-word'` and `overflowWrap: 'anywhere'` to prevent overflow on long values.
