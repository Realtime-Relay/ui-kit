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
}

interface TimeSeriesProps {
  data: Record<string, DataPoint[]>;
  metrics?: MetricConfig[];
  title?: string;
  formatValue?: (value: number) => string;
  renderTooltip?: (point: DataPoint) => React.ReactNode;
  onHover?: (point: { metric: string; value: number; timestamp: number } | null, event: MouseEvent) => void;
  onRelease?: (point: { metric: string; value: number; timestamp: number } | null, event: MouseEvent) => void;
  showGrid?: boolean;
  gridColor?: string;
  gridThickness?: number;
  styles?: TimeSeriesStyles;
  area?: boolean;
  areaColor?: string;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
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
  onAnnotate?: (id: number, timestamp: number, type: 'click' | 'start_drag' | 'end_drag') => void;
  annotationColor?: string;
  zoomColor?: string;
  onAnnotationHover?: (hover: boolean, annotation: Annotation) => React.ReactNode | void;
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
- Inner: `<svg>` with `<g transform>` for margin offset
- Tooltip: absolutely positioned `<div>` outside SVG, in the `position: relative` wrapper

### Rendering Order (SVG stacking, bottom to top)
1. Grid lines (dashed horizontal lines)
2. Alert zone rects (10% opacity)
3. **Annotation visuals** (dashed lines, shaded bands) — `pointerEvents: none`
4. Data lines, area fills, and point circles (clipped to chart bounds)
5. Brush/annotation preview overlay (zoom selection or annotation-in-progress)
6. Hover crosshair line (dashed vertical)
7. X-axis and Y-axis
8. **Invisible overlay rect** (captures all mouse events: mouseDown, mouseMove, mouseUp, mouseLeave)

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
- Uses `requestAnimationFrame` to update `now` state continuously
- Paused during zoom

## Y-Domain Resolution

- Computed from visible data across all active series
- `d3.scaleLinear().domain([yMin, yMax]).range([chartHeight, 0]).nice()`
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
- Clear isDragging, brushStart, brushEnd, tooltipData
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
| Mode | Cursor |
|---|---|
| `annotationMode=true` | `copy` |
| `zoomEnabled=true` | `crosshair` |
| Both false | default |

## Brush / Preview Rendering

Rendered inside SVG after data lines, before the overlay rect.

### Zoom Brush
When `brushStart != null && brushEnd != null && !annotationMode`:
- `<rect>` from min to max of brush positions
- Fill: `zoomColor` at `opacity={0.15}`
- Stroke: `zoomColor` at `strokeWidth={1}`

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

## Annotation ID Management

```typescript
const annotationIdRef = useRef(0);       // global counter
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

## Empty Data Handling

| Scenario | Behavior |
|---|---|
| `data = {}` | `<ChartSkeleton>` if `showLoading=true`, else null |
| All arrays empty | `<ChartSkeleton>` if `showLoading=true`, else null |
| Mix of empty and populated | Only populated devices rendered |

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

### Unit Tests (70 tests)
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
