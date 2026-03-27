# StateTimeline -- Requirements

## Purpose

Visualize device state over time as horizontal color-coded bars. Each device occupies one row; all rows share a single time axis. States are derived from raw metric values through a user-supplied mapper function, and consecutive identical states are collapsed into a single visual band. Designed for IoT dashboards where operators need to see at a glance which devices were in which state over a time window.

## Props

### Data Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `data` | `Record<string, DataPoint[]>` | Yes | -- | Map of device names to arrays of data points. Each key becomes one row. Pass a single key for a single-device timeline. An empty object `{}` triggers the loading skeleton. A key mapped to an empty array `[]` renders an empty row with a background bar but no state bands. |
| `stateMapper` | `(value: any) => string` | Yes | -- | Pure function that receives a metric value and returns a state name string. Called once per data point during grouping. Example: `v => v > 70 ? 'critical' : 'normal'`. |
| `metricKey` | `string` | No | auto-detected | The key within each `DataPoint` to read the raw metric value from. When omitted, the component scans the first non-empty device's first data point and picks the first key that is not `'timestamp'`. Returns empty string `''` if no key can be resolved, which causes `groupStateEntries` to return empty arrays. |

### Color Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `stateColors` | `Record<string, string>` | No | `undefined` | User-supplied map of state name to CSS color string. Checked first when resolving a state's color. Only states present as keys in this map are affected; all others fall through to the built-in defaults. |

#### Color Resolution Chain

When rendering a state band or legend swatch, the component resolves the color for a state name `s` at index `i` (its position in the `uniqueStates` array) using this priority chain:

1. **`stateColors[s]`** -- user-supplied override. If the key exists and is truthy, use it.
2. **`DEFAULT_STATE_COLORS[s]`** -- built-in named-state map:
   - `normal` = `#22c55e`
   - `warning` = `#f59e0b`
   - `critical` = `#ef4444`
   - `error` = `#ef4444`
   - `offline` = `#6b7280`
   - `online` = `#22c55e`
3. **`FALLBACK_COLORS[i % 6]`** -- cyclic palette for any unmapped state:
   - `['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1']`

The index `i` is the position of the state in the globally-collected `uniqueStates` array (insertion order across all devices), ensuring the same state always gets the same fallback color regardless of which device it appears in.

### Tooltip Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `formatTooltip` | `(entry: StateEntry, deviceName: string) => string` | No | -- | Custom string tooltip formatter. Receives the hovered state entry (with `state`, `start`, `end` timestamps) and the device name. Return value is rendered as plain text inside the tooltip div. |
| `renderTooltip` | `(entry: StateEntry, deviceName: string) => ReactNode` | No | -- | Custom JSX tooltip renderer. Same arguments as `formatTooltip` but returns arbitrary React elements. Takes precedence over `formatTooltip` when both are provided. |

#### Tooltip Priority

1. If `renderTooltip` is provided, its return value is rendered as the tooltip content (JSX).
2. Else if `formatTooltip` is provided, its return string is rendered as plain text.
3. Else the default tooltip renders:
   - Line 1 (bold, `fontWeight: 600`): `"{deviceName} -- {state}"`
   - Line 2 (dimmed, `opacity: 0.7`): `"{start time} -- {end time}"` using `Date.toLocaleTimeString()`

### Layout Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `rowHeight` | `number` | No | `28` | Height in pixels of each device row (the colored state band area). Also used as `BAR_HEIGHT` in layout calculations. |
| `labelAlign` | `'left' \| 'right'` | No | `'left'` | Controls which side of the chart the device name labels appear on. Affects label `x` position, `textAnchor`, and where the bars begin. |

#### Label Alignment Modes

**`labelAlign = 'left'` (default):**
```
[MARGIN.left][  LABEL  ][GAP][====== chart bars ======][MARGIN.right]
              ^                ^
              labelX=ML        barsX=ML+LW+LG
              textAnchor=start
```

**`labelAlign = 'right'`:**
```
[MARGIN.left][====== chart bars ======][GAP][  LABEL  ][MARGIN.right]
                                             ^
              barsX=ML                       labelX=width-MR
                                             textAnchor=end
```

Where ML = MARGIN.left, MR = MARGIN.right, LW = LABEL_WIDTH, LG = LABEL_GAP.

### Style Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `styles.label` | `FontStyle` | No | -- | Font styling for X-axis tick labels and legend text. Resolved via `resolveFont()`. Defaults: fontSize 11, fontFamily `var(--relay-font-family)`, color `#9ca3af` (axis) / `#6b7280` (legend). |
| `styles.rowLabel` | `FontStyle` | No | -- | Font styling for device name labels. Resolved via `resolveFont()`. Defaults: fontSize 12, fontFamily `var(--relay-font-family)`, fontWeight 500, color `#374151`. |
| `styles.tooltip` | `FontStyle` | No | -- | Font styling for the tooltip container. Defaults: fontSize 12, fontFamily `var(--relay-font-family)`. Background and text colors come from CSS variables `--relay-tooltip-bg` (default `#1a1a1a`) and `--relay-tooltip-text` (default `#ffffff`). |
| `styles.background` | `BackgroundStyle` | No | transparent | Background color applied to the `ResponsiveContainer` wrapper via `backgroundColor`. |
| `styles.emptyRowColor` | `string` | No | `'#f3f4f6'` | Fill color for the background rect rendered in rows whose data array is empty. |

### Loading and Error Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `showLoading` | `boolean` | No | `true` | Controls whether a `ChartSkeleton` is rendered when `data` is an empty object `{}` (no device keys at all). When `false` and data is `{}`, the component returns `null`. Has no effect when at least one device key exists -- empty arrays within a populated data object always render empty row backgrounds, not skeletons. |
| `onError` | `(error: ComponentError) => void` | No | -- | Callback fired once per data point that has an invalid timestamp. The `ComponentError` has `type: 'invalid_timestamp'`, a human-readable `message` including the device name and the raw value, `rawValue` set to the invalid timestamp, and `component: 'StateTimeline'`. Invalid points are filtered out before grouping; remaining valid points are still rendered. |

## State Grouping Algorithm

The `groupStateEntries(data, metricKey, stateMapper)` function processes each device's data independently:

1. **Guard**: If `metricKey` is falsy or `data.length === 0`, return an empty array.
2. **Sort**: Create a shallow copy of the data array and sort ascending by `timestamp`.
3. **Iterate**: For each sorted data point at index `i`:
   a. Read `sorted[i][metricKey]` to get the raw metric value.
   b. Pass the raw value through `stateMapper(value)` to get a state name string.
   c. If the state differs from `currentState`:
      - If `currentState` is not null, push a `StateEntry { state: currentState, start, end: sorted[i].timestamp }`.
      - Set `currentState = state` and `start = sorted[i].timestamp`.
4. **Close last group**: After the loop, push the final `StateEntry` with `end` set to the last data point's timestamp.
5. **Return**: Array of `StateEntry` objects.

This means the first and last point in a run share the same timestamp as `start`/`end` of their respective bands. A single-point state has `start === end`.

## Label Auto-Measurement Process

1. On initial render, the component uses a fallback label column width of `120px`.
2. The SVG element uses a **callback ref** (not `useRef`). When the SVG mounts or updates, the callback fires.
3. Inside the callback, all `<text>` elements with a `data-label` attribute are queried via `querySelectorAll('[data-label]')`.
4. For each label element, `getComputedTextLength()` is called to get the actual rendered width.
5. The maximum width across all labels is taken, then `Math.ceil(max) + 16` (16px padding) becomes the new `measuredLabelWidth`.
6. If the new measured width differs from the current value, `setMeasuredLabelWidth` updates state, triggering a re-render with the correct column width.
7. The callback ref is recreated (and thus re-fires) when `deviceNames`, `rowLabel.fontSize`, `rowLabel.fontFamily`, or `rowLabel.fontWeight` change.

## Time Axis Adaptive Formatting

The X-axis is shared across all devices and uses the global min/max timestamps from all valid data points (computed via D3 `extent`).

**Same-day detection**: Compare `new Date(globalMin).toDateString()` with `new Date(globalMax).toDateString()`.

- **Same day** (`spansDays = false`): Tick labels show time only.
  Format: `tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
  Example: `"14:30"`

- **Multiple days** (`spansDays = true`): Tick labels show date and time.
  Format: `tick.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
  Example: `"Mar 27 14:30"`

**Tick count**: Adaptive based on chart width.
- `labelWidth = axisLabelFontSize * 7.5`
- `maxTicks = max(2, floor(chartWidth / (labelWidth + axisLabelFontSize * 2)))`
- `tickCount = min(maxTicks, 6)` -- never more than 6 ticks, never fewer than 2.

## Empty Data Handling

| Scenario | Behavior |
|---|---|
| `data = {}` (no device keys) | If `showLoading = true`: renders a `ChartSkeleton` inside `ResponsiveContainer`. If `showLoading = false`: returns `null`. |
| `data = { 'device-A': [] }` (device exists, no data points) | Renders one row with the device name label and a solid background rect filled with `emptyRowColor` (`#f3f4f6` by default). No time axis is rendered (globalExtent is null). No legend. |
| `data = { 'A': [...data], 'B': [] }` (mixed) | Device A renders state bands normally. Device B renders an empty background rect. The time axis is derived from A's timestamps only. Legend shows states from A. |

## Validation and Error Handling

- Each data point's `timestamp` is checked with `isValidTimestamp()`, which requires a `number` that is finite and >= 0.
- Invalid points are filtered out of the data before any further processing (grouping, extent calculation).
- For each invalid point, `onError` is called with a `ComponentError`:
  - `type`: `'invalid_timestamp'`
  - `message`: `"StateTimeline [{deviceName}]: invalid timestamp, received {rawValue}"`
  - `rawValue`: the invalid timestamp value
  - `component`: `'StateTimeline'`
- The component continues rendering with whatever valid points remain.
