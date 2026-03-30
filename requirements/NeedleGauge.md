# NeedleGauge — Requirements

## Purpose and Use Case

A semi-circular (or configurable-arc) gauge with a rotating needle indicator. The needle rotates from min to max across the arc, pointing to the current value. The numeric value is displayed as text below (or beneath) the arc. Designed for single-metric readings: temperature, pressure, speed, RPM, voltage, humidity, etc.

Typical deployment: IoT dashboards where a device telemetry value must be rendered as a familiar analog-style meter.

---

## Props

| Prop              | Type                                   | Default                  | Required | Description                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------- | ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`           | `number`                               | —                        | Yes      | Current value to display. The needle position and displayed text are derived from this. See **Value Validation** for handling of `null`, `undefined`, `NaN`, `Infinity`, and out-of-range values.                                   |
| `min`             | `number`                               | `0`                      | No       | Minimum value of the gauge range. Must be strictly less than `max`. Used as the left-most arc endpoint.                                                                                                                             |
| `max`             | `number`                               | `100`                    | No       | Maximum value of the gauge range. Must be strictly greater than `min`. Used as the right-most arc endpoint.                                                                                                                         |
| `formatValue`     | `(value: number) => string`            | `defaultFormatValue`     | No       | Formatter for the displayed value text, min/max labels, and zone boundary labels. `defaultFormatValue` trims trailing zeros up to 2 decimal places (e.g., `90` stays `"90"`, `90.10` becomes `"90.1"`, `90.123` becomes `"90.12"`). |
| `alertZones`      | `AlertZone[]`                          | `[]`                     | No       | Colored arc segments indicating named ranges (warning, critical, normal, etc.). Each zone has `min`, `max`, `color`, and optional `label`. See **Alert Zone Behavior**.                                                             |
| `label`           | `string`                               | `undefined`              | No       | Metric label displayed below the value text (e.g., `"temperature"`, `"pressure"`).                                                                                                                                                  |
| `unit`            | `string`                               | `undefined`              | No       | Unit suffix displayed next to the value text as an inline `<tspan>` (e.g., `"°C"`, `"psi"`, `"%"`).                                                                                                                                 |
| `styles`          | `NeedleGaugeStyles`                    | `undefined`              | No       | Full style customization object. See **Styles Object**.                                                                                                                                                                             |
| `showZoneValues`  | `boolean`                              | `false`                  | No       | When `true`, renders numeric boundary values at each zone transition point along the arc (e.g., zones `[0-30, 30-70, 70-100]` renders `"30"` and `"70"` on the arc). Extra top padding is added to prevent clipping.                |
| `lastUpdated`     | `Date \| number`                       | `undefined`              | No       | Timestamp of the last data update. Can be a `Date` object or epoch millisecond number. Only rendered when `showLastUpdated` is `true`.                                                                                              |
| `showLastUpdated` | `boolean`                              | `false`                  | No       | Toggle display of the last-updated timestamp below the label (or below the value if no label). When `false`, the timestamp is never rendered even if `lastUpdated` is provided.                                                     |
| `formatTimestamp` | `(ts: Date \| number) => string`       | `defaultFormatTimestamp` | No       | Custom formatter for the timestamp. Default format: `dd MMM yyyy HH:MM:SS.sss +TZ` (e.g., `"26 Mar 2026 22:39:40.123 +05:30"`).                                                                                                     |
| `showLoading`     | `boolean`                              | `true`                   | No       | When `true` and value resolves to `null` (either passed as `null`/`undefined` or fails validation), renders a skeleton loader instead of the gauge.                                                                                 |
| `onZoneChange`    | `(transition: ZoneTransition) => void` | `undefined`              | No       | Callback fired when the value crosses an alert zone boundary. Receives `{ previousZone: AlertZone \| null, currentZone: AlertZone \| null, value: number }`. Does NOT fire on initial render — only on subsequent zone changes.     |
| `onError`         | `(error: ComponentError) => void`      | `undefined`              | No       | Callback fired for soft validation errors (invalid value). Receives `{ type, message, rawValue, component }`. Hard validation errors (invalid config) throw instead.                                                                |

---

## Styles Object

```typescript
interface NeedleGaugeStyles {
  value?: FontStyle; // Value text styling
  label?: FontStyle; // Metric label text styling
  unit?: FontStyle; // Unit suffix text styling
  minMax?: FontStyle; // Min/max label and zone boundary value text styling
  lastUpdated?: FontStyle; // Timestamp text styling
  background?: BackgroundStyle; // { color?: string } — container background color, default 'transparent'
  arcThickness?: number; // Arc stroke width in reference pixels (default: 14). Scaled proportionally.
  needleThickness?: number; // Needle stroke width in reference pixels (default: 2.5). Scaled proportionally.
  arcAngle?: number; // Sweep angle in degrees (clamped to 30–300, default: 180). Controls how much of a circle the arc covers.
  width?: number; // Explicit maximum width in CSS pixels. If omitted, fills container.
  height?: number; // Explicit maximum height in CSS pixels. If omitted, fills container.
}
```

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

- **180 degrees**: Standard semi-circle. Left endpoint at 9 o'clock, right endpoint at 3 o'clock. The arc occupies the upper half of the circle. Text appears below the arc baseline.
- **< 180 degrees**: Narrower arc centered at 12 o'clock. Both endpoints are above the center. Text appears below the arc baseline.
- **> 180 degrees**: Arc wraps below the center line. The lowest point of the arc extends below `cy`. Text is positioned below the arc's lowest point, not below the center.
- **270 degrees**: Three-quarter circle. Endpoints at roughly 7:30 and 4:30.
- **30 degrees** (minimum): Tiny arc centered at top.
- **300 degrees** (maximum): Nearly full circle with a small gap at the bottom.

### Extremes

- At 30 degrees, the arc is very short. The needle still rotates within this narrow sweep.
- At 300 degrees, the arc almost closes. The gap is at the bottom (6 o'clock).
- The needle always stays within the arc sweep range, never extends beyond the endpoints.

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
- Zones are rendered at **full opacity (1.0)** on NeedleGauge (unlike ArcGauge which uses 0.25).
- Zone arcs use the same path as the background arc, with `strokeDasharray` and `strokeDashoffset` to clip to the zone's proportional range.
- `strokeLinecap="butt"` ensures clean zone boundaries with no overlap at edges.
- Zones are rendered in array order — later zones paint on top of earlier ones.

### Color Resolution

- The **needle color** is determined by the zone the current (clamped) value falls in.
- The **value text color** (`styles.value.color`) follows the same rule: if `styles.value.color` is not explicitly set, the value text adopts the active zone color.
- If the value does not fall in any zone, both needle and value text use the default color `#374151`.
- Zone matching: a value matches a zone when `value >= zone.min && value <= zone.max`. The first matching zone in array order wins.

### Boundary Values (showZoneValues)

- When `showZoneValues` is `true` and `alertZones` is non-empty, zone boundary values are extracted and rendered as text labels at their arc positions.
- Boundaries are the unique `min` and `max` values of all zones that are strictly between the gauge's `min` and `max` (exclusive of both).
- For example, zones `[{min:0, max:30}, {min:30, max:70}, {min:70, max:100}]` with gauge min=0, max=100 produces boundary labels `"30"` and `"70"`.
- Boundary labels are positioned on the arc at the same radius as min/max labels.
- When enabled, extra top padding (`minMaxFontSize + s(4)`) is added to prevent clipping.
- Styled via `styles.minMax`.

### Validation

- Each zone must have both `min` and `max` as finite numbers.
- `zone.min` must be less than or equal to `zone.max` (inverted ranges throw).
- Zones must not overlap: when sorted by `min`, each zone's `max` must be `<= ` the next zone's `min`. Touching boundaries (`a.max === b.min`) are allowed.
- Invalid zones cause a **hard error** (thrown exception) with a descriptive message including the zone index and optional label.

---

## Value Validation

### Hard Errors (throw)

These are configuration errors that indicate a programming mistake. They throw immediately and crash the component:

- `min > max`: `"NeedleGauge: min (X) must be less than or equal to max (Y)."`
- `min === max`: `"NeedleGauge: min and max cannot be equal (both are X). Range must be non-zero."`
- Invalid alert zones: missing `min`/`max`, non-finite `min`/`max`, inverted zone (`min > max`), overlapping zones.

### Soft Errors (onError + fallback)

These are data errors that can happen at runtime. They fire `onError` and fall back gracefully:

- `value` is `null` or `undefined`: Returns `null` from validation. If `showLoading` is `true`, renders skeleton. Otherwise falls back to last valid value.
- `value` is `NaN`: Fires `onError` with type `'invalid_value'`. Falls back to last valid value (stored in a `useRef`).
- `value` is `Infinity` or `-Infinity`: Same as NaN — fires `onError`, falls back.
- `value` is a non-number type (string, boolean, object): Same — fires `onError`, falls back.

### Fallback Mechanism

- A `useRef<number | null>` stores the last valid value.
- When a new valid value arrives, the ref is updated.
- When an invalid value arrives, the ref retains the previous valid value, and the gauge continues displaying it.
- If no valid value has ever been received and `showLoading` is `true`, the skeleton is shown.
- If no valid value has ever been received and `showLoading` is `false`, `renderValue` is `null` and the gauge renders nothing (no needle, no value text).

### Value Clamping vs Display

- **Needle position**: The value is clamped to `[min, max]` for computing the needle angle. A value of 150 on a 0–100 gauge places the needle at the max position.
- **Displayed text**: The raw (unclamped) value is shown. A value of 150 on a 0–100 gauge displays `"150"` as text, so users can see the out-of-range reading.

---

## Loading State Behavior

- Controlled by `showLoading` prop (default: `true`).
- When `showLoading` is `true` and `renderValue` is `null` (no valid value), the component renders a `CardSkeleton` instead of the SVG gauge.
- The skeleton fills the same space as the gauge would (uses `ResponsiveContainer` with the same `explicitWidth`/`explicitHeight`).
- The skeleton uses a shimmer animation consistent with the library's shared skeleton pattern.
- When `showLoading` is `false` and value is `null`, the component still renders the `ResponsiveContainer` but the SVG will have no needle or value text.

---

## Proportional Scaling Behavior

- All pixel values are authored for a reference container size of **200px** (`GAUGE_REFERENCE = 200`).
- The scaler uses `Math.min(width, height) / 200` as the scaling factor (mode: `'min'`).
- Every dimension passed through the scaler `s()` scales proportionally: padding, arc thickness, needle thickness, font sizes, gaps, needle length, pivot circle radius.
- At 200x200, values are 1:1 with their authored sizes. At 100x100, everything is half-sized. At 400x400, everything is doubled.
- The component is fully responsive via `ResizeObserver` (through `ResponsiveContainer`). When the container resizes, all dimensions recalculate.

---

## Accessibility (ARIA Attributes)

- The root `<svg>` element has `role="meter"`.
- `aria-valuenow` is set to the current render value (unclamped actual value).
- `aria-valuemin` is set to `min`.
- `aria-valuemax` is set to `max`.
- `aria-label` is set to the `label` prop if provided, otherwise `"Gauge"`.

---

## Font Resolution Chain

Each text element resolves its `fontFamily` through the following chain, stopping at the first defined value:

1. **Explicit fontFamily** on the element's `FontStyle` (e.g., `styles.value.fontFamily`).
2. **fontFile resolution**: If `fontFile` is set, it generates a deterministic `@font-face` family name and overrides `fontFamily`.
3. **Fallback to label fontFamily** (for `minMax`, `lastUpdated`): `styles.label.fontFamily` is used as a secondary fallback.
4. **CSS variable**: `var(--relay-font-family)` — the library's global font variable.

### Per-element defaults

| Element      | fontFamily fallback chain                                                                | fontSize default | fontWeight default | color default           |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------- | ------------------ | ----------------------- |
| Value text   | `styles.value.fontFamily` > `var(--relay-font-family)`                                   | 22               | 700                | zone color or `#374151` |
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
- Day is zero-padded to 2 digits. Month is 3-letter abbreviation. Year is 4-digit. Hours, minutes, seconds are zero-padded. Milliseconds are zero-padded to 3 digits. Timezone is computed from `getTimezoneOffset()` as `+HH:MM` or `-HH:MM`.
- `formatTimestamp` prop overrides the default entirely.
- Timestamp is only rendered when both `showLastUpdated` is `true` AND `lastUpdated` is not `null`/`undefined`.
- Positioned below the label (or below value if no label), as the bottommost text element.

---

## Visual Layout

```
        +--- alert zone arcs (colored segments) ---+
        |                                           |
     ,--------------------------------------.
    /    *  zone1   *  zone2   *  zone3       \
   |                                           |
   |              / (needle)                   |
   |            /                              |
   +---- * --/--------------------------------+
   min      pivot                            max

                  90.21 °C          <- value + unit
                 temperature        <- label
          26 Mar 2026 22:39:40.123  <- timestamp (optional)
```

For arcs > 180 degrees, the arc extends below the center and text is positioned below the arc's lowest point.
