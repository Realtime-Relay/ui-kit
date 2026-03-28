# ProgressBar -- Component Specification

Source: `src/indicators/ProgressBar.tsx`
Requirements: `requirements/ProgressBar.md`

## Component Signature

```typescript
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import type { ComponentError } from '../utils/validation';
import type { ZoneTransition } from '../utils/useZoneTransition';

export interface ProgressBarStyles {
  label_font_file?: FontStyle;
  lastUpdated?: FontStyle;
  zoneValue?: FontStyle;                               // zone boundary + min/max label styling
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

export interface ProgressBarProps {
  value: number;
  min?: number;                                        // default: 0
  max?: number;                                        // default: 100
  orientation?: 'horizontal' | 'vertical';             // default: 'horizontal'
  showLabel?: boolean;                                 // default: true
  formatValue?: (value: number) => string;             // default: defaultFormatValue
  alertZones?: AlertZone[];                            // default: []
  showAlertZones?: boolean;                            // default: true when zones exist
  showZoneLegend?: boolean;                            // default: false
  showZoneValues?: boolean;                            // default: false
  showMinMax?: boolean;                                // default: false
  styles?: ProgressBarStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;                           // default: false
  formatTimestamp?: (ts: Date | number) => string;     // default: defaultFormatTimestamp
  showLoading?: boolean;                               // default: true
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}
```

## DOM Tree

### Normal State (valid value)

```html
<>                                                    <!-- React Fragment -->
  <div ref={containerRef}                             <!-- Track container -->
    style="
      width: {containerWidthCss};
      maxWidth: 100%;
      height: {containerHeightCss};
      backgroundColor: {styles?.background?.color ?? 'var(--relay-progress-bg, #e5e7eb)'};
      borderRadius: var(--relay-progress-border-radius, 4px);
      position: relative;
      overflow: hidden;
      display: flex;
      alignItems: center;
    ">

    <!-- Layer 0: Alert zone background bands -->
    {displayZones && alertZones.map((zone, i) => (
      <div key="bg-{i}"
        style="
          position: absolute;
          [horizontal]: left: {zoneStart}%; top: 0; bottom: 0; width: {zoneWidth}%;
          [vertical]:   left: 0; right: 0; bottom: {zoneStart}%; height: {zoneWidth}%;
          backgroundColor: {zone.color};
          opacity: 0.15;
          zIndex: 0;
        " />
    ))}

    <!-- Layer 1: Solid fill bar -->
    <div style="
      position: absolute;
      [horizontal]: left: 0; top: 0; bottom: 0; width: {percentage}%;
      [vertical]:   left: 0; right: 0; bottom: 0; height: {percentage}%;
      backgroundColor: {fillColor};
      borderRadius: inherit;
      transition: width 300ms ease, height 300ms ease, background-color 300ms ease;
      zIndex: 1;
    " />

    <!-- Layer 2: Label (z-index 3) -->
    {showLabel && (
      <span style="
        position: relative;
        zIndex: 3;
        width: 100%;
        textAlign: center;
        fontFamily: {resolvedFontFamily ?? labelFont?.fontFamily ?? 'var(--relay-font-family)'};
        fontSize: {labelFont?.fontSize ?? 12};
        fontWeight: {labelFont?.fontWeight ?? 600};
        color: {labelFont?.color ?? (percentage > 50 ? '#fff' : 'currentColor')};
        transition: color 300ms ease;
        pointerEvents: none;
      ">
        {formatValue(safeValue)}
      </span>
    )}

    <!-- Layer 3: Invisible tooltip hit areas (z-index 4) -->
    {displayZones && alertZones.map((zone, i) => (
      <div key="tip-{i}"
        title="{zone.label ? zone.label + ': ' : ''}{zone.min} -- {zone.max}"
        style="
          position: absolute;
          [horizontal]: left: {zoneStart}%; top: 0; bottom: 0; width: {zoneWidth}%;
          [vertical]:   left: 0; right: 0; bottom: {zoneStart}%; height: {zoneWidth}%;
          zIndex: 4;
          background: transparent;
        " />
    ))}
  </div>

  <!-- Last updated timestamp (outside the bar container) -->
  {showLastUpdated && lastUpdated != null && (
    <div style="
      marginTop: 4;
      fontSize: {tsStyle?.fontSize ?? 11};
      fontFamily: {tsStyle?.fontFamily ?? 'var(--relay-font-family)'};
      fontWeight: {tsStyle?.fontWeight ?? 400};
      color: {tsStyle?.color ?? '#9ca3af'};
      textAlign: center;
    ">
      {formatTimestamp(lastUpdated)}
    </div>
  )}
</>
```

### Skeleton State (`showLoading = true` and `renderValue == null`)

```html
<div ref={containerRef}
  style="
    width: {containerWidthCss};
    maxWidth: 100%;
    height: {containerHeightCss};
    background: linear-gradient(90deg,
      var(--relay-skeleton-base, #e5e7eb) 25%,
      var(--relay-skeleton-shine, #f3f4f6) 50%,
      var(--relay-skeleton-base, #e5e7eb) 75%);
    backgroundSize: 200% 100%;
    animation: relay-skeleton-shimmer 1.5s ease-in-out infinite;
    borderRadius: var(--relay-progress-border-radius, 4px);
  " />
```

## Z-Index Layering Strategy

Four layers inside the bar container, all using `position: absolute` (except the label which uses `position: relative`):

| Layer | z-index | Element | Purpose |
|---|---|---|---|
| Zone bands | `0` | `<div key="bg-{i}">` | Transparent colored background bands at 15% opacity |
| Fill bar | `1` | `<div>` | Solid opaque fill; covers zone bands underneath |
| Label | `3` | `<span>` | Value text; `position: relative` creates implicit stacking context |
| Tooltip hit areas | `4` | `<div key="tip-{i}">` | Invisible overlays with `title` attribute for native browser tooltips |

The container has `overflow: hidden` so nothing bleeds outside the rounded corners. The label uses `position: relative` (not absolute) combined with `width: 100%` and `textAlign: center` inside the flex container, which vertically centers it via `alignItems: center` on the parent. `pointerEvents: none` on the label ensures mouse events pass through to the tooltip hit areas.

## Zone Positioning Math

### Percentage Calculations

```typescript
const range = max - min;
const zoneStart = ((Math.max(zone.min, min) - min) / range) * 100;
const zoneEnd   = ((Math.min(zone.max, max) - min) / range) * 100;
const zoneWidth = zoneEnd - zoneStart;
```

- `Math.max(zone.min, min)` clamps the zone's start to not go below the bar's min.
- `Math.min(zone.max, max)` clamps the zone's end to not exceed the bar's max.
- This means zones partially outside `[min, max]` are clipped to the visible range.

### Horizontal Positioning

```css
position: absolute;
left: {zoneStart}%;
top: 0;
bottom: 0;
width: {zoneWidth}%;
```

### Vertical Positioning

```css
position: absolute;
left: 0;
right: 0;
bottom: {zoneStart}%;
height: {zoneWidth}%;
```

Vertical uses `bottom` instead of `top` because fill grows from bottom to top.

## Fill Bar Sizing and Animation

### Size Calculation

```typescript
const clampedValue = Math.min(max, Math.max(min, safeValue));
const ratio = range > 0 ? (clampedValue - min) / range : 0;
const percentage = ratio * 100;
```

### Horizontal Fill

```css
position: absolute;
left: 0; top: 0; bottom: 0;
width: {percentage}%;
backgroundColor: {fillColor};
borderRadius: inherit;
transition: width 300ms ease, height 300ms ease, background-color 300ms ease;
zIndex: 1;
```

### Vertical Fill

```css
position: absolute;
left: 0; right: 0; bottom: 0;
height: {percentage}%;
/* same backgroundColor, borderRadius, transition, zIndex */
```

### Fill Color Resolution

```typescript
function getZoneColor(value: number, zones: AlertZone[], fallback: string): string {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return fallback;
}

const fillColor = getZoneColor(clampedValue, alertZones, 'var(--relay-progress-fill, #3b82f6)');
```

The clamped value is used for color lookup, not the raw value. Zones are checked in array order; the first match wins.

## Label Color Transition Logic

```typescript
color: labelFont?.color ?? (percentage > 50 ? '#fff' : 'currentColor')
```

Priority:
1. `styles.label_font_file.color` -- explicit user override, always used if present.
2. `percentage > 50` -- when the fill covers more than half the bar, white text ensures readability against the fill color.
3. `currentColor` -- inherits from the container's text color when the fill is small.

The transition `color 300ms ease` ensures smooth color changes as the fill crosses the 50% threshold.

## Skeleton Animation

Triggered when `showLoading = true` AND `renderValue == null` (no valid value has ever been received).

- Background: three-stop linear gradient at 25%, 50%, 75% positions.
- `backgroundSize: 200% 100%` makes the gradient twice as wide as the element.
- `animation: relay-skeleton-shimmer 1.5s ease-in-out infinite` slides the gradient.
- The skeleton respects `containerWidthCss` and `containerHeightCss` from styles.
- Border radius matches the bar: `var(--relay-progress-border-radius, 4px)`.

## Validation

### Hard Validation (throws on render)

Called synchronously at the top of the component body, before any hooks:

```typescript
validateRange(min, max, 'ProgressBar');
// Throws: "ProgressBar: min ({min}) must be less than or equal to max ({max})."
// Throws: "ProgressBar: min and max cannot be equal (both are {min}). Range must be non-zero."

validateAlertZones(alertZones, 'ProgressBar');
// Throws on: missing min/max, non-finite min/max, inverted min/max, overlapping zones
```

### Soft Validation (fires onError, continues rendering)

```typescript
const lastValidRef = useRef<number | null>(null);
const validatedValue = validateValue(value, 'ProgressBar', onError);
if (validatedValue !== null) {
  lastValidRef.current = validatedValue;
}
const renderValue = lastValidRef.current;
```

`validateValue` returns the number if `typeof value === 'number' && Number.isFinite(value)`, otherwise returns `null` and fires `onError` with:
```typescript
{
  type: 'invalid_value',
  message: `ProgressBar: value must be a finite number, received {typeStr}...`,
  rawValue: value,
  component: 'ProgressBar'
}
```

After soft validation, `renderValue` is either:
- The latest valid number (stored in ref across renders)
- `null` if no valid value has ever been received

When `renderValue == null` and `showLoading = true`, the skeleton renders. When `renderValue == null` and `showLoading = false`, the component uses `safeValue = min` as fallback.

## Zone Tooltip Title Format

```typescript
title={`${zone.label ? zone.label + ': ' : ''}${zone.min} – ${zone.max}`}
```

- With label: `"Warning: 60 -- 80"`
- Without label: `"60 -- 80"`

The en dash character `\u2013` is used between min and max.

## Font Resolution

```typescript
const labelFont = styles?.label_font_file;
const resolvedFontFamily = labelFont?.fontFamily
  ? resolveFontFamily(labelFont.fontFamily)
  : undefined;
```

`resolveFontFamily` (from `utils/fonts.ts`):
1. If the value is falsy, return it unchanged.
2. If the value does NOT end in `.otf`, `.ttf`, `.woff`, `.woff2` and does NOT start with `data:font/`, return it as-is (normal CSS font-family).
3. If already in the cache (`loadedFonts` Map), return the cached generated family name.
4. Otherwise: generate `relay-custom-font-{counter}`, inject `@font-face` into `document.head`, cache, and return the generated name.

The label's `fontFamily` resolution chain:
```
resolvedFontFamily ?? labelFont?.fontFamily ?? 'var(--relay-font-family)'
```

## Zone Change Detection

Uses the `useZoneTransition` hook:

```typescript
useZoneTransition(renderValue ?? min, alertZones, onZoneChange);
```

The hook:
1. On first render: identifies the current zone and stores it as baseline. Does NOT fire `onZoneChange`.
2. On subsequent renders: compares current zone with previous by `min`, `max`, and `color`.
3. If zone changed (including entering/leaving a zone from/to null), fires `onZoneChange({ previousZone, currentZone, value })`.
4. When `value` is null, zones are empty, or `onZoneChange` is undefined, the hook is a no-op.

## Container Dimensions

```typescript
const containerWidthCss  = toCss(styles?.width)  ?? '100%';
const containerHeightCss = toCss(styles?.height)  ?? (isHorizontal ? 'var(--relay-progress-height, 24px)' : '100%');

function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === 'number' ? `${val}px` : val;
}
```

The container always has `maxWidth: 100%` to prevent overflow regardless of the width value.

## Edge Cases

### Range = 0

Hard validation throws before rendering: `"ProgressBar: min and max cannot be equal (both are {value}). Range must be non-zero."` This prevents division by zero in ratio calculation.

### Value Out of Bounds

- `value < min`: fill bar is at 0% width/height. Label shows the raw value (e.g., `-5`).
- `value > max`: fill bar is at 100% width/height. Label shows the raw value (e.g., `150`).
- Clamping: `clampedValue = Math.min(max, Math.max(min, safeValue))`.

### Overlapping Zones

Hard validation throws: `"ProgressBar: alert zones overlap. Zone [{a.min}, {a.max}] overlaps with [{b.min}, {b.max}]."` Zones are sorted by min before checking. Touching boundaries (`a.max === b.min`) is allowed.

### Zone Partially Outside Range

Zones whose `min` or `max` fall outside `[min, max]` are clipped to the visible range via `Math.max(zone.min, min)` and `Math.min(zone.max, max)`. A zone entirely outside the range renders with `zoneWidth = 0` or negative, which effectively makes it invisible.

### NaN / Infinity / Non-Number Value

Soft validation catches these. `onError` fires, and the component falls back to `lastValidRef.current`. If no valid value has ever been set, `renderValue` is null, triggering the skeleton (or fallback to min if loading is off).

### No Alert Zones

`alertZones` defaults to `[]`. `hasZones` is false, so no zone bands, no tooltip hit areas, and `fillColor` is the CSS variable fallback `var(--relay-progress-fill, #3b82f6)`.

### `showAlertZones = false` with Zones Provided

Zone background bands and tooltip hit areas are not rendered (`displayZones = false`). However, `fillColor` still uses `getZoneColor` because the color lookup is independent of `displayZones`.

### First Render with `null`/`undefined` Value

If `value` is null/undefined:
- `validateValue` returns `null`, `onError` is NOT fired (null/undefined is treated as "no data", not as an error).
- `renderValue` is null.
- If `showLoading = true`: skeleton shimmer renders.
- If `showLoading = false`: `safeValue = min`, bar renders at 0%.

## Zone Legend

When `showZoneLegend` is true and `alertZones` has entries:
- Renders a flex row of colored swatches + zone label text below the bar
- Only zones with a `label` property are shown
- Swatch: 10x10px `<span>` with `borderRadius: 2px`, `backgroundColor: zone.color`
- Label: `<span>` with `color` from `styles.zoneValue?.color ?? '#9ca3af'`
- Container: `data-testid="zone-legend"`, `display: flex`, `gap: 12px`, `justifyContent: center`, `flexWrap: wrap`

## Zone Boundary Values

When `showZoneValues` is true and `alertZones` has entries:
- Uses `getZoneBoundaries(alertZones, min, max)` from `src/gauges/shared.ts` to extract unique boundary values between adjacent zones (excluding min/max)
- Each boundary renders as a `<span>` with `data-zone-value={bv}` attribute
- **Color**: defaults to the zone color of the zone whose `min` matches the boundary value. Falls back to the zone whose `max` matches. When `styles.zoneValue.color` is set, it overrides all boundary colors uniformly.
- **Horizontal**: positioned absolutely above the bar, centered at the proportional x-offset (`left: {ratio}%`, `transform: translateX(-50%)`)
- **Vertical**: positioned absolutely to the right of the bar, at the proportional y-offset (`bottom: {ratio}%`, `transform: translateY(50%)`)
- Values are formatted through `formatValue`

## Min/Max Labels

When `showMinMax` is true:
- Renders min and max values at the ends of the bar using `formatValue`
- Labels have `data-minmax="min"` / `data-minmax="max"` attributes
- Uses `styles.zoneValue` font styling (shared with zone boundary values)
- **Horizontal**: min on the left, max on the right, in a flex row with the bar
- **Vertical**: max on top, min on bottom, in a flex column with the bar

## Dependencies

| Import | Source | Usage |
|---|---|---|
| `useRef` | `react` | `lastValidRef` for value fallback, `containerRef` for the track element |
| `AlertZone`, `FontStyle`, `BackgroundStyle` | `../utils/types` | Type definitions |
| `defaultFormatValue`, `defaultFormatTimestamp` | `../utils/formatters` | Default formatting functions |
| `resolveFontFamily` | `../utils/fonts` | Font file auto-loading |
| `useZoneTransition`, `ZoneTransition` | `../utils/useZoneTransition` | Alert zone change detection |
| `validateRange`, `validateAlertZones`, `validateValue`, `ComponentError` | `../utils/validation` | Hard and soft validation |
| `getZoneBoundaries` | `../gauges/shared` | Extract unique zone boundary values for `showZoneValues` |
