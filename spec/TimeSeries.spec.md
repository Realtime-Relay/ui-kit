# TimeSeries — Component Specification

Source: `src/charts/TimeSeries.tsx`
Requirements: `requirements/TimeSeries.md`

## Component Signature

```typescript
interface TimeSeriesStyles {
  title?: FontStyle;
  legend?: FontStyle;
  tooltip?: FontStyle;
  axis?: FontStyle;
  background?: BackgroundStyle;
  width?: number | string; // passed to ResponsiveContainer as explicitWidth
  height?: number | string; // passed to ResponsiveContainer as explicitHeight
}

interface TimeSeriesZoneTransition {
  device: string;
  metric: string;
  previousZone: AlertZone | null;
  currentZone: AlertZone | null;
  value: number;
}

interface TimeSeriesProps {
  data: Record<string, DataPoint[]>;
  metrics?: MetricConfig[];
  title?: string;
  formatValue?: (value: number) => string;
  renderTooltip?: (point: DataPoint) => React.ReactNode;
  onHover?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent,
  ) => void;
  onRelease?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent,
  ) => void;
  showGrid?: boolean;
  gridColor?: string;
  gridThickness?: number;
  styles?: TimeSeriesStyles;
  area?: boolean;
  areaColor?: string;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showLoading?: boolean;
  downsample?: DownsampleConfig;
  timeWindow?: number;
  autoScroll?: boolean;
  start?: Date | number;
  end?: Date | number;
  lineThickness?: number;
  pointSize?: number;
  zoomEnabled?: boolean;
  annotations?: Annotation[];
  formatLegend?: (device: string, metric: string) => string;
  annotationMode?: boolean;
  onAnnotate?: (
    id: number,
    timestamp: number,
    type: "click" | "start_drag" | "end_drag",
  ) => void;
  annotationColor?: string;
  zoomColor?: string;
  onAnnotationHover?: (
    hover: boolean,
    annotation: Annotation,
  ) => React.ReactNode | void;
  onZoneChange?: (transition: TimeSeriesZoneTransition) => void;
  formatTimestamp?: (timestamp: number) => string;
  onError?: (error: ComponentError) => void;
}
```

## Annotation Types

```typescript
interface PointAnnotation {
  timestamp: number;
  label?: string;
  color?: string;
  data?: Record<string, unknown>;
}

interface RangeAnnotation {
  start: number;
  end: number;
  label?: string;
  color?: string;
  data?: Record<string, unknown>;
}

type Annotation = PointAnnotation | RangeAnnotation;
```

Type guard: `isRangeAnnotation(a)` checks for `'end' in a`.

## Rendering

### Layout Structure

- Outer: `ResponsiveContainer` (width: 100%, observes resize)
- Flex container: direction depends on legend position (row for left/right, column for top/bottom)
- Inner: `<svg>` with `style={{ userSelect: 'none' }}` and `<g transform>` for margin offset
- Tooltip: absolutely positioned `<div>` outside SVG, in the `position: relative` wrapper

### Rendering Order (SVG stacking, bottom to top)

1. Grid lines (dashed horizontal lines)
2. Alert zone rects (10% opacity)
3. **Annotation visuals** (dashed lines, shaded bands) — `pointerEvents: none`
4. Data lines, area fills, and point circles (clipped to chart bounds)
5. Brush/annotation preview overlay (zoom selection or annotation-in-progress)
6. Hover crosshair line (dashed vertical)
7. X-axis and Y-axis
8. **Invisible overlay rect** (`ref={overlayRef}`) (captures all mouse events: mouseDown, mouseMove, mouseUp, mouseLeave)

### Proportional Scaling

- Reference: 500px width (`CHART_REFERENCE`)
- `createScaler(width, height, CHART_REFERENCE, 'width')` — **capped at 1x**: `Math.min(rawS(px), px)`
- Never upscales beyond reference values; only scales down for smaller containers
- Applied to: fonts, margins, padding, tooltip offset, legend spacing

### ClipPath

- Unique per instance via `useId().replace(/:/g, '_')`
- Prevents line/area overflow beyond chart bounds

## X-Domain Resolution

Priority order (first match wins):

1. `zoomDomain` (set by brush interaction)
2. `start` + `end` props (fixed range)
3. `timeWindow` — domain: `[now - timeWindow, now]`
4. Data extent — `d3.extent(allTimestamps)`

### Autoscroll

- Active when: `timeWindow` is set AND `autoScroll !== false` AND no `start/end` AND no `zoomDomain`
- `effectiveNow` is computed inline during render (no rAF loop): `Math.min(Date.now(), latestDataTs + 1000)`
- This avoids double-render jitter — data flush is the only render trigger; the x-axis right edge advances as a side effect of data changes
- Clamped to `latestDataTs + 1000ms` so the chart never scrolls more than 1s past the latest data point (prevents empty space when data lags)
- When no data exists yet, falls back to `Date.now()`
- Paused during zoom (falls back to static `now` state)

## Y-Domain Resolution

- Computed from **visible** data across all active series — filtered to the current x-domain (zoom, timeWindow, start/end) before computing min/max
- When zoomed: y-axis rescales to the min/max of data within the zoomed time range (not the full dataset)
- Padding: 5% of `(yMax - yMin)` added to top and bottom
- **Zero clamping**: when `yMin >= 0`, the domain bottom is `Math.max(0, yMin - padding)` — ensures the 0 line sits on the x-axis instead of floating above it
- When data contains negative values, padding extends below normally
- `d3.scaleLinear().domain([yDomainMin, yMax + padding]).range([chartHeight, 0]).nice()`
- Alert zones extend the Y domain if their min/max exceed data range

## Series Resolution

1. `Object.entries(data)` → iterate devices
2. For each device, resolve metrics: `metricsProp` or auto-detect numeric keys from first non-empty device
3. Create internal `Series[]`: one per device-metric combo
4. Each series: `{ id: "device:metric", device, metricKey, label, color, lineThickness, pointSize, visible, data }`
5. Colors: cycle through D3 `schemeCategory10` palette across all series

### Legend Labels

- Single device (1 key in `data`): `metric.label ?? metric.key`
- Multiple devices: `formatLegend?.(device, metric) ?? \`[${device}]: ${metric}\``

## Mouse Interaction

All mouse events handled on a single invisible overlay `<rect>` covering the chart area.

### handleMouseDown

```
if annotationMode:
  record brushStart pixel, set isDragging, allocate new annotation ID
else if zoomEnabled:
  record brushStart pixel, set isDragging
```

### handleMouseMove

```
if isDragging && (annotationMode || zoomEnabled):
  update brushEnd (clamped to [0, chartWidth])
  if annotationMode && drag > 10px && !dragFiredYet:
    fire onAnnotate(id, clampedTimestamp, 'start_drag')
  return (skip tooltip)

// Tooltip logic:
find nearest data point via d3 bisector
compute pixel distance from cursor to nearest line (all series)
check if cursor is inside an annotation region

if insideAnnotation && NOT nearLine (>20px from any line):
  suppress data tooltip, show annotation tooltip
else:
  show data tooltip, suppress annotation tooltip

// Annotation hover detection:
if onAnnotationHover provided:
  check cursor proximity to each annotation (4px tolerance for point, full width for range)
  fire onAnnotationHover(true, ann) on enter, (false, ann) on leave
  if callback returns ReactNode → set annotation tooltip state
```

### handleMouseUp

```
if annotationMode && isDragging:
  if drag > 10px → fire onAnnotate(id, clampedTimestamp, 'end_drag')
  if drag <= 10px → fire onAnnotate(id, clampedTimestamp, 'click')
  clear brush state
else if zoomEnabled && isDragging:
  if drag > 10px → set zoomDomain from xScale.invert(brushStart, brushEnd)
  clear brush state
```

### handleMouseLeave

- If a drag is active (isDragging), the drag is **NOT** cancelled — only tooltip and annotation hover state are cleared
- If no drag is active: clear isDragging, brushStart, brushEnd, tooltipData
- Clear annotation hover state (fire `onAnnotationHover(false, ...)` if active)
- Fire `onRelease` callback

### Viewport Clamping (Annotation Mode)

```typescript
const clampTs = (px: number) => {
  const clamped = Math.max(0, Math.min(px, chartWidth));
  const t = xScale.invert(clamped).getTime();
  return Math.max(xDomainMin.getTime(), Math.min(t, xDomainMax.getTime()));
};
```

### Cursor States

| Mode                  | Cursor      |
| --------------------- | ----------- |
| `annotationMode=true` | `copy`      |
| `zoomEnabled=true`    | `crosshair` |
| Both false            | default     |

## Brush / Preview Rendering

Rendered inside SVG after data lines, before the overlay rect.

### Zoom Brush

When `brushStart != null && brushEnd != null && !annotationMode`:

- `<rect>` from min to max of brush positions
- Fill: `zoomColor` at `opacity={0.15}`
- Stroke: `zoomColor` at `strokeWidth={1}`

### Window-Level Drag Handling

When a drag starts (`mouseDown`), `mousemove` and `mouseup` listeners are attached to `window` so the zoom selection continues even when the cursor leaves the chart area.

- `overlayRef` is used to map window-level mouse coordinates back to chart-relative positions via `getBoundingClientRect()`
- On `mouseLeave` during an active drag, the drag is NOT cancelled — only tooltip and annotation hover are cleared
- The window `mousemove` and `mouseup` listeners clean up automatically on mouseup or effect cleanup

### Annotation Preview

When `brushStart != null && brushEnd != null && annotationMode`:

- Drag < 10px: vertical dashed `<line>` at brushStart using `annotationColor`
- Drag >= 10px: `<rect>` with `annotationColor` fill at `opacity={0.2}` + solid stroke

Preview disappears on mouseUp (brush state cleared).

## Annotation Tooltip

- Positioned absolutely inside the chart's `position: relative` wrapper
- Z-index: 5 (below data point tooltip at z-index 10)
- **Viewport clamping**: horizontally centered on cursor, flips if overflowing edges. Vertically above cursor, flips below if no room above.
- `maxWidth: containerWidth - 8px`
- **Suppressed** when `tooltipData` is set (data point tooltip takes priority)

## Data Point Tooltip

- Uses shared `<Tooltip>` component
- Z-index: 10 (above annotation tooltip)
- Positioned at the cursor position (`mx + MARGIN.left`, `my + MARGIN.top`) instead of snapping to the nearest data point's chart position
- Crosshair line also appears at the cursor position
- Horizontal flip: if tooltip would overflow right edge, render to the left of cursor
- Vertical clamp: `Math.max(0, Math.min(y - 20, containerHeight - 60))`
- `renderTooltip` overrides with custom JSX
- Default: date/time header + colored dot per metric with label and value

## Legend

- Shared `<Legend>` component
- Swatch: rounded rectangle (`borderRadius: 3px`, width > height)
- Click: solo mode — `setVisibleSeries(new Set([clickedId]))`. Click again → restore all.
- Dimmed items: `opacity: 0.4`
- Vertical positions (left/right): `maxWidth: 140px`, `flexShrink: 0`, `overflow: hidden`

## Refs

### Drag / Window Listener Refs

```typescript
const overlayRef = useRef<SVGRectElement>(null); // reference to the invisible overlay rect for coordinate mapping during window-level drag
const windowMoveRef = useRef<((e: MouseEvent) => void) | null>(null); // window mousemove handler during drag
const windowUpRef = useRef<((e: MouseEvent) => void) | null>(null); // window mouseup handler during drag
```

### Annotation ID Management

```typescript
const annotationIdRef = useRef(0); // global counter
const currentAnnotationIdRef = useRef(0); // current interaction's ID
const annotationDragFired = useRef(false); // whether start_drag was emitted
```

- On mouseDown (annotation mode): increment `annotationIdRef`, store in `currentAnnotationIdRef`
- On mouseMove: if drag > 10px and `!annotationDragFired`, fire `start_drag` and set flag
- On mouseUp: fire either `click` or `end_drag` using `currentAnnotationIdRef`
- Result: `start_drag` and `end_drag` share the same ID; clicks get their own ID; IDs always increment

## Data Sorting

All visible data for rendering is sorted by timestamp before path generation:

```typescript
return [...filtered].sort((a, b) => a.timestamp - b.timestamp);
```

Prevents visual jumps from out-of-order SDK data.

## Per-Series Zone Transition Tracking

Unlike gauges and stat cards which use the shared `useZoneTransition` hook (single value), TimeSeries implements **custom per-series zone tracking** because it has multiple device×metric combinations that can each independently cross zone boundaries.

### State

```typescript
const prevZonesRef = useRef<Map<string, AlertZone | null>>(new Map());
```

- Key: series ID (`"device:metric"`)
- Value: the `AlertZone` the series was last in, or `null` if outside all zones

### Logic (runs in `useEffect` on every render when `onZoneChange` and `alertZones` are provided)

```
for each series in allSeries:
  get latest data point from validDataMap[series.device]
  extract numeric value for series.metricKey
  skip if value is non-finite

  find currentZone: first alertZone where value >= min && value <= max (or null)
  look up previousZone from prevZonesRef using series.id

  if previousZone === undefined (first time seeing this series):
    store currentZone in ref, do NOT fire callback

  if zone changed (compare by min/max/color, not reference):
    fire onZoneChange({ device, metric, previousZone, currentZone, value })
    update ref
```

### Effect Dependencies

```typescript
[validDataMap, allSeries, alertZones, onZoneChange];
```

### Zone Comparison

Zones are compared by identity (min, max, color), not by object reference:

```typescript
const changed =
  (prev === null) !== (currentZone === null) ||
  (prev !== null &&
    currentZone !== null &&
    (prev.min !== currentZone.min ||
      prev.max !== currentZone.max ||
      prev.color !== currentZone.color));
```

### Edge Cases

| Scenario                | Behavior                                                       |
| ----------------------- | -------------------------------------------------------------- |
| No `alertZones`         | No tracking, effect returns early                              |
| No `onZoneChange`       | No tracking, effect returns early                              |
| Value outside all zones | `currentZone = null`, transition fires if previously in a zone |
| Value is NaN/Infinity   | Skipped (no transition fired)                                  |
| Empty device data       | Skipped (no latest point)                                      |
| New series appears      | Initialized without firing callback                            |
| Series removed          | Stale entry stays in ref (harmless, no callback)               |

## Tooltip Timestamp Formatting

### Prop

```typescript
formatTimestamp?: (timestamp: number) => string;
```

### Flow

1. `formatTimestamp` is passed from `TimeSeriesProps` to the shared `<Tooltip>` component as `formatTimestamp`
2. Inside `Tooltip`, if `formatTimestamp` is provided:
   ```typescript
   const tsDisplay = formatTimestamp(data.point.timestamp);
   ```
3. If not provided, falls back to:
   ```typescript
   const tsDisplay = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
   ```
4. `tsDisplay` is rendered in the timestamp header `<div>` of the default tooltip
5. When `renderTooltip` is provided, `formatTimestamp` is **not used** — `renderTooltip` replaces the entire tooltip

### Tooltip Component Props (updated)

```typescript
interface TooltipProps {
  data: TooltipData | null;
  containerWidth: number;
  containerHeight: number;
  formatValue?: (value: number) => string;
  formatTimestamp?: (timestamp: number) => string; // NEW
  renderTooltip?: (point: DataPoint) => ReactNode;
  style?: FontStyle;
  s?: (px: number) => number;
}
```

## Downsampling (LTTB Cache)

Per-device downsampling is cached to prevent line jumping when new data arrives via stream flush.

### Cache Structure

```typescript
const downsampleCache =
  useRef<
    Record<string, { data: DataPoint[]; srcLen: number; lastTs: number }>
  >();
```

### Cache Logic

```
for each device:
  if no cache OR data grew >5% OR data shrank:
    run full LTTB downsample → store { sampled, srcLen, lastTs }
  else (cache hit):
    append any new points with timestamp > cached.lastTs to cached data
    update lastTs
```

- The 5% growth threshold prevents LTTB from re-bucketing on every stream flush, which shifts bucket boundaries and causes visible line jumping
- New realtime points (timestamp > last cached point) are appended directly without LTTB — they're few enough that bucketing isn't needed
- When data shrinks (zoom trim or window slide), the cache invalidates and LTTB re-runs
- For historical-only charts (static data), LTTB runs once and the cache is permanent

## Empty Data Handling

| Scenario                   | Behavior                                           |
| -------------------------- | -------------------------------------------------- |
| `data = {}`                | `<ChartSkeleton>` if `showLoading=true`, else null |
| All arrays empty           | `<ChartSkeleton>` if `showLoading=true`, else null |
| Mix of empty and populated | Only populated devices rendered                    |

## Validation

- `isValidTimestamp()` filters each data point
- Invalid points removed, `onError` called per point:
  ```typescript
  { type: 'invalid_timestamp', message: string, rawValue: any, component: 'TimeSeries' }
  ```

## Dependencies

- `d3`: `scaleTime`, `scaleLinear`, `line`, `area`, `extent`, `bisector`, `pointer`, `timeFormat`
- `ResponsiveContainer` for resize observation
- `Legend` for legend rendering
- `Tooltip` for data point tooltip
- `Grid`, `XAxis`, `YAxis`, `AlertZonesOverlay` shared chart primitives
- `createScaler` / `CHART_REFERENCE` for proportional scaling
- `useResolvedStyles` for font/style resolution
- `resolveMetrics` for metric auto-detection
- `useId` (React 18) for unique clipPath IDs

## Test Coverage

### Unit Tests (76 tests)

- Empty/loading states (3)
- SVG structure (3)
- Multi-device rendering and legend format (4)
- Invalid timestamp filtering (2)
- Title rendering (2)
- Legend: show/hide, swatch shape, solo mode, positions (7)
- Line thickness: global and per-metric (2)
- Point size: render, radius, per-metric override (4)
- Annotations: point, range, mixed, custom color, with data (7)
- Start/end fixed domain (2)
- Area rendering (2)
- Grid show/hide (2)
- Background styles (1)
- Zoom: initial state, cursor, disabled (3)
- Metric resolution: auto-detect, explicit (2)
- Narrow container graceful handling (1)
- Alert zones (1)
- Multiple metrics per device (1)
- Annotation mode: cursor, click, drag, ID sharing, auto-increment, type validation, zoom disabled (11)
- Annotation color (1)
- Zoom color (1)
- Annotation data field (1)
- onAnnotationHover: rendering, enter, leave, tooltip, void, data field (6)
- onZoneChange: renders with zones, first render suppressed, no crash without zones, callback shape with device+metric (4)
- formatTimestamp: renders with prop, no crash on hover with custom formatter (2)

### E2E Tests (73 tests)

- Page load and section visibility (7)
- SVG structure and line counts (4)
- Multi-device legend format and formatLegend (4)
- Legend swatch shape (1)
- Legend solo mode: click dims, click restores (2)
- Line thickness verification (2)
- Point size: circles render, radius, no circles, per-metric (4)
- Annotations: dashed lines, labels, range rects, mixed (5)
- Start/end and zoom: fixed range, crosshair, disabled, drag-zoom, reset (5)
- Legend positions: top, bottom, left, right, none (5)
- Area, dark theme, title, alert zones, grid (5)
- Tooltip: hover shows tooltip, onHover event, onRelease (3)
- Edge cases: empty data, single point (2)
- Resizable: CSS resize, SVG renders (2)
- Annotation mode: section exists, toggle, cursor, click event, point annotation created, drag events, range annotation created, preview disappears, zoom disabled, zoom restores, clear button, event timestamp (12)
- Zoom color: section exists, card renders, red brush visible (3)
- Annotation hover: tooltip with data, tooltip disappears, log-only, data JSON, leave event, data point priority (6)
