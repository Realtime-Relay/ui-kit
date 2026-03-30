# TimeSeries — Requirements

## Purpose

Render real-time or historical time series line charts with support for multiple devices, multiple metrics, annotations, interactive zoom, annotation creation mode, and customizable appearance. Designed for IoT dashboards displaying sensor data over time.

## Core Behavior

- Renders one line per device-metric combination with automatic color cycling
- Shared X-axis (time) and Y-axis (value) across all series
- Y-axis domain has 5% padding, but when all data is non-negative the bottom is clamped to 0 (so the 0 line sits on the x-axis)
- Responsive to container width via `ResponsiveContainer`
- Autoscroll for live data when `timeWindow` is set
- Data is sorted by timestamp before rendering to prevent visual jumps

## Props

### Data

| Prop      | Type                          | Default       | Description                                                                                                                                            |
| --------- | ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data`    | `Record<string, DataPoint[]>` | required      | Device IDs mapped to arrays of data points. Each point has `timestamp` + one or more numeric metric keys.                                              |
| `metrics` | `MetricConfig[]?`             | auto-detected | Which numeric fields to plot. Each: `{ key, label?, color?, lineThickness?, pointSize? }`. If omitted, all numeric keys in the data are auto-detected. |

### Time Domain (X-Axis)

| Prop         | Type              | Default                    | Description                                                                                                                          |
| ------------ | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `timeWindow` | `number?` (ms)    | —                          | Sliding window. Only shows `[effectiveNow - timeWindow, effectiveNow]`. Autoscroll is driven by data changes (no separate rAF loop). |
| `autoScroll` | `boolean?`        | `true` if `timeWindow` set | Disable autoscroll even with `timeWindow`.                                                                                           |
| `start`      | `Date \| number?` | —                          | Fixed X-domain start. Overrides `timeWindow` and data extent.                                                                        |
| `end`        | `Date \| number?` | —                          | Fixed X-domain end. Overrides `timeWindow` and data extent.                                                                          |

Domain priority: `zoomDomain` > `start/end` > `timeWindow` > data extent.

**Autoscroll behavior**: when `timeWindow` is set, `effectiveNow` is computed inline during render as `Math.min(Date.now(), latestDataTs + 1000)`. The x-axis right edge advances naturally as data arrives (each data change triggers a re-render). Clamped to 1s past the latest data point to prevent empty space when data lags. No `requestAnimationFrame` loop — this eliminates double-render jitter.

Without any domain props, the X-axis stretches from min to max timestamp in the data and grows rightward as new data arrives.

### Zoom

| Prop          | Type       | Default     | Description                                                                                      |
| ------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `zoomEnabled` | `boolean?` | `true`      | Click-drag horizontally to brush-select a time range and zoom in. A "Reset zoom" button appears. |
| `zoomColor`   | `string?`  | `'#3b82f6'` | Stroke and fill color for the zoom brush selection rectangle.                                    |

- Drag distance > 10px triggers zoom; < 10px is ignored (treated as a click)
- Zoom domain overrides all other domain props while active
- **Y-axis rescales** to the min/max of data within the zoomed time range, not the full dataset
- Cursor: `crosshair` when zoom is enabled

### Line & Points

| Prop            | Type           | Default    | Description                                                                                      |
| --------------- | -------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `lineThickness` | `number?` (px) | `2`        | Global line stroke width. Per-metric override via `MetricConfig.lineThickness`.                  |
| `pointSize`     | `number?` (px) | `0` (none) | Radius of data point circles. `0` = no points. Per-metric override via `MetricConfig.pointSize`. |
| `area`          | `boolean?`     | `false`    | Fill area under each line at 15% opacity.                                                        |
| `areaColor`     | `string?`      | line color | Custom area fill color.                                                                          |

### Annotations (Static)

| Prop          | Type            | Default | Description                               |
| ------------- | --------------- | ------- | ----------------------------------------- |
| `annotations` | `Annotation[]?` | `[]`    | Static annotations rendered on the chart. |

Two types:

**PointAnnotation**: `{ timestamp: number; label?: string; color?: string; data?: Record<string, unknown> }`

- Renders as a vertical dashed line

**RangeAnnotation**: `{ start: number; end: number; label?: string; color?: string; data?: Record<string, unknown> }`

- Renders as a shaded band (10% opacity fill)

Both types accept an arbitrary `data` field (JSON) which is passed through to `onAnnotationHover`.

Annotations render behind data lines in SVG stacking order. They share the same `xScale` as data — with `timeWindow`, fixed timestamps drift left and eventually leave the viewport.

### Annotation Mode (Interactive Creation)

| Prop              | Type                                                                                   | Default     | Description                                                         |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `annotationMode`  | `boolean?`                                                                             | `false`     | Enable interactive annotation creation. Disables zoom while active. |
| `onAnnotate`      | `(id: number, timestamp: number, type: 'click' \| 'start_drag' \| 'end_drag') => void` | —           | Callback fired during annotation interactions.                      |
| `annotationColor` | `string?`                                                                              | `'#f59e0b'` | Preview color shown during annotation-in-progress.                  |

Behavior:

- **Click** (drag distance < 10px): fires `onAnnotate(id, ts, 'click')` only
- **Drag** (drag distance >= 10px): fires `onAnnotate(id, ts, 'start_drag')` when distance threshold is first exceeded, then `onAnnotate(id, ts, 'end_drag')` on mouse release
- `id` auto-increments starting from 1. `start_drag` and `end_drag` of the same drag share the same `id`
- **Preview**: dashed line for point click, shaded band for range drag. Disappears on release. The consumer constructs an `Annotation` object from callback data and adds it to the `annotations` prop.
- **Viewport clamping**: all timestamps are clamped to the visible domain bounds — cannot overflow beyond the viewport
- **Cursor**: `copy` while annotation mode is active
- Zoom is fully disabled while `annotationMode=true`. Turning it off re-enables zoom if `zoomEnabled` was true.

### Annotation Hover

| Prop                | Type                                                            | Default | Description                                           |
| ------------------- | --------------------------------------------------------------- | ------- | ----------------------------------------------------- |
| `onAnnotationHover` | `(hover: boolean, annotation: Annotation) => ReactNode \| void` | —       | Called when mouse enters/leaves an annotation region. |

Behavior:

- `hover=true` with the full annotation object (including `data`) when cursor enters an annotation region (4px hit tolerance for point, full width for range)
- `hover=false` with the annotation when cursor exits
- If the callback returns a `ReactNode`, it renders as a floating tooltip that follows the cursor, clamped to the chart viewport boundaries
- If it returns `void`/`undefined`, no tooltip is shown (log-only use case)
- **Data point priority**: inside an annotation zone, if the cursor is within 20px vertically of a data line, the data point tooltip shows and the annotation tooltip hides. If the cursor is away from data lines, the annotation tooltip shows and the data point tooltip hides. Outside annotation zones, the data point tooltip always shows.

### Legend

| Prop             | Type                                         | Default    | Description                                                                                       |
| ---------------- | -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `showLegend`     | `boolean?`                                   | `true`     | Show or hide the legend.                                                                          |
| `legendPosition` | `'top' \| 'bottom' \| 'left' \| 'right'`     | `'bottom'` | Legend placement. Left/right use a fixed-width vertical column (max 140px).                       |
| `formatLegend`   | `(device: string, metric: string) => string` | auto       | Custom label formatter. Default: `metric` for single device, `[device]: metric` for multi-device. |

- **Click behavior**: clicking a legend item activates solo mode — only that series is shown, all others are dimmed. Clicking the solo'd item again restores all.
- **Swatch shape**: rounded rectangle (wider than tall), not a circle.

### Zone Transition Callback

| Prop           | Type                                             | Default | Description                                                                       |
| -------------- | ------------------------------------------------ | ------- | --------------------------------------------------------------------------------- |
| `onZoneChange` | `(transition: TimeSeriesZoneTransition) => void` | —       | Called when any device×metric's latest data point crosses an alert zone boundary. |

**Callback signature**:

```typescript
interface TimeSeriesZoneTransition {
  device: string; // device ID (e.g., "sensor-a")
  metric: string; // metric key (e.g., "temperature")
  previousZone: AlertZone | null; // zone the value was in before
  currentZone: AlertZone | null; // zone the value is in now
  value: number; // the value that triggered the transition
}
```

Behavior:

- Tracks **every device×metric combination** independently — each series has its own zone state
- On first render, the current zone is recorded but the callback is **not** fired (no false positive on mount)
- On subsequent renders, if the latest data point for any series moves to a different zone (or enters/exits a zone), the callback fires
- Zone comparison is by `min`/`max`/`color` identity, not by object reference
- If `alertZones` is empty or `onZoneChange` is not provided, no tracking occurs
- Works with both single-device and multi-device data — each device×metric gets its own tracking entry

### Custom Timestamp Formatting

| Prop              | Type                            | Default | Description                                                       |
| ----------------- | ------------------------------- | ------- | ----------------------------------------------------------------- |
| `formatTimestamp` | `(timestamp: number) => string` | —       | Custom formatter for timestamps displayed in the default tooltip. |

Behavior:

- Receives epoch milliseconds, returns a display string
- Applied only to the **default tooltip** — not used when `renderTooltip` is provided (since `renderTooltip` replaces the entire tooltip)
- When not provided, falls back to `toLocaleDateString() + ' ' + toLocaleTimeString()` (browser locale)
- Does **not** affect X-axis tick labels (those use D3 `timeFormat('%H:%M:%S')`)

### Tooltip & Callbacks

| Prop              | Type                              | Default        | Description                                                                                  |
| ----------------- | --------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `formatValue`     | `(value: number) => string`       | default        | Format numeric values in the default tooltip.                                                |
| `formatTimestamp` | `(timestamp: number) => string`   | browser locale | Custom timestamp display in the default tooltip.                                             |
| `renderTooltip`   | `(point: DataPoint) => ReactNode` | —              | Custom tooltip renderer. Replaces default tooltip entirely.                                  |
| `onHover`         | `(point \| null, event) => void`  | —              | Fires on mousemove with nearest data point: `{ metric, value, timestamp }`. `null` on leave. |
| `onRelease`       | `(point \| null, event) => void`  | —              | Fires on click/mouseLeave with the last hovered data point.                                  |

Default tooltip: timestamp header (via `formatTimestamp` or browser locale), colored dots for each metric with label and formatted value. Clamped to chart viewport.

### Styling

| Prop            | Type                | Default | Description                                                            |
| --------------- | ------------------- | ------- | ---------------------------------------------------------------------- |
| `styles`        | `TimeSeriesStyles?` | —       | Nested object: `{ title?, legend?, tooltip?, axis?, background? }`     |
| `title`         | `string?`           | —       | Chart title rendered above the chart area, centered.                   |
| `showGrid`      | `boolean?`          | `true`  | Horizontal dashed grid lines.                                          |
| `gridColor`     | `string?`           | —       | Grid line color.                                                       |
| `gridThickness` | `number?`           | —       | Grid line stroke width.                                                |
| `alertZones`    | `AlertZone[]?`      | `[]`    | Horizontal shaded bands for thresholds: `{ min, max, color, label? }`. |

### Performance & Loading

| Prop          | Type                | Default | Description                                                       |
| ------------- | ------------------- | ------- | ----------------------------------------------------------------- |
| `downsample`  | `DownsampleConfig?` | —       | Downsampling config to reduce rendered points for large datasets. |
| `showLoading` | `boolean?`          | `true`  | Show skeleton loader when all data arrays are empty.              |

**LTTB downsampling cache**: Downsampled results are cached per device. LTTB only re-runs when the source data grows by >5% or shrinks (prevents line jumping from re-bucketing on every stream flush). New realtime points arriving after the cached snapshot are appended directly to the end of the downsampled output without re-bucketing.

### Error Handling

| Prop      | Type                              | Default | Description                                                                                       |
| --------- | --------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `onError` | `(error: ComponentError) => void` | —       | Called for each invalid timestamp. Invalid points are filtered out; remaining valid data renders. |

## Empty Data Handling

| Scenario                           | Behavior                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| `data = {}`                        | Loading skeleton (if `showLoading=true`) or nothing       |
| All device arrays empty            | Loading skeleton (if `showLoading=true`) or nothing       |
| Some devices have data, some empty | Only devices with data contribute to domain and rendering |

## Proportional Scaling

- Reference width: 500px
- `createScaler` scales down for smaller containers but never upscales beyond 1x
- Applies to fonts, margins, padding, tooltip offset

## Multi-Device Behavior

- Each device-metric combination is a separate "series" with its own line, color, and legend entry
- Colors cycle through the palette across all series
- Single device: legend shows metric name only (e.g., `temperature`)
- Multiple devices: legend shows `[device]: metric` format (e.g., `[sensor-a]: temperature`)
- `formatLegend(device, metric)` overrides the default label format

## Validation

- Each data point's `timestamp` is checked via `isValidTimestamp()`
- Invalid timestamps (NaN, negative, non-finite) are filtered out
- `onError` called once per invalid point with `{ type: 'invalid_timestamp', ... }`
- Data is sorted by timestamp before rendering to prevent visual jumps from out-of-order data
