# ArcGauge — Spec

Source: `src/gauges/ArcGauge.tsx`
Requirements: `requirements/ArcGauge.md`

---

## Full TypeScript Signature

```typescript
import type { AlertZone, FontStyle, BackgroundStyle } from "../utils/types";
import type { ZoneTransition } from "../utils/useZoneTransition";
import type { ComponentError } from "../utils/validation";

interface ArcGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number; // default: 20
  arcAngle?: number; // 30–300, default: 180
  width?: number;
  height?: number;
}

interface ArcGaugeProps {
  data: RelayDataPoint; // result from useRelayLatest(); data.value provides the numeric value, data.timestamp provides the last updated time
  min?: number; // default: 0
  max?: number; // default: 100
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: ArcGaugeStyles;
  showZoneValues?: boolean; // default: false
  showLastUpdated?: boolean; // default: false
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean; // default: true
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}

export function ArcGauge(props: ArcGaugeProps): JSX.Element;
```

---

## Key Differences from NeedleGauge

| Feature                       | NeedleGauge                                                | ArcGauge                                                  |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Visual indicator              | Rotating needle line + pivot circle                        | Filled arc sweep from min to value position               |
| `needleThickness` style       | Yes (default: 2.5)                                         | N/A — no needle                                           |
| Default `arcThickness`        | 14                                                         | 20                                                        |
| Alert zone opacity            | **1.0 (full)**                                             | **0.25 (subtle)**                                         |
| Value fill arc                | None                                                       | Colored arc from start angle to value angle               |
| Default no-zone color         | `#374151` (dark gray)                                      | `#3b82f6` (blue)                                          |
| Value/label position          | Below arc (sweep <= 180) or below arc bottom (sweep > 180) | Always centered inside the arc, regardless of sweep angle |
| Default value fontSize        | 22                                                         | 26                                                        |
| textSpace (sweep <= 180)      | `s(60)`                                                    | `s(50)`                                                   |
| textSpace (sweep > 180)       | `s(60)`                                                    | `s(20)`                                                   |
| Value text `dominantBaseline` | `"central"`                                                | `"central"`                                               |
| Label text `dominantBaseline` | Not set                                                    | `"central"`                                               |

---

## Internal Constants

| Constant                                | Value     | Source                     | Description                                                |
| --------------------------------------- | --------- | -------------------------- | ---------------------------------------------------------- |
| `GAUGE_REFERENCE`                       | `200`     | `src/utils/scaler.ts`      | Reference dimension for proportional scaling               |
| Default `arcThickness`                  | `20`      | Inline default             | Background, zone, and fill arc stroke width (reference px) |
| Default `arcAngle`                      | `180`     | `clampArcAngle(undefined)` | Sweep angle in degrees                                     |
| Arc angle min                           | `30`      | `clampArcAngle`            | Minimum allowed sweep                                      |
| Arc angle max                           | `300`     | `clampArcAngle`            | Maximum allowed sweep                                      |
| Background arc color                    | `#e5e7eb` | Inline                     | SVG stroke for background arc                              |
| Default fill/value color                | `#3b82f6` | Inline                     | Blue — used when no zone matches or no zones defined       |
| Min/max default color                   | `#9ca3af` | Inline                     | Default fill for min/max and zone boundary text            |
| Label/unit default color                | `#6b7280` | Inline                     | Default fill for label and unit text                       |
| Timestamp default color                 | `#9ca3af` | Inline                     | Default fill for lastUpdated text                          |
| Default value fontSize                  | `26`      | Inline                     | Reference px                                               |
| Default label fontSize                  | `12`      | Inline                     | Reference px                                               |
| Default unit fontSize                   | `13`      | Inline                     | Reference px                                               |
| Default minMax fontSize                 | `10`      | Inline                     | Reference px                                               |
| Default timestamp fontSize              | `9`       | Inline                     | Reference px                                               |
| Default value fontWeight                | `700`     | Inline                     | Bold                                                       |
| Default label/unit/minMax/ts fontWeight | `400`     | Inline                     | Normal                                                     |
| Minimum radius                          | `s(40)`   | Inline                     | Scaled minimum radius                                      |
| Padding base                            | `s(20)`   | Inline                     | Base padding around the arc                                |
| Zone arc opacity                        | `0.25`    | Inline                     | 25% opacity for zone arcs                                  |

---

## Scaler Setup

```typescript
const s = createScaler(width, height, GAUGE_REFERENCE);
// GAUGE_REFERENCE = 200
// mode = 'min' (default)
// factor = Math.min(width, height) / 200
// s(px) = px * factor
```

---

## Arc Geometry Math

Identical to NeedleGauge. See NeedleGauge spec for full derivation. Summary:

### Sweep Angle Clamping

```typescript
const sweepDegrees = clampArcAngle(styles?.arcAngle);
// clampArcAngle(d) = Math.min(300, Math.max(30, d ?? 180))
```

### Arc Path Construction

```typescript
const sweepRad = (sweepDegrees * Math.PI) / 180;
const halfSweep = sweepRad / 2;

const startSvgAngle = -Math.PI / 2 - halfSweep;
const endSvgAngle = -Math.PI / 2 + halfSweep;

const x1 = cx + r * Math.cos(startSvgAngle);
const y1 = cy + r * Math.sin(startSvgAngle);
const x2 = cx + r * Math.cos(endSvgAngle);
const y2 = cy + r * Math.sin(endSvgAngle);

const largeArc = sweepDegrees > 180 ? 1 : 0;
const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
```

### Arc Length

```typescript
const totalLen = arcLength(radius, sweepDegrees);
// (sweepDegrees / 360) * 2 * Math.PI * radius
```

### Arc Bottom Fraction

```typescript
const arcBottomFraction =
  sweepDegrees <= 180 ? 0 : Math.sin(halfSweep - Math.PI / 2);
```

### Radius Calculation

```typescript
const textSpace = sweepDegrees <= 180 ? s(50) : s(20); // NOTE: different from NeedleGauge
const totalVertical = padding * 2 + textSpace;
const maxRadius = Math.min(
  (width - padding * 2) / 2,
  (height - totalVertical) / (1 + arcBottomFraction),
);
const radius = Math.max(s(40), maxRadius);
const cx = width / 2;
const cy = padding + radius;
```

The `textSpace` values differ from NeedleGauge:

- `s(50)` for <= 180 (vs NeedleGauge's `s(60)`) because text is inside the arc, needing less space below.
- `s(20)` for > 180 (vs NeedleGauge's `s(60)`) because text is inside the arc, not below the arc bottom.

---

## Value Fill Arc Rendering Math

The fill arc is the primary visual indicator, replacing the needle.

### Value Dash Calculation

```typescript
const clampedValue = Math.min(max, Math.max(min, renderValue));
const valueDash = buildValueDash(clampedValue, min, max, totalLen);
```

```typescript
function buildValueDash(value, min, max, totalLength) {
  const range = max - min;
  const ratio = (clamp(value, min, max) - min) / range;
  const segLength = ratio * totalLength;
  return {
    dasharray: `${segLength} ${totalLength}`,
    dashoffset: 0, // always starts from the beginning (offset = -0 = 0)
  };
}
```

- The fill arc always starts from the arc's start point (min) and extends to the value's proportional position.
- `dashoffset` is `0` (or `-0`) because the fill starts at the beginning of the path.
- At `value = min`: `segLength = 0`, no fill visible.
- At `value = max`: `segLength = totalLength`, entire arc filled.
- At `value = (min+max)/2`: half the arc is filled.

### Fill Arc Color

```typescript
const valueColor =
  alertZones.length > 0
    ? getZoneColor(clampedValue, alertZones, "#3b82f6")
    : "#3b82f6";
```

- When zones exist: uses zone color if value is in a zone, otherwise falls back to `#3b82f6`.
- When no zones exist: always `#3b82f6`.
- This is different from NeedleGauge, which always calls `getZoneColor` and defaults to `#374151`.

---

## SVG Element Tree

```
<ResponsiveContainer>
  <svg width={width} height={height} shapeRendering="geometricPrecision"
       role="meter" aria-valuenow aria-valuemin aria-valuemax aria-label>

    <!-- 1. Background arc -->
    <path d={arcPathD} fill="none" stroke="#e5e7eb"
          strokeWidth={arcThickness} strokeLinecap="butt" />

    <!-- 2. Alert zone arcs (one per zone, 25% opacity) -->
    {alertZones.map(zone =>
      <path d={arcPathD} fill="none" stroke={zone.color}
            strokeWidth={arcThickness}
            strokeDasharray={z.dasharray} strokeDashoffset={z.dashoffset}
            opacity={0.25} />
    )}

    <!-- 3. Value fill arc -->
    <path d={arcPathD} fill="none" stroke={valueColor}
          strokeWidth={arcThickness} strokeLinecap="butt"
          strokeDasharray={valueDash.dasharray}
          strokeDashoffset={valueDash.dashoffset} />

    <!-- 4. Value text (centered inside arc, with optional unit tspan) -->
    <text x={cx} y={valueY} textAnchor="middle" dominantBaseline="central"
          fontSize={valueFontSize} fontFamily fontWeight
          fill={styles.value.color ?? valueColor}>
      {formatValue(renderValue)}
      {unit && <tspan fontSize={unitFontSize} fontFamily fontWeight
                      fill={styles.unit.color ?? '#6b7280'}> {unit}</tspan>}
    </text>

    <!-- 5. Label text (centered inside arc, below value) -->
    {label &&
      <text x={cx} y={labelYPos} textAnchor="middle" dominantBaseline="central"
            fontSize={labelFontSize} fontFamily fontWeight fill />
    }

    <!-- 6. Min label -->
    <text x={endpoints.startX} y={endpoints.startY}
          textAnchor="middle" fontSize fontFamily fontWeight fill />

    <!-- 7. Max label -->
    <text x={endpoints.endX} y={endpoints.endY}
          textAnchor="middle" fontSize fontFamily fontWeight fill />

    <!-- 8. Zone boundary values (conditional: showZoneValues && zones.length > 0) -->
    {boundaries.map(bv =>
      <text x={pos.x} y={pos.y} textAnchor="middle"
            fontSize fontFamily fontWeight fill />
    )}

    <!-- 9. Timestamp text (conditional: showLastUpdated && data.timestamp != null) -->
    <text x={cx} y={tsY} textAnchor="middle"
          fontSize fontFamily fontWeight fill />

  </svg>
</ResponsiveContainer>
```

Note the element order difference from NeedleGauge: value and label text come before min/max labels in the SVG tree (both are rendered inside the arc, so paint order relative to labels does not matter visually).

---

## Exact SVG/CSS Properties Per Element

### Background Arc `<path>`

| Attribute       | Value                                             |
| --------------- | ------------------------------------------------- |
| `d`             | `buildArcPath(cx, cy, radius, sweepDegrees).path` |
| `fill`          | `"none"`                                          |
| `stroke`        | `"#e5e7eb"`                                       |
| `strokeWidth`   | `s(styles.arcThickness ?? 20)`                    |
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
| `opacity`          | `0.25`                                          |

### Value Fill Arc `<path>`

| Attribute          | Value                                  |
| ------------------ | -------------------------------------- |
| `d`                | Same `arcPathD` as background          |
| `fill`             | `"none"`                               |
| `stroke`           | `valueColor` (zone color or `#3b82f6`) |
| `strokeWidth`      | Same `arcThickness`                    |
| `strokeLinecap`    | `"butt"`                               |
| `strokeDasharray`  | `valueDash.dasharray`                  |
| `strokeDashoffset` | `valueDash.dashoffset`                 |

### Value `<text>`

| Attribute          | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| `x`                | `cx`                                                    |
| `y`                | `valueY` (see Text Positioning)                         |
| `textAnchor`       | `"middle"`                                              |
| `dominantBaseline` | `"central"`                                             |
| `fontSize`         | `s(styles.value.fontSize ?? 26)`                        |
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

| Attribute          | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| `x`                | `cx`                                                    |
| `y`                | `labelYPos` (see Text Positioning)                      |
| `textAnchor`       | `"middle"`                                              |
| `dominantBaseline` | `"central"`                                             |
| `fontSize`         | `s(styles.label.fontSize ?? 12)`                        |
| `fontFamily`       | `styles.label.fontFamily ?? 'var(--relay-font-family)'` |
| `fontWeight`       | `styles.label.fontWeight ?? 400`                        |
| `fill`             | `styles.label.color ?? '#6b7280'`                       |

Note: ArcGauge label has `dominantBaseline="central"`, unlike NeedleGauge which omits it.

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

### Timestamp `<text>`

`data` is the required prop providing value and timestamp. `data.value` is used as the component value and `data.timestamp` as the last updated timestamp. Recommended pattern: `<ArcGauge data={useRelayLatest({...})} showLastUpdated />`

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

Identical to NeedleGauge:

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

---

## Text Positioning Formulas

### Value and Label Text — Always Centered Inside the Arc

Unlike NeedleGauge, ArcGauge always centers text inside the arc regardless of sweep angle:

```typescript
const totalTextHeight = label
  ? valueFontSize + labelFontSize + s(4)
  : valueFontSize;
const valueY = cy - totalTextHeight / 2 + valueFontSize / 2;
const labelYPos = valueY + valueFontSize * 0.5 + labelFontSize * 0.5 + s(4);
```

- `totalTextHeight`: the combined height of value + label (with `s(4)` gap), or just value if no label.
- `valueY`: positions the value text so the entire text stack is vertically centered at `cy` (the arc's center).
- `labelYPos`: positioned below the value text with `s(4)` gap.
- Both use `dominantBaseline="central"` for precise vertical centering.

This means for both sweep <= 180 and sweep > 180, the value/label stack sits at the geometric center of the arc, inside the arc.

### Min/Max Label Positions

Same as NeedleGauge:

```typescript
const labelRadius = radius + arcThickness / 2 + s(12);
const endpoints = getArcEndpoints(cx, cy, labelRadius, sweepDegrees);
```

### Zone Boundary Value Positions

Same as NeedleGauge:

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
```

### Timestamp Position

```typescript
const tsFontSize = s(styles.lastUpdated.fontSize ?? 9);
const tsY =
  (label ? labelYPos + labelFontSize * 0.5 : valueY + valueFontSize * 0.5) +
  tsFontSize +
  s(4);
```

Positioned below the label (or value if no label). Always the bottommost text element.

---

## Padding and Zone Value Extra

```typescript
const minMaxFontSize = s(styles.minMax.fontSize ?? 10);
const zoneValueExtra =
  showZoneValues && alertZones.length > 0 ? minMaxFontSize + s(4) : 0;
const padding = s(20) + zoneValueExtra;
```

Same as NeedleGauge.

---

## D3 Arc Path Construction

This component does **not** use D3 for arc paths. Paths are constructed with raw SVG `M ... A ...` commands via `buildArcPath()` from `src/gauges/shared.ts`.

---

## Color Resolution: Zone Color > Default

For the **fill arc** and **value text fill**:

```typescript
const valueColor =
  alertZones.length > 0
    ? getZoneColor(clampedValue, alertZones, "#3b82f6")
    : "#3b82f6";
```

- When zones exist: iterates zones, returns first matching zone's color, falls back to `#3b82f6`.
- When no zones exist: always `#3b82f6`.

For value text specifically:

```typescript
fill={valueStyle?.color ?? valueColor}
```

Explicit `styles.value.color` overrides zone-based coloring.

---

## useZoneTransition Hook Behavior

Identical to NeedleGauge:

```typescript
useZoneTransition(renderValue ?? min, alertZones, onZoneChange);
```

- Stores previous zone in a `useRef`.
- First call: initializes, does NOT fire `onZoneChange`.
- Subsequent calls: compares by `min`/`max`/`color` identity.
- Fires `onZoneChange({ previousZone, currentZone, value })` only on actual zone transitions.

---

## Validation: Hard vs Soft

Identical to NeedleGauge, with `'ArcGauge'` as the component name in error messages.

### Hard Validation (throws)

```typescript
validateRange(min, max, "ArcGauge");
validateAlertZones(alertZones, "ArcGauge");
```

### Soft Validation (onError + fallback)

```typescript
const lastValidRef = useRef<number | null>(null);
const validatedValue = validateValue(value, "ArcGauge", onError);
if (validatedValue !== null) {
  lastValidRef.current = validatedValue;
}
const renderValue = lastValidRef.current;
```

Same `lastValidRef` pattern as NeedleGauge.

---

## Edge Cases

| Scenario                                          | Behavior                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `value = NaN`                                     | `onError` fired, falls back to last valid value. If no prior valid value and `showLoading=true`, skeleton shown. |
| `value = Infinity`                                | Same as NaN.                                                                                                     |
| `value = -Infinity`                               | Same as NaN.                                                                                                     |
| `value = null`                                    | Returns `null` from validateValue (no onError). Skeleton or empty depending on `showLoading`.                    |
| `value = undefined`                               | Same as null.                                                                                                    |
| `value < min`                                     | Fill arc at zero, text shows actual value.                                                                       |
| `value > max`                                     | Fill arc at full, text shows actual value.                                                                       |
| `value = min`                                     | Fill arc at zero length (no visible fill), text shows min.                                                       |
| `value = max`                                     | Fill arc covers entire background arc.                                                                           |
| `min > max`                                       | Throws immediately.                                                                                              |
| `min === max`                                     | Throws immediately.                                                                                              |
| `arcAngle = 0`                                    | Clamped to 30.                                                                                                   |
| `arcAngle = 500`                                  | Clamped to 300.                                                                                                  |
| `arcAngle = undefined`                            | Defaults to 180.                                                                                                 |
| `alertZones` overlap                              | Throws immediately.                                                                                              |
| No zones, value in range                          | Fill uses `#3b82f6`, value text uses `#3b82f6`.                                                                  |
| Zones defined, value outside all zones            | Fill uses `#3b82f6`, zones still render at 25% opacity.                                                          |
| `showZoneValues = true`, no zones                 | No boundary labels rendered, no extra padding.                                                                   |
| `showLastUpdated = true`, `data.timestamp = null` | Timestamp not shown (no timestamp available).                                                                    |
| `showLastUpdated = false`                         | Timestamp not rendered regardless of `data.timestamp`.                                                           |
| Container resized to 0x0                          | Scaler factor 0, all dimensions 0. Invisible.                                                                    |
| `formatValue` throws                              | Unhandled — error propagates.                                                                                    |
| Multiple zones, value on boundary                 | First matching zone in array order wins.                                                                         |
| `onZoneChange` on initial render                  | NOT fired.                                                                                                       |
| `value` toggles valid/invalid                     | Fill arc holds at last valid position during invalid period.                                                     |
