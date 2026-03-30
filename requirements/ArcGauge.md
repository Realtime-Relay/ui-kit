# ArcGauge — Requirements

## Purpose and Use Case

A Grafana-style filled-arc gauge where the arc fills from left to right proportional to the current value. The numeric value and unit are displayed centered inside the arc. Designed for progress-style readings, percentages, and single-metric displays where the "fill" metaphor (like a progress bar bent into an arc) is more intuitive than a needle.

Typical deployment: IoT dashboards showing battery level, storage utilization, completion percentage, or any metric where "how full" is the primary question.

---

## Props

| Prop              | Type                                   | Default                  | Required | Description                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------- | ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`           | `number`                               | —                        | Yes      | Current value to display. The fill arc extent and displayed text are derived from this. See **Value Validation** for handling of `null`, `undefined`, `NaN`, `Infinity`, and out-of-range values.                                   |
| `min`             | `number`                               | `0`                      | No       | Minimum value of the gauge range. Must be strictly less than `max`. Represents the left-most arc endpoint (zero fill).                                                                                                              |
| `max`             | `number`                               | `100`                    | No       | Maximum value of the gauge range. Must be strictly greater than `min`. Represents the right-most arc endpoint (full fill).                                                                                                          |
| `formatValue`     | `(value: number) => string`            | `defaultFormatValue`     | No       | Formatter for the displayed value text, min/max labels, and zone boundary labels. `defaultFormatValue` trims trailing zeros up to 2 decimal places (e.g., `90` stays `"90"`, `90.10` becomes `"90.1"`, `90.123` becomes `"90.12"`). |
| `alertZones`      | `AlertZone[]`                          | `[]`                     | No       | Colored arc segments indicating named ranges. Each zone has `min`, `max`, `color`, and optional `label`. See **Alert Zone Behavior**.                                                                                               |
| `label`           | `string`                               | `undefined`              | No       | Metric label displayed below the unit (centered inside the arc).                                                                                                                                                                    |
| `unit`            | `string`                               | `undefined`              | No       | Unit suffix displayed below the value as an inline `<tspan>` within the value text element (e.g., `"°C"`, `"%"`, `"psi"`).                                                                                                          |
| `styles`          | `ArcGaugeStyles`                       | `undefined`              | No       | Full style customization object. See **Styles Object**.                                                                                                                                                                             |
| `showZoneValues`  | `boolean`                              | `false`                  | No       | When `true`, renders numeric boundary values at each zone transition point along the arc. Extra top padding is added to prevent clipping.                                                                                           |
| `lastUpdated`     | `Date \| number`                       | `undefined`              | No       | Timestamp of the last data update. Can be a `Date` object or epoch millisecond number. Only rendered when `showLastUpdated` is `true`.                                                                                              |
| `showLastUpdated` | `boolean`                              | `false`                  | No       | Toggle display of the last-updated timestamp. When `false`, the timestamp is never rendered even if `lastUpdated` is provided.                                                                                                      |
| `formatTimestamp` | `(ts: Date \| number) => string`       | `defaultFormatTimestamp` | No       | Custom formatter for the timestamp. Default format: `dd MMM yyyy HH:MM:SS.sss +TZ` (e.g., `"26 Mar 2026 22:39:40.123 +05:30"`).                                                                                                     |
| `showLoading`     | `boolean`                              | `true`                   | No       | When `true` and value resolves to `null` (either passed as `null`/`undefined` or fails validation), renders a skeleton loader instead of the gauge.                                                                                 |
| `onZoneChange`    | `(transition: ZoneTransition) => void` | `undefined`              | No       | Callback fired when the value crosses an alert zone boundary. Receives `{ previousZone: AlertZone \| null, currentZone: AlertZone \| null, value: number }`. Does NOT fire on initial render — only on subsequent zone changes.     |
| `onError`         | `(error: ComponentError) => void`      | `undefined`              | No       | Callback fired for soft validation errors (invalid value). Receives `{ type, message, rawValue, component }`. Hard validation errors (invalid config) throw instead.                                                                |

---

## Styles Object

```typescript
interface ArcGaugeStyles {
  value?: FontStyle; // Value text styling
  label?: FontStyle; // Metric label text styling
  unit?: FontStyle; // Unit suffix text styling
  minMax?: FontStyle; // Min/max label and zone boundary value text styling
  lastUpdated?: FontStyle; // Timestamp text styling
  background?: BackgroundStyle; // { color?: string } — container background color, default 'transparent'
  arcThickness?: number; // Arc stroke width in reference pixels (default: 20). Scaled proportionally.
  arcAngle?: number; // Sweep angle in degrees (clamped to 30–300, default: 180). Controls how much of a circle the arc covers.
  width?: number; // Explicit maximum width in CSS pixels. If omitted, fills container.
  height?: number; // Explicit maximum height in CSS pixels. If omitted, fills container.
}
```

Note: ArcGauge has **no `needleThickness`** style (unlike NeedleGauge) because it uses a fill arc instead of a needle.

### FontStyle (shared across all components)

```typescript
interface FontStyle {
  fontFamily?: string; // CSS font-family string. Falls back through resolution chain (see below).
  fontSize?: number; // Font size in reference pixels (scaled proportionally). Each text element has its own default.
  fontWeight?: number | string; // CSS font-weight (e.g., 400, 700, "bold").
  color?: string; // CSS color string. Each text element has its own default.
  fontFile?: string; // URL or path to .otf/.ttf/.woff/.woff2 file. Auto-generates @font-face rule.
}
```

### BackgroundStyle

```typescript
interface BackgroundStyle {
  color?: string; // CSS background color for the container. Default: 'transparent'.
}
```

---

## Arc Geometry Requirements

### Sweep Angle

- Controlled by `styles.arcAngle`. Default: `180` degrees.
- Clamped to the range `[30, 300]`. Values below 30 are clamped to 30; values above 300 are clamped to 300.
- `undefined` or not provided defaults to 180.
- The arc is always symmetric around the 12 o'clock (straight up) direction from the center point.

### Angle Interpretation

- **180 degrees**: Standard semi-circle. Left endpoint at 9 o'clock, right endpoint at 3 o'clock. The arc occupies the upper half of the circle. Text is centered inside the arc (at the arc's geometric center).
- **< 180 degrees**: Narrower arc centered at 12 o'clock. Both endpoints are above the center. Text is still centered inside the arc.
- **> 180 degrees**: Arc wraps below the center line. The lowest point of the arc extends below `cy`. Text remains centered inside the arc.
- **270 degrees**: Three-quarter circle. Endpoints at roughly 7:30 and 4:30.
- **30 degrees** (minimum): Tiny arc centered at top.
- **300 degrees** (maximum): Nearly full circle with a small gap at the bottom.

### Extremes

- At 30 degrees, the arc is very short. The fill arc still operates within this narrow sweep.
- At 300 degrees, the arc almost closes. The gap is at the bottom (6 o'clock).
- The fill arc never extends beyond the background arc endpoints.

---

## Alert Zone Behavior

### AlertZone Interface

```typescript
interface AlertZone {
  min: number; // Start of zone range (inclusive)
  max: number; // End of zone range (inclusive)
  color: string; // CSS color string for the zone
  label?: string; // Optional human-readable label (used in error messages)
}
```

### Rendering

- Each zone is rendered as a colored arc segment overlaid on the background arc.
- Zones are rendered at **0.25 opacity (25%)** on ArcGauge — more subtle than NeedleGauge's full opacity, because the fill arc overlays on top and provides the primary color signal.
- Zone arcs use the same path as the background arc, with `strokeDasharray` and `strokeDashoffset` to clip to the zone's proportional range.
- `strokeLinecap="butt"` ensures clean zone boundaries.
- Zones are rendered in array order — later zones paint on top of earlier ones.

### Value Fill Arc

- A separate colored arc from the start angle to the angle representing the current value.
- The fill arc sits on top of the zone arcs and background arc.
- Uses `strokeDasharray` and `strokeDashoffset` to render the partial fill from `0` to `valueRatio * totalLength`.
- Default fill color: `#3b82f6` (blue).
- When alert zones are present: fill color adopts the zone the current (clamped) value falls in.
- If the value falls in no zone AND zones exist, fill still uses `#3b82f6`.
- If no zones exist at all, fill uses `#3b82f6`.

### Color Resolution

- The **fill arc color** is the zone color if value falls in a zone, otherwise `#3b82f6`.
- The **value text color** (`styles.value.color`) follows the same rule: if `styles.value.color` is not explicitly set, value text adopts the fill arc color (zone color or `#3b82f6`).
- Zone matching: a value matches a zone when `value >= zone.min && value <= zone.max`. The first matching zone in array order wins.

### Boundary Values (showZoneValues)

- Same behavior as NeedleGauge. When `showZoneValues` is `true` and `alertZones` is non-empty, unique boundary values strictly between `min` and `max` are rendered as text labels at their arc positions.
- Styled via `styles.minMax`.
- Extra top padding added when enabled.

### Validation

- Same rules as NeedleGauge: each zone must have both `min` and `max` as finite numbers, `zone.min <= zone.max`, no overlapping zones (touching OK).
- Invalid zones cause a **hard error** (thrown exception).

---

## Value Validation

### Hard Errors (throw)

Configuration errors that throw immediately:

- `min > max`: `"ArcGauge: min (X) must be less than or equal to max (Y)."`
- `min === max`: `"ArcGauge: min and max cannot be equal (both are X). Range must be non-zero."`
- Invalid alert zones: missing `min`/`max`, non-finite, inverted, overlapping.

### Soft Errors (onError + fallback)

Runtime data errors:

- `value` is `null` or `undefined`: Returns `null`. If `showLoading` is `true`, renders skeleton.
- `value` is `NaN`, `Infinity`, `-Infinity`: Fires `onError` with type `'invalid_value'`. Falls back to last valid value via `useRef`.
- `value` is a non-number type: Same — fires `onError`, falls back.

### Fallback Mechanism

- A `useRef<number | null>` stores the last valid value.
- When a new valid value arrives, the ref is updated.
- When an invalid value arrives, the ref retains the previous valid value.
- If no valid value has ever been received and `showLoading` is `true`, skeleton is shown.

### Value Clamping vs Display

- **Fill arc position**: The value is clamped to `[min, max]` for computing the fill arc extent. A value of 150 on a 0–100 gauge fills the arc completely.
- **Displayed text**: The raw (unclamped) value is shown. A value of 150 on a 0–100 gauge displays `"150"` as text.

---

## Loading State Behavior

- Controlled by `showLoading` prop (default: `true`).
- When `showLoading` is `true` and `renderValue` is `null`, the component renders a `CardSkeleton` instead of the SVG gauge.
- The skeleton fills the same space using `ResponsiveContainer` with the same explicit dimensions.
- When `showLoading` is `false` and value is `null`, the SVG renders but with no fill arc and no value text.

---

## Proportional Scaling Behavior

- All pixel values are authored for a reference container size of **200px** (`GAUGE_REFERENCE = 200`).
- The scaler uses `Math.min(width, height) / 200` as the scaling factor (mode: `'min'`).
- Every dimension passed through `s()` scales proportionally: padding, arc thickness, font sizes, gaps.
- At 200x200, values are 1:1. At 100x100, half-sized. At 400x400, doubled.
- Fully responsive via `ResizeObserver` through `ResponsiveContainer`.

---

## Accessibility (ARIA Attributes)

- The root `<svg>` element has `role="meter"`.
- `aria-valuenow` is set to the current render value (unclamped actual value).
- `aria-valuemin` is set to `min`.
- `aria-valuemax` is set to `max`.
- `aria-label` is set to the `label` prop if provided, otherwise `"Gauge"`.

---

## Font Resolution Chain

Each text element resolves its `fontFamily` through the following chain:

1. **Explicit fontFamily** on the element's `FontStyle`.
2. **fontFile resolution**: If `fontFile` is set, generates a deterministic `@font-face` family name.
3. **Fallback to label fontFamily** (for `minMax`, `lastUpdated`): `styles.label.fontFamily`.
4. **CSS variable**: `var(--relay-font-family)`.

### Per-element defaults

| Element      | fontFamily fallback chain                                                                | fontSize default | fontWeight default | color default           |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------- | ------------------ | ----------------------- |
| Value text   | `styles.value.fontFamily` > `var(--relay-font-family)`                                   | 26               | 700                | zone color or `#3b82f6` |
| Unit text    | `styles.unit.fontFamily` > `var(--relay-font-family)`                                    | 13               | 400                | `#6b7280`               |
| Label text   | `styles.label.fontFamily` > `var(--relay-font-family)`                                   | 12               | 400                | `#6b7280`               |
| Min/Max text | `styles.minMax.fontFamily` > `styles.label.fontFamily` > `var(--relay-font-family)`      | 10               | 400                | `#9ca3af`               |
| Zone values  | `styles.minMax.fontFamily` > `styles.label.fontFamily` > `var(--relay-font-family)`      | 10               | 400                | `#9ca3af`               |
| Timestamp    | `styles.lastUpdated.fontFamily` > `styles.label.fontFamily` > `var(--relay-font-family)` | 9                | 400                | `#9ca3af`               |

---

## Timestamp Formatting

- `lastUpdated` accepts `Date` or epoch millisecond `number`.
- Default format: `dd MMM yyyy HH:MM:SS.sss +TZ`.
- Example: `"26 Mar 2026 22:39:40.123 +05:30"`.
- Day is zero-padded to 2 digits. Month is 3-letter abbreviation. Year is 4-digit. Hours, minutes, seconds are zero-padded. Milliseconds are zero-padded to 3 digits. Timezone from `getTimezoneOffset()`.
- `formatTimestamp` prop overrides the default entirely.
- Only rendered when both `showLastUpdated` is `true` AND `lastUpdated` is not `null`/`undefined`.

---

## Visual Layout

```
        +--- alert zone arcs (25% opacity) ---+
        |                                      |
     ,==============================-----------.
    ||    *  zone1   *  zone2   *  zone3        \
   ||                                            |
   ||          90.21                              |  <- value centered inside arc
   ||            °C                               |  <- unit as tspan after value
   |=============================================-|
   min           temperature                    max  <- label below unit, inside arc

= = filled arc portion (zone color or #3b82f6)
- = unfilled background arc (#e5e7eb)
```

The key visual difference from NeedleGauge: value and label text are always centered inside the arc (at the arc's geometric center), regardless of sweep angle. NeedleGauge places text below the arc.
