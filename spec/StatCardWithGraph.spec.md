# StatCardWithGraph — Component Specification

Source: `src/cards/StatCardWithGraph.tsx`
Requirements: `requirements/StatCardWithGraph.md`

---

## Component Signature

```typescript
import { useMemo, useRef, useState, useEffect } from "react";
import { scaleTime, scaleLinear, line, area, extent } from "d3";
import type { AlertZone, FontStyle, BackgroundStyle } from "../utils/types";
import type { ComponentError } from "../utils/validation";
import type { ZoneTransition } from "../utils/useZoneTransition";

export interface StatCardWithGraphStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

export interface StatCardWithGraphProps {
  // -- Display --
  data: RelayDataPoint; // result from useRelayLatest(); data.value provides the component value, data.timestamp provides the last updated time
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;

  // -- Sparkline --
  sparklineData?: any[];
  sparklineExtractor?: (point: any) => number;
  sparklineWindow?: number; // ms, default 30000
  graphLineColor?: string; // default '#3b82f6'

  // -- Alert Zones --
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;

  // -- Timestamp --
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
  lastUpdatedMargin?: number;

  // -- Border --
  borderRadius?: number | "rounded" | "sharp";
  borderColor?: string;
  borderThickness?: number;

  // -- Styles --
  styles?: StatCardWithGraphStyles;

  // -- Loading / Errors --
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}
```

**Prop defaults applied via destructuring:**

```typescript
sparklineData = [];
sparklineWindow = 30000;
graphLineColor = "#3b82f6";
alertZones = [];
showLastUpdated = false;
formatTimestamp = defaultFormatTimestamp;
lastUpdatedMargin = 8;
showLoading = true;
```

---

## Internal Constants

```typescript
const STAT_REFERENCE = 300;
```

Same reference size as StatCard. All proportional scaling is relative to a 300px-wide container.

---

## Internal Utility Functions

Identical to StatCard. These four functions are duplicated in the file (not imported from StatCard):

### `resolveBorderRadius(value?: number | 'rounded' | 'sharp'): string`

```typescript
function resolveBorderRadius(value?: number | "rounded" | "sharp"): string {
  if (value === "sharp") return "0";
  if (value === "rounded") return "var(--relay-border-radius, 8px)";
  if (typeof value === "number") return `${value}px`;
  return "var(--relay-border-radius, 8px)";
}
```

### `defaultDisplayFormat(value: any): string`

```typescript
function defaultDisplayFormat(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return defaultFormatValue(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
```

### `getZoneColor(value: number, zones: AlertZone[]): string | null`

```typescript
function getZoneColor(value: number, zones: AlertZone[]): string | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return null;
}
```

### `toCss(val: string | number | undefined): string | undefined`

```typescript
function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === "number" ? `${val}px` : val;
}
```

---

## ResizeObserver Setup

Identical to StatCard:

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [dims, setDims] = useState({
  width: STAT_REFERENCE,
  height: STAT_REFERENCE,
});

useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setDims((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h },
      );
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

**Dedup logic:** The functional `setDims` updater returns the same reference when rounded width and height are unchanged, preventing re-render cascades.

---

## Scaler Configuration

```typescript
const s = createScaler(dims.width, dims.height, STAT_REFERENCE, "width");
```

Mode `'width'`: scale factor = `dims.width / 300`. Same as StatCard.

---

## Missing Extractor Warning

```typescript
useEffect(() => {
  if (sparklineData.length > 0 && !sparklineExtractor) {
    console.warn(
      "StatCardWithGraph: sparklineData provided without sparklineExtractor. " +
        "Sparkline will not render. Provide sparklineExtractor={(point) => point.yourMetric}.",
    );
  }
}, [sparklineData.length > 0, !sparklineExtractor]);
```

**Dedup:** The dependency array uses boolean expressions (`sparklineData.length > 0` and `!sparklineExtractor`), so the warning only re-fires when the truthiness of these conditions changes (not on every data update).

---

## Sparkline Color Priority

```typescript
const isGraphColorExplicit = graphLineColor !== "#3b82f6";
const sparkColor = isGraphColorExplicit
  ? graphLineColor
  : (zoneColor ?? graphLineColor);
```

Resolution order:

1. If `graphLineColor` differs from the default `'#3b82f6'`, the developer has explicitly set it. Use `graphLineColor` regardless of zone color.
2. If `graphLineColor` is the default, check `zoneColor`. If a zone color is active, use it.
3. If no zone color is active, use the default `'#3b82f6'`.

Note: If a developer explicitly passes `graphLineColor="#3b82f6"` (same as default), this is indistinguishable and zone color will override it.

---

## Sparkline Path Memoization (`useMemo`)

```typescript
const sparklinePath = useMemo(() => { ... },
  [sparklineData, sparklineExtractor, sparklineWindow, dims.width, dims.height]
);
```

### Dependencies

The memoized path recomputes when any of these change:

- `sparklineData` — new data points
- `sparklineExtractor` — different extraction function
- `sparklineWindow` — changed time window
- `dims.width` — container resized horizontally
- `dims.height` — container resized vertically

### Return Type

```typescript
{
  line: string;
  area: string;
  viewBox: string;
}
```

### Early Returns (no sparkline rendered)

The memo returns `{ line: '', area: '', viewBox: '0 0 100 40' }` in these cases:

1. `sparklineExtractor` is falsy.
2. `sparklineData.length < 2`.
3. After extraction and validation, fewer than 2 valid points remain.
4. After time windowing, fewer than 2 points remain in the window.

An empty `line` string causes the SVG to not render (checked via `sparklinePath.line` truthiness).

### Data Extraction and Validation

```typescript
const points: { timestamp: number; value: number }[] = [];
for (const point of sparklineData) {
  const ts = point.timestamp;
  if (typeof ts !== "number" || !Number.isFinite(ts)) continue; // skip invalid timestamp
  const val = sparklineExtractor(point);
  if (typeof val !== "number" || !Number.isFinite(val)) continue; // skip invalid value
  points.push({ timestamp: ts, value: val });
}
```

Each raw data point goes through two validations:

1. `point.timestamp` must be a finite number.
2. `sparklineExtractor(point)` must return a finite number.
   Points failing either check are silently dropped.

### Time Windowing

```typescript
const latestTs = Math.max(...points.map((p) => p.timestamp));
const windowStart = latestTs - sparklineWindow;
const windowed = points.filter((p) => p.timestamp >= windowStart);
```

- `latestTs` = maximum timestamp across all valid extracted points.
- `windowStart` = `latestTs - sparklineWindow` (default: `latestTs - 30000`).
- Only points with `timestamp >= windowStart` survive (inclusive).

### D3 Scale Setup

```typescript
const [tMin, tMax] = extent(windowed, (d) => d.timestamp) as [number, number];

let yMin = Infinity;
let yMax = -Infinity;
for (const d of windowed) {
  if (d.value < yMin) yMin = d.value;
  if (d.value > yMax) yMax = d.value;
}
if (yMin === yMax) {
  yMin -= 1;
  yMax += 1;
}
```

**Identical Y values edge case:** When all values are the same, `yMin === yMax`. The component expands the range by +/- 1, producing a flat horizontal line at the vertical center of the SVG.

```typescript
const w = Math.max(100, dims.width);
const h = Math.max(40, Math.round(dims.height * 0.6));
```

- SVG logical width: `Math.max(100, dims.width)` — minimum 100 to avoid degenerate paths.
- SVG logical height: `Math.max(40, Math.round(dims.height * 0.6))` — 60% of container height, minimum 40.

```typescript
const xScale = scaleTime()
  .domain([new Date(tMin), new Date(tMax)])
  .range([0, w]);

const yScale = scaleLinear().domain([yMin, yMax]).range([h, 0]); // inverted: larger values at top
```

- `scaleTime`: maps timestamp range to horizontal pixel range `[0, w]`.
- `scaleLinear`: maps value range to vertical pixel range `[h, 0]` (inverted so higher values render higher on screen).

### Line and Area Generator Configuration

```typescript
type SparkPoint = { timestamp: number; value: number };

const lineGen = line<SparkPoint>()
  .x((d) => xScale(new Date(d.timestamp)))
  .y((d) => yScale(d.value));

const areaGen = area<SparkPoint>()
  .x((d) => xScale(new Date(d.timestamp)))
  .y0(h) // bottom of SVG
  .y1((d) => yScale(d.value)); // data line
```

- **Line generator:** produces an SVG `d` attribute string connecting points with straight line segments.
- **Area generator:** fills the region between the data line (`y1`) and the bottom of the SVG (`y0 = h`).

### Final Return

```typescript
return {
  line: lineGen(windowed) ?? "",
  area: areaGen(windowed) ?? "",
  viewBox: `0 0 ${w} ${h}`,
};
```

Both generators can return `null` if the input is empty, hence the `?? ''` fallback.

---

## DOM Tree

### Loading State (skeleton)

Condition: `showLoading === true && renderValue === null`

Identical to StatCard — same skeleton div, same gradient, same animation. No sparkline SVG.

```
div (ref=containerRef)
  style:
    width:            toCss(styles?.width) ?? '100%'
    height:           toCss(styles?.height) ?? '100%'
    borderRadius:     resolveBorderRadius(borderRadius)
    background:       linear-gradient(90deg, ...)
    backgroundSize:   '200% 100%'
    animation:        'relay-skeleton-shimmer 1.5s ease-in-out infinite'
```

### Normal State

Condition: NOT loading

```
div.container (ref=containerRef)
  style:
    width:            toCss(styles?.width) ?? '100%'
    height:           toCss(styles?.height) ?? '100%'
    position:         'relative'
    overflow:         'hidden'
    backgroundColor:  styles?.background?.color ?? 'transparent'
    borderRadius:     resolveBorderRadius(borderRadius)    // stored in local `br`
    border:           (borderColor || borderThickness)
                        ? `${borderThickness ?? 1}px solid ${borderColor ?? 'var(--relay-border-color, #e0e0e0)'}`
                        : undefined
    boxSizing:        'border-box'
  │
  ├─ [if sparklinePath.line is truthy]
  │  svg.sparkline
  │    viewBox:             sparklinePath.viewBox    // e.g., '0 0 300 120'
  │    preserveAspectRatio: 'none'
  │    style:
  │      position:       'absolute'
  │      bottom:         0
  │      left:           0
  │      width:          '100%'
  │      height:         '60%'
  │      pointerEvents:  'none'
  │    │
  │    ├─ path.areaFill
  │    │    d:        sparklinePath.area
  │    │    fill:     sparkColor
  │    │    opacity:  0.15
  │    │
  │    └─ path.line
  │         d:            sparklinePath.line
  │         fill:         'none'
  │         stroke:       sparkColor
  │         strokeWidth:  s(2)
  │         opacity:      0.5
  │
  └─ div.contentOverlay
       style:
         position:        'relative'
         zIndex:          1
         display:         'flex'
         flexDirection:   'column'
         alignItems:      'center'
         justifyContent:  'center'
         width:           '100%'
         height:          '100%'
         padding:         s(16)
         boxSizing:       'border-box'
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
       └─ [if showLastUpdated === true AND data.timestamp != null]
          div.timestamp
            style:
              fontFamily:   lastUpdatedStyleR?.fontFamily ?? 'var(--relay-font-family)'
              fontSize:     lastUpdatedStyleR?.fontSize ?? s(11)
              fontWeight:   lastUpdatedStyleR?.fontWeight ?? 400
              color:        lastUpdatedStyleR?.color ?? zoneColor ?? '#9ca3af'
              marginTop:    s(lastUpdatedMargin)
            text: {formatTimestamp(data.timestamp)}
```

Key structural differences from StatCard:

- Container has `position: 'relative'` and `overflow: 'hidden'` (StatCard has neither).
- Container does NOT have `display: 'flex'` directly; the flex layout is on the content overlay div instead.
- Container does NOT have `padding` directly; padding is on the content overlay div.
- The SVG sparkline is a sibling of the content overlay, positioned absolutely behind it.
- The content overlay has `zIndex: 1` to ensure text renders above the sparkline.

---

## Value Display Chain

Identical to StatCard:

```
renderValue → formatValue(renderValue)           [if formatValue prop provided]
renderValue → defaultDisplayFormat(renderValue)   [if formatValue prop NOT provided]
→ displayValue string
```

---

## `data` Prop

The required prop providing value and timestamp. `data.value` is used as the component value and `data.timestamp` as the last updated timestamp. Recommended pattern: `<StatCardWithGraph data={useRelayLatest({...})} showLastUpdated />`

---

## Zone Color Resolution and Propagation

Same resolution as StatCard for text elements:

| Element   | Color Resolution Chain                                   |
| --------- | -------------------------------------------------------- |
| Label     | `labelStyleR?.color` -> `zoneColor` -> `'#6b7280'`       |
| Value     | `valueStyleR?.color` -> `zoneColor` -> `'currentColor'`  |
| Timestamp | `lastUpdatedStyleR?.color` -> `zoneColor` -> `'#9ca3af'` |

Additional for sparkline:

| Element                   | Color Resolution                                                        |
| ------------------------- | ----------------------------------------------------------------------- |
| Sparkline (stroke + fill) | `isGraphColorExplicit ? graphLineColor : (zoneColor ?? graphLineColor)` |

---

## Font Resolution via `resolveFont`

Identical to StatCard:

```typescript
const valueStyleR = resolveFont(styles?.value);
const labelStyleR = resolveFont(styles?.label);
const lastUpdatedStyleR = resolveFont(styles?.lastUpdated);
```

---

## Skeleton Animation Keyframes

Identical to StatCard:

```css
@keyframes relay-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

Animation: `1.5s ease-in-out infinite`.

---

## Loading State Conditions

Identical to StatCard:

1. `showLoading === true` (default) AND `renderValue === null` (no previous valid value).
2. When loading, the entire card is replaced by the skeleton div. No sparkline SVG is rendered.

---

## Stroke Width Scaling

The sparkline stroke width scales proportionally with the container:

```typescript
strokeWidth={s(2)}
```

- At 300px container: `s(2) = 2` (2px stroke).
- At 150px container: `s(2) = 1` (1px stroke).
- At 600px container: `s(2) = 4` (4px stroke).

---

## Edge Cases

### Fewer Than 2 Points

If `sparklineData.length < 2`, or after extraction/validation fewer than 2 valid points remain, or after time windowing fewer than 2 points remain: the memo returns empty strings, `sparklinePath.line` is falsy, and the SVG is not rendered.

### Identical Y Values

When all y-values are equal: `yMin -= 1; yMax += 1`. The line renders as a flat horizontal line at the vertical midpoint of the SVG.

### Missing Extractor

When `sparklineData` is non-empty but `sparklineExtractor` is not provided:

- A console warning fires (via `useEffect`).
- The `useMemo` returns empty strings (first guard: `!sparklineExtractor`).
- No SVG is rendered.

### Non-Finite Timestamps or Values

Points with `typeof ts !== 'number'`, `!Number.isFinite(ts)`, `typeof val !== 'number'`, or `!Number.isFinite(val)` are silently dropped from the dataset.

### Empty sparklineData

`sparklineData = []` (default): no extraction occurs, memo returns empty strings, no SVG rendered. No warning is logged (the warning only fires when `sparklineData.length > 0 && !sparklineExtractor`).

### Single Valid Point After Windowing

If time windowing reduces the dataset to 1 point, the memo returns empty strings. A line requires at least 2 points.

---

## Zone Transition Callback

```typescript
useZoneTransition(
  zoneNumeric ?? 0,
  alertZones,
  zoneNumeric !== null ? onZoneChange : undefined,
);
```

Identical to StatCard. `ZoneTransition` type: `{ previousZone: AlertZone | null, currentZone: AlertZone | null, value: number }`. Zone identity compared by `min`, `max`, `color` fields. First render initializes silently.

---

## Alert Zone Validation

Identical to StatCard. `validateAlertZones(alertZones, 'StatCardWithGraph')` runs synchronously during render when `alertZones.length > 0`. Hard error on invalid configuration.
