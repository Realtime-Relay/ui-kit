# NeedleGauge — Spec

Source: `src/gauges/NeedleGauge.tsx`
Requirements: `requirements/NeedleGauge.md`

---

## Full TypeScript Signature

```typescript
import type { AlertZone, FontStyle, BackgroundStyle } from "../utils/types";
import type { ZoneTransition } from "../utils/useZoneTransition";
import type { ComponentError } from "../utils/validation";

interface NeedleGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number; // default: 14
  needleThickness?: number; // default: 2.5
  arcAngle?: number; // 30–300, default: 180
  width?: number | string;
  height?: number | string;
}

interface NeedleGaugeProps {
  data: RelayDataPoint; // result from useRelayLatest(); data.value provides the numeric value, data.timestamp provides the last updated time
  min?: number; // default: 0
  max?: number; // default: 100
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: NeedleGaugeStyles;
  showZoneValues?: boolean; // default: false
  showLastUpdated?: boolean; // default: false
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean; // default: true
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}

export function NeedleGauge(props: NeedleGaugeProps): JSX.Element;
```

---

## Internal Constants

| Constant                                | Value     | Source                     | Description                                         |
| --------------------------------------- | --------- | -------------------------- | --------------------------------------------------- |
| `GAUGE_REFERENCE`                       | `200`     | `src/utils/scaler.ts`      | Reference dimension for proportional scaling        |
| Default `arcThickness`                  | `14`      | Inline default             | Background and zone arc stroke width (reference px) |
| Default `needleThickness`               | `2.5`     | Inline default             | Needle line stroke width (reference px)             |
| Default `arcAngle`                      | `180`     | `clampArcAngle(undefined)` | Sweep angle in degrees                              |
| Arc angle min                           | `30`      | `clampArcAngle`            | Minimum allowed sweep                               |
| Arc angle max                           | `300`     | `clampArcAngle`            | Maximum allowed sweep                               |
| Background arc color                    | `#e5e7eb` | Inline                     | SVG stroke color for the background arc             |
| Default needle/value color              | `#374151` | `getZoneColor` fallback    | Used when value is not in any zone                  |
| Min/max default color                   | `#9ca3af` | Inline                     | Default fill for min/max and zone boundary text     |
| Label/unit default color                | `#6b7280` | Inline                     | Default fill for label and unit text                |
| Timestamp default color                 | `#9ca3af` | Inline                     | Default fill for lastUpdated text                   |
| Default value fontSize                  | `22`      | Inline                     | Reference px                                        |
| Default label fontSize                  | `12`      | Inline                     | Reference px                                        |
| Default unit fontSize                   | `13`      | Inline                     | Reference px                                        |
| Default minMax fontSize                 | `10`      | Inline                     | Reference px                                        |
| Default timestamp fontSize              | `9`       | Inline                     | Reference px                                        |
| Default value fontWeight                | `700`     | Inline                     | Bold                                                |
| Default label/unit/minMax/ts fontWeight | `400`     | Inline                     | Normal                                              |
| Minimum radius                          | `s(40)`   | Inline                     | Scaled minimum radius to prevent degenerate arcs    |
| Padding base                            | `s(20)`   | Inline                     | Base padding around the arc                         |

---

## Scaler Setup

```typescript
const s = createScaler(width, height, GAUGE_REFERENCE);
// GAUGE_REFERENCE = 200
// mode = 'min' (default)
// factor = Math.min(width, height) / 200
// s(px) = px * factor
```

All subsequent pixel values in this spec are in **reference pixels** (before scaling). The scaler `s()` is applied to every value at render time.

---

## Arc Geometry Math

### Sweep Angle Clamping

```typescript
const sweepDegrees = clampArcAngle(styles?.arcAngle);
// clampArcAngle(d) = Math.min(300, Math.max(30, d ?? 180))
```

### Radians and Half-Sweep

```typescript
const sweepRad = (sweepDegrees * Math.PI) / 180;
const halfSweep = sweepRad / 2;
```

### Arc Path Construction

The arc is symmetric around the 12 o'clock direction (SVG angle `-PI/2`).

```typescript
const startSvgAngle = -Math.PI / 2 - halfSweep; // left endpoint (min)
const endSvgAngle = -Math.PI / 2 + halfSweep; // right endpoint (max)

const x1 = cx + r * Math.cos(startSvgAngle);
const y1 = cy + r * Math.sin(startSvgAngle);
const x2 = cx + r * Math.cos(endSvgAngle);
const y2 = cy + r * Math.sin(endSvgAngle);

const largeArc = sweepDegrees > 180 ? 1 : 0;
const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
```

- SVG `A` command: `rx ry x-rotation large-arc-flag sweep-flag x y`
- `sweep-flag=1` means clockwise in SVG coordinate space (Y-down)
- `large-arc-flag=1` when sweep > 180 degrees, ensuring the arc takes the long way around

### Arc Length

```typescript
const totalLen = arcLength(radius, sweepDegrees);
// arcLength(r, deg) = (deg / 360) * 2 * Math.PI * r
```

### Arc Bottom Fraction (for > 180 degree arcs)

```typescript
const arcBottomFraction =
  sweepDegrees <= 180 ? 0 : Math.sin(halfSweep - Math.PI / 2);
```

This computes how far below `cy` the arc's lowest point extends, as a fraction of the radius. Used to allocate vertical space.

### Radius Calculation

```typescript
const textSpace = sweepDegrees <= 180 ? s(60) : s(60);
const totalVertical = padding * 2 + textSpace;
const maxRadius = Math.min(
  (width - padding * 2) / 2, // horizontal constraint
  (height - totalVertical) / (1 + arcBottomFraction), // vertical constraint
);
const radius = Math.max(s(40), maxRadius);
```

### Center Point

```typescript
const cx = width / 2;
const cy = padding + radius;
```

---

## Needle Rendering Math

### Angle Calculation

```typescript
const clampedValue = Math.min(max, Math.max(min, renderValue));
const angle = valueToAngle(clampedValue, min, max, sweepDegrees);
```

`valueToAngle` maps the clamped value linearly across the sweep:

```typescript
function valueToAngle(value, min, max, sweepDegrees = 180) {
  const ratio = (clamp(value, min, max) - min) / (max - min);
  const sweepRad = (sweepDegrees * Math.PI) / 180;
  const halfSweep = sweepRad / 2;
  const startAngle = -Math.PI / 2 - halfSweep;
  const endAngle = -Math.PI / 2 + halfSweep;
  return startAngle + ratio * (endAngle - startAngle);
}
```

- At `value = min`: angle = `startAngle` (left endpoint)
- At `value = max`: angle = `endAngle` (right endpoint)
- At `value = (min+max)/2`: angle = `-Math.PI/2` (straight up, 12 o'clock)

### Needle Endpoint

```typescript
const needleLen = radius - arcThickness - s(8);
const nx = cx + needleLen * Math.cos(angle);
const ny = cy + needleLen * Math.sin(angle);
```

The needle extends from `(cx, cy)` to `(nx, ny)`, stopping `arcThickness + s(8)` before the arc radius (so it doesn't overlap the arc).

### Pivot Circle

```typescript
const pivotRadius = Math.max(s(4), needleThickness * 2);
```

Centered at `(cx, cy)`. Ensures the pivot is at least `s(4)` pixels and scales with needle thickness.

### Needle Color

```typescript
const valueColor = getZoneColor(clampedValue, alertZones, "#374151");
// getZoneColor: iterates zones in order, returns zone.color for first zone where
//   value >= zone.min && value <= zone.max
// Returns '#374151' if no zone matches
```

Both the needle `<line>` stroke and the pivot `<circle>` fill use `valueColor`.

---

## SVG Element Tree

The component renders the following SVG structure (in order, which determines paint order):

```
<ResponsiveContainer>
  <svg width={width} height={height} shapeRendering="geometricPrecision"
       role="meter" aria-valuenow aria-valuemin aria-valuemax aria-label>

    <!-- 1. Background arc -->
    <path d={arcPathD} fill="none" stroke="#e5e7eb"
          strokeWidth={arcThickness} strokeLinecap="butt" />

    <!-- 2. Alert zone arcs (one per zone) -->
    {alertZones.map(zone =>
      <path d={arcPathD} fill="none" stroke={zone.color}
            strokeWidth={arcThickness}
            strokeDasharray={z.dasharray} strokeDashoffset={z.dashoffset}
            opacity={1} />
    )}

    <!-- 3. Needle line -->
    <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={valueColor} strokeWidth={needleThickness}
          strokeLinecap="butt" />

    <!-- 4. Pivot circle -->
    <circle cx={cx} cy={cy} r={pivotRadius} fill={valueColor} />

    <!-- 5. Min label -->
    <text x={endpoints.startX} y={endpoints.startY}
          textAnchor="middle" fontSize fontFamily fontWeight fill />

    <!-- 6. Max label -->
    <text x={endpoints.endX} y={endpoints.endY}
          textAnchor="middle" fontSize fontFamily fontWeight fill />

    <!-- 7. Zone boundary values (conditional: showZoneValues && zones.length > 0) -->
    {boundaries.map(bv =>
      <text x={pos.x} y={pos.y} textAnchor="middle"
            fontSize fontFamily fontWeight fill />
    )}

    <!-- 8. Value text (with optional unit tspan) -->
    <text x={cx} y={valueY} textAnchor="middle" dominantBaseline="central"
          fontSize={valueFontSize} fontFamily fontWeight
          fill={styles.value.color ?? valueColor}>
      {formatValue(renderValue)}
      {unit && <tspan fontSize={unitFontSize} fontFamily fontWeight
                      fill={styles.unit.color ?? '#6b7280'}> {unit}</tspan>}
    </text>

    <!-- 9. Label text (conditional: label is truthy) -->
    <text x={cx} y={labelY} textAnchor="middle"
          fontSize={labelFontSize} fontFamily fontWeight fill />

    <!-- 10. Timestamp text (conditional: showLastUpdated && data.timestamp != null) -->
    <text x={cx} y={tsY} textAnchor="middle"
          fontSize={tsFontSize} fontFamily fontWeight fill />

  </svg>
</ResponsiveContainer>
```

---

## Exact SVG/CSS Properties Per Element

### Background Arc `<path>`

| Attribute       | Value                                             |
| --------------- | ------------------------------------------------- |
| `d`             | `buildArcPath(cx, cy, radius, sweepDegrees).path` |
| `fill`          | `"none"`                                          |
| `stroke`        | `"#e5e7eb"`                                       |
| `strokeWidth`   | `s(styles.arcThickness ?? 14)`                    |
| `strokeLinecap` | `"butt"`                                          |

### Zone Arc `<path>` (per zone)

| Attribute          | Value                                           |
| ------------------ | ----------------------------------------------- |
| `d`                | Same `arcPathD` as background                   |
| `fill`             | `"none"`                                        |
| `stroke`           | `zone.color`                                    |
| `strokeWidth`      | Same `arcThickness`                             |
| `strokeDasharray`  | `z.dasharray` (see Zone Dash Array Calculation) |
| `strokeDashoffset` | `z.dashoffset`                                  |
| `opacity`          | `1`                                             |

### Needle `<line>`

| Attribute       | Value                                  |
| --------------- | -------------------------------------- |
| `x1`            | `cx`                                   |
| `y1`            | `cy`                                   |
| `x2`            | `cx + needleLen * Math.cos(angle)`     |
| `y2`            | `cy + needleLen * Math.sin(angle)`     |
| `stroke`        | `valueColor` (zone color or `#374151`) |
| `strokeWidth`   | `s(styles.needleThickness ?? 2.5)`     |
| `strokeLinecap` | `"butt"`                               |

### Pivot `<circle>`

| Attribute | Value                                 |
| --------- | ------------------------------------- |
| `cx`      | `cx`                                  |
| `cy`      | `cy`                                  |
| `r`       | `Math.max(s(4), needleThickness * 2)` |
| `fill`    | `valueColor`                          |

### Min/Max `<text>`

| Attribute    | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| `x`          | `endpoints.startX` (min) / `endpoints.endX` (max)                                   |
| `y`          | `endpoints.startY` (min) / `endpoints.endY` (max)                                   |
| `textAnchor` | `"middle"`                                                                          |
| `fontSize`   | `s(styles.minMax.fontSize ?? 10)`                                                   |
| `fontFamily` | `styles.minMax.fontFamily ?? styles.label.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight` | `styles.minMax.fontWeight ?? 400`                                                   |
| `fill`       | `styles.minMax.color ?? '#9ca3af'`                                                  |

### Value `<text>`

| Attribute          | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| `x`                | `cx`                                                    |
| `y`                | `valueY` (see Text Positioning)                         |
| `textAnchor`       | `"middle"`                                              |
| `dominantBaseline` | `"central"`                                             |
| `fontSize`         | `s(styles.value.fontSize ?? 22)`                        |
| `fontFamily`       | `styles.value.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight`       | `styles.value.fontWeight ?? 700`                        |
| `fill`             | `styles.value.color ?? valueColor`                      |

### Unit `<tspan>` (inside value text)

| Attribute    | Value                                                  |
| ------------ | ------------------------------------------------------ |
| `fontSize`   | `s(styles.unit.fontSize ?? 13)`                        |
| `fontFamily` | `styles.unit.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight` | `styles.unit.fontWeight ?? 400`                        |
| `fill`       | `styles.unit.color ?? '#6b7280'`                       |

Content: `' ' + unit` (space-prefixed).

### Label `<text>`

| Attribute    | Value                                                   |
| ------------ | ------------------------------------------------------- |
| `x`          | `cx`                                                    |
| `y`          | `labelY` (see Text Positioning)                         |
| `textAnchor` | `"middle"`                                              |
| `fontSize`   | `s(styles.label.fontSize ?? 12)`                        |
| `fontFamily` | `styles.label.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight` | `styles.label.fontWeight ?? 400`                        |
| `fill`       | `styles.label.color ?? '#6b7280'`                       |

### Timestamp `<text>`

`data` is the required prop providing value and timestamp. `data.value` is used as the component value and `data.timestamp` as the last updated timestamp. Recommended pattern: `<NeedleGauge data={useRelayLatest({...})} showLastUpdated />`

| Attribute    | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| `x`          | `cx`                                                                                     |
| `y`          | `tsY` (see Text Positioning)                                                             |
| `textAnchor` | `"middle"`                                                                               |
| `fontSize`   | `s(styles.lastUpdated.fontSize ?? 9)`                                                    |
| `fontFamily` | `styles.lastUpdated.fontFamily ?? styles.label.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight` | `styles.lastUpdated.fontWeight ?? 400`                                                   |
| `fill`       | `styles.lastUpdated.color ?? '#9ca3af'`                                                  |

---

## Zone Dash Array Calculation

Each zone is rendered by masking the full arc path with `strokeDasharray` and `strokeDashoffset`:

```typescript
function buildZoneDashes(zones, min, max, totalLength) {
  const range = max - min;
  return zones.map((zone) => {
    const startRatio = (Math.max(zone.min, min) - min) / range;
    const endRatio = (Math.min(zone.max, max) - min) / range;
    const segLength = (endRatio - startRatio) * totalLength;
    const offset = startRatio * totalLength;
    return {
      dasharray: `${segLength} ${totalLength}`,
      dashoffset: -offset,
      color: zone.color,
    };
  });
}
```

- `dasharray = "segLength totalLength"`: draws `segLength` of stroke, then `totalLength` of gap (effectively showing only the segment).
- `dashoffset = -offset`: shifts the dash pattern forward by `offset`, positioning the visible segment at the correct arc location.
- Zone `min`/`max` are clamped to the gauge's `[min, max]` range before ratio calculation.

---

## Text Positioning Formulas

### Min/Max Label Positions

```typescript
const labelRadius = radius + arcThickness / 2 + s(12);
const endpoints = getArcEndpoints(cx, cy, labelRadius, sweepDegrees);
// endpoints.startX = cx + labelRadius * Math.cos(-PI/2 - halfSweep)
// endpoints.startY = cy + labelRadius * Math.sin(-PI/2 - halfSweep)
// endpoints.endX   = cx + labelRadius * Math.cos(-PI/2 + halfSweep)
// endpoints.endY   = cy + labelRadius * Math.sin(-PI/2 + halfSweep)
```

Labels are pushed outward from the arc by `arcThickness/2 + s(12)` so they sit just outside the arc stroke.

### Zone Boundary Value Positions

```typescript
const pos = getValuePosition(
  cx,
  cy,
  labelRadius,
  boundaryValue,
  min,
  max,
  sweepDegrees,
);
// pos.x = cx + labelRadius * Math.cos(valueToAngle(boundaryValue, min, max, sweepDegrees))
// pos.y = cy + labelRadius * Math.sin(valueToAngle(boundaryValue, min, max, sweepDegrees))
```

Same radius as min/max labels.

### Value and Label Text — sweep <= 180 degrees

```typescript
const minMaxGap = arcThickness / 2 + s(14);
const valueY = cy + minMaxGap + valueFontSize * 0.4;
const labelY = valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(6);
```

Text is positioned below the arc's center line. The `minMaxGap` accounts for the arc stroke and a gap. The `0.4` and `0.5` multipliers approximate vertical centering of SVG text.

### Value and Label Text — sweep > 180 degrees

```typescript
const arcBottomY = cy + radius * Math.sin(halfSweep - Math.PI / 2);
const belowArc = arcBottomY + arcThickness / 2 + s(8);
const valueY = belowArc + valueFontSize * 0.4;
const labelY = valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(4);
```

When the arc wraps below center, `arcBottomY` is the Y-coordinate of the arc's lowest point. Text starts below that point plus the arc stroke and a gap.

### Timestamp Position

```typescript
const tsFontSize = s(styles.lastUpdated.fontSize ?? 9);
const tsY =
  (label ? labelY + labelFontSize * 0.5 : valueY + valueFontSize * 0.5) +
  tsFontSize +
  s(4);
```

Always the bottommost text element. Positioned below label (if present) or below value.

---

## Padding and Zone Value Extra

```typescript
const minMaxFontSize = s(styles.minMax.fontSize ?? 10);
const zoneValueExtra =
  showZoneValues && alertZones.length > 0 ? minMaxFontSize + s(4) : 0;
const padding = s(20) + zoneValueExtra;
```

When `showZoneValues` is enabled, extra top padding is added equal to the minMax font size plus a `s(4)` gap, so boundary value labels at the top of the arc are not clipped.

---

## D3 Arc Path Construction

This component does **not** use D3 for arc paths. Arc paths are constructed with raw SVG `M ... A ...` commands via the `buildArcPath()` helper in `src/gauges/shared.ts`. The path is a single SVG arc segment using the `A` (elliptical arc) command with `rx = ry = radius`.

---

## Color Resolution: Zone Color > Default

For the **needle**, **pivot circle**, and **value text fill**:

```typescript
const valueColor = getZoneColor(clampedValue, alertZones, "#374151");
```

- `getZoneColor` iterates `alertZones` in order.
- Returns `zone.color` for the first zone where `clampedValue >= zone.min && clampedValue <= zone.max`.
- Returns `'#374151'` (dark gray) if no zone matches.

For value text specifically:

```typescript
fill={valueStyle?.color ?? valueColor}
```

Explicit `styles.value.color` overrides zone-based coloring.

---

## useZoneTransition Hook Behavior

```typescript
useZoneTransition(renderValue ?? min, alertZones, onZoneChange);
```

- Called on every render with the current value (or `min` as fallback when `renderValue` is null).
- Stores the previous zone in a `useRef`.
- On first call: initializes `prevZoneRef` to the current zone. Does NOT fire `onZoneChange`.
- On subsequent calls: compares current zone to previous zone by `min`/`max`/`color` identity (not reference equality).
- Fires `onZoneChange({ previousZone, currentZone, value })` only when the zone actually changes.
- Zone changes include: entering a zone from no-zone, leaving a zone to no-zone, or moving between two different zones.
- Does nothing if `onZoneChange` is undefined or `alertZones` is empty.

---

## Validation: Hard vs Soft

### Hard Validation (throws — called at top of component)

```typescript
validateRange(min, max, "NeedleGauge");
// Throws if: min > max, or min === max

validateAlertZones(alertZones, "NeedleGauge");
// Throws if: any zone missing min/max, non-finite min/max,
//            zone.min > zone.max, or zones overlap (sorted by min, a.max > b.min)
```

These throw immediately, preventing render. The error message includes the component name and the specific values.

### Soft Validation (onError + fallback)

```typescript
const lastValidRef = useRef<number | null>(null);
const validatedValue = validateValue(value, "NeedleGauge", onError);
if (validatedValue !== null) {
  lastValidRef.current = validatedValue;
}
const renderValue = lastValidRef.current;
```

`validateValue`:

- `null`/`undefined` → returns `null` (no error fired)
- Finite number → returns the number
- `NaN`, `Infinity`, `-Infinity`, non-number → fires `onError({ type: 'invalid_value', ... })`, returns `null`

The `lastValidRef` pattern means:

- First valid value: stored and rendered.
- Subsequent invalid value: previous valid value continues to render, `onError` fires.
- First value is invalid + `showLoading=true`: skeleton shown.
- First value is invalid + `showLoading=false`: `renderValue` is `null`, gauge renders with no needle/text.

---

## Edge Cases

| Scenario                                          | Behavior                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `value = NaN`                                     | `onError` fired, falls back to last valid value. If no prior valid value and `showLoading=true`, skeleton shown. |
| `value = Infinity`                                | Same as NaN.                                                                                                     |
| `value = -Infinity`                               | Same as NaN.                                                                                                     |
| `value = null`                                    | Returns `null` from validateValue (no onError). Skeleton or empty depending on `showLoading`.                    |
| `value = undefined`                               | Same as null.                                                                                                    |
| `value < min`                                     | Needle at min position, text shows actual value.                                                                 |
| `value > max`                                     | Needle at max position, text shows actual value.                                                                 |
| `min > max`                                       | Throws immediately.                                                                                              |
| `min === max`                                     | Throws immediately.                                                                                              |
| `arcAngle = 0`                                    | Clamped to 30.                                                                                                   |
| `arcAngle = 500`                                  | Clamped to 300.                                                                                                  |
| `arcAngle = undefined`                            | Defaults to 180.                                                                                                 |
| `alertZones` overlap                              | Throws immediately.                                                                                              |
| Zone with `min > max`                             | Throws immediately.                                                                                              |
| Zone with `min = NaN`                             | Throws immediately.                                                                                              |
| `showZoneValues = true`, no zones                 | No boundary labels rendered, no extra padding.                                                                   |
| `showLastUpdated = true`, `data.timestamp = null` | Timestamp not shown (no timestamp available).                                                                    |
| `showLastUpdated = false`                         | Timestamp not rendered regardless of `data.timestamp`.                                                           |
| Container resized to 0x0                          | Scaler produces factor 0, all dimensions become 0. Component is effectively invisible.                           |
| `formatValue` throws                              | Unhandled — error propagates.                                                                                    |
| Multiple zones, value on boundary                 | First matching zone in array order wins (inclusive check `>=` and `<=`).                                         |
| `onZoneChange` on initial render                  | NOT fired. Only fires on subsequent zone transitions.                                                            |
| `value` changes from valid to invalid and back    | Needle snaps back to previously-stored valid value during invalid period, then updates to new valid value.       |
