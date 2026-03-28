# StateTimeline -- Component Specification

Source: `src/timelines/StateTimeline.tsx`
Requirements: `requirements/StateTimeline.md`

## Component Signature

```typescript
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import type { StateEntry } from './stateUtils';
import type { ComponentError } from '../utils/validation';

export interface StateTimelineStyles {
  label?: FontStyle;
  rowLabel?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
  emptyRowColor?: string;
}

export interface StateTimelineProps {
  data: Record<string, DataPoint[]>;
  stateMapper: (value: any) => string;
  metricKey?: string;
  stateColors?: Record<string, string>;
  formatTooltip?: (entry: StateEntry, deviceName: string) => string;
  renderTooltip?: (entry: StateEntry, deviceName: string) => React.ReactNode;
  styles?: StateTimelineStyles;
  rowHeight?: number;
  labelAlign?: 'left' | 'right';
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}
```

## Internal Constants

| Name | Value | Description |
|---|---|---|
| `BAR_HEIGHT` | `rowHeightProp ?? 28` | Height of each device row in pixels |
| `ROW_GAP` | `6` | Vertical spacing between consecutive device rows |
| `LABEL_GAP` | `8` | Horizontal gap between label column and bar area |
| `X_AXIS_HEIGHT` | `20` | Vertical space reserved for X-axis tick labels below bars |
| `LEGEND_HEIGHT` | `24` | Vertical space reserved for the state legend below the axis |
| `MARGIN.top` | `8` | Top padding inside the canvas |
| `MARGIN.right` | `12` | Right padding inside the canvas |
| `MARGIN.bottom` | `8` | Bottom padding inside the canvas |
| `MARGIN.left` | `12` | Left padding inside the canvas |
| `LABEL_WIDTH` | `measuredLabelWidth ?? 120` | Width of the label column; 120px fallback before measurement |

## Canvas Rendering

The component renders a `<canvas>` element (not SVG) with a `useEffect` draw cycle. The wrapper structure:

```
<div style="position: relative; width: 100%">                   // wrapper
  <canvas ref={canvasRef}                                        // main canvas
          width={width * devicePixelRatio}
          height={totalHeight * devicePixelRatio}
          style="width: {width}px; height: {totalHeight}px"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
  />
  // Legend (only when uniqueStates.length > 0):
  <div style="display:flex; gap:12px; justifyContent:center;
              flexWrap:wrap; padding:4px 0;
              fontFamily:{labelStyleR?.fontFamily ?? 'var(--relay-font-family)'};
              fontSize:{labelStyleR?.fontSize ?? 11}">
    {uniqueStates.map((state, i) => (
      <div style="display:flex; alignItems:center; gap:4px">
        <span style="width:10; height:10; borderRadius:2;
                     backgroundColor:{getStateColor(state, stateColors, i)};
                     display:inline-block" />
        <span style="color:{labelStyleR?.color ?? '#6b7280'}">{state}</span>
      </div>
    ))}
  </div>
  // Tooltip (only when hoveredEntry is not null):
  <div style="position:fixed; left:{x+12}; top:{y-10};
              background:var(--relay-tooltip-bg, #1a1a1a);
              color:var(--relay-tooltip-text, #ffffff);
              borderRadius:var(--relay-tooltip-border-radius, 4px);
              padding:var(--relay-tooltip-padding, 8px 12px);
              fontSize:{tooltipStyleR?.fontSize ?? 12};
              fontFamily:{tooltipStyleR?.fontFamily ?? 'var(--relay-font-family)'};
              pointerEvents:none; zIndex:1000; whiteSpace:nowrap">
    {tooltip content per priority chain}
  </div>
</div>
```

### DPI Scaling

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = totalHeight * dpr;
ctx.scale(dpr, dpr);
```

The canvas CSS dimensions remain at logical pixels (`width`/`totalHeight`), while the backing buffer is scaled by `devicePixelRatio` for crisp rendering on high-DPI displays.

### Draw Cycle

Inside the `useEffect`, the canvas context draws in this order:

1. **Device labels**: `ctx.fillText()` at the label position for each device row. Font set via `ctx.font`. Width measured via `ctx.measureText()`.
2. **Empty row backgrounds**: For devices with no state entries, `ctx.fillRect()` with `emptyRowColor`.
3. **State bars**: For each state entry, `ctx.fillRect()` with the resolved state color. `ctx.globalAlpha` is set to `1` for the hovered entry and `0.8` for all others.
4. **X-axis tick labels**: `ctx.fillText()` for each tick, centered at the tick position.

## Layout Calculations

### Total Height

```
totalHeight = MARGIN.top
            + rowCount * BAR_HEIGHT
            + (rowCount - 1) * ROW_GAP
            + X_AXIS_HEIGHT
            + (hasData ? LEGEND_HEIGHT : 0)
            + MARGIN.bottom
```

Where `hasData = globalExtent !== null` (at least one valid timestamp exists across all devices).

### Chart Width

```
chartWidth = width - MARGIN.left - LABEL_WIDTH - LABEL_GAP - MARGIN.right
```

If `chartWidth <= 0`, the render callback returns `null` (nothing is drawn).

### Bar and Label Positions

| Value | `labelAlign = 'left'` | `labelAlign = 'right'` |
|---|---|---|
| `barsX` | `MARGIN.left + LABEL_WIDTH + LABEL_GAP` | `MARGIN.left` |
| `labelX` | `MARGIN.left` | `width - MARGIN.right` |
| `textAnchor` | `'start'` | `'end'` |

### Row Y Offset

```
yOffset = MARGIN.top + rowIdx * (BAR_HEIGHT + ROW_GAP)
```

Label is vertically centered: `y = yOffset + BAR_HEIGHT / 2` with `dominantBaseline="central"`.

## Label Measurement via Canvas measureText

Label width is computed inline during render using an offscreen canvas context. No extra render cycle is needed (unlike the previous SVG callback ref approach).

```typescript
const measureCtx = document.createElement('canvas').getContext('2d')!;
measureCtx.font = `${rowLabelStyleR?.fontWeight ?? 500} ${rowLabelFontSize}px ${rowLabelStyleR?.fontFamily ?? 'var(--relay-font-family)'}`;
let maxWidth = 0;
for (const name of deviceNames) {
  maxWidth = Math.max(maxWidth, measureCtx.measureText(name).width);
}
const measuredLabelWidth = maxWidth > 0 ? Math.ceil(maxWidth) + 16 : null;
```

If no device names exist or all measure to zero width, `measuredLabelWidth` is `null` and `LABEL_WIDTH` falls back to `120`.

## D3 scaleTime Configuration

```typescript
// globalExtent computed by iterating allTimestamps to find min/max
const globalExtent: [number, number] | null = ...;  // [min, max] across all devices

const xScale = scaleTime()
  .domain([new Date(globalExtent[0]), new Date(globalExtent[1])])
  .range([0, chartWidth]);
```

- `globalExtent` is computed inline (no `d3.extent` import).
- `xScale` is `null` when `globalExtent` is `null` (no valid timestamps in any device).
- When `xScale` is null, no state bands, no axis ticks, and no legend are rendered.

## State Grouping Function (`groupStateEntries`)

Located in `src/timelines/stateUtils.ts`.

```typescript
function groupStateEntries(
  data: DataPoint[],
  metricKey: string,
  stateMapper: (value: any) => string
): StateEntry[]
```

Step-by-step:

1. **Guard**: If `metricKey` is falsy (`''`) or `data.length === 0`, return `[]`.
2. **Sort**: Checks if data is already sorted by comparing the first and last timestamps. If `data[0].timestamp <= data[data.length - 1].timestamp`, the sort is skipped. Otherwise: `const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)` -- shallow copy, ascending by timestamp.
3. **Initialize**: `currentState = null`, `start = 0`.
4. **Loop** over `sorted` with index `i`:
   a. `state = stateMapper(sorted[i][metricKey])` -- map raw value to state name.
   b. If `state !== currentState`:
      - If `currentState !== null` (not the first point), push `{ state: currentState, start, end: sorted[i].timestamp }`.
      - Set `currentState = state`, `start = sorted[i].timestamp`.
5. **Close last group**: After the loop, if `currentState !== null`, push `{ state: currentState, start, end: sorted[sorted.length - 1].timestamp }`.
6. **Return**: the `StateEntry[]` array.

Key behaviors:
- A single data point produces one entry with `start === end`.
- A transition boundary: the old group's `end` equals the new group's `start` (the transitioning point's timestamp).
- The function is pure -- no side effects.

## `getStateColor` Resolution

Located in `src/timelines/stateUtils.ts`.

```typescript
function getStateColor(
  state: string,
  stateColors?: Record<string, string>,
  index?: number
): string
```

1. If `stateColors?.[state]` is truthy, return it.
2. If `DEFAULT_STATE_COLORS[state]` is truthy, return it. The built-in map:
   - `normal` -> `#22c55e`
   - `warning` -> `#f59e0b`
   - `critical` -> `#ef4444`
   - `error` -> `#ef4444`
   - `offline` -> `#6b7280`
   - `online` -> `#22c55e`
3. Return `FALLBACK_COLORS[(index ?? 0) % 6]`. The palette:
   - Index 0: `#3b82f6`
   - Index 1: `#8b5cf6`
   - Index 2: `#ec4899`
   - Index 3: `#f97316`
   - Index 4: `#14b8a6`
   - Index 5: `#6366f1`

When called from the component, `index` is `uniqueStates.indexOf(entry.state)`, so the same state always maps to the same fallback color.

## X-Axis Tick Count and Format

### Tick count formula

```
axisLabelFontSize = labelStyleR?.fontSize ?? 11
labelWidth = axisLabelFontSize * 7.5
maxTicks = max(2, floor(chartWidth / (labelWidth + axisLabelFontSize * 2)))
tickCount = min(maxTicks, 6)
```

This ensures at least 2 ticks and at most 6, with spacing proportional to font size.

### Format selection

```
spansDays = new Date(globalExtent[0]).toDateString() !== new Date(globalExtent[1]).toDateString()
```

- `spansDays = false` (same calendar day):
  `tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`

- `spansDays = true` (different calendar days):
  `tick.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`

### Axis position

Tick labels are drawn via `ctx.fillText()` at y-position `MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + 4 + axisLabelFontSize + 2`, with `ctx.textAlign = 'center'`.

## Tooltip Positioning

The tooltip is a `<div>` rendered outside the canvas, inside the wrapper `<div>`.

```css
position: fixed;
left: {hoveredEntry.x + 12}px;
top: {hoveredEntry.y - 10}px;
pointerEvents: none;
zIndex: 1000;
whiteSpace: nowrap;
```

`hoveredEntry.x` and `hoveredEntry.y` are `e.clientX` and `e.clientY` from the mouse event. The tooltip floats 12px to the right and 10px above the cursor.

## Hover / Hit Detection

State: `hoveredEntry: { entry: StateEntry, deviceName: string, x: number, y: number } | null`

During the canvas draw cycle, a `HitRect[]` array is built and stored in a ref. Each hit rect records `{ x, y, width, height, entry, deviceName }` for every drawn state bar.

- `onMouseMove` on the `<canvas>`: computes cursor position relative to the canvas, then iterates the stored `HitRect[]` to find the first rect containing the cursor. If found, sets `hoveredEntry` with the entry, device name, and `e.clientX`/`e.clientY`. If no rect matches, clears `hoveredEntry`.
- `onMouseLeave` on the `<canvas>`: sets `hoveredEntry` to `null`.

Visual feedback: during the draw cycle, the hovered entry's bar is drawn with `ctx.globalAlpha = 1`, all others with `ctx.globalAlpha = 0.8`.

## Tooltip Content Priority

```typescript
{renderTooltip
  ? renderTooltip(hoveredEntry.entry, hoveredEntry.deviceName)
  : formatTooltip
    ? formatTooltip(hoveredEntry.entry, hoveredEntry.deviceName)
    : <>
        <div style="fontWeight:600; marginBottom:2">
          {deviceName} -- {entry.state}
        </div>
        <div style="opacity:0.7">
          {new Date(entry.start).toLocaleTimeString()} --
          {new Date(entry.end).toLocaleTimeString()}
        </div>
      </>
}
```

## Legend Rendering

The legend is an HTML `<div>` sibling rendered below the `<canvas>` element (not inside a `<foreignObject>`). Rendered only when `uniqueStates.length > 0`.

Inside: a flex container with `gap: 12px`, `justifyContent: center`, `flexWrap: wrap`, `padding: 4px 0`.

Each state entry:
- Color swatch: `<span>` with `width: 10px`, `height: 10px`, `borderRadius: 2px`, `backgroundColor` from `getStateColor`.
- Label: `<span>` with `color` from `labelStyleR?.color ?? '#6b7280'`.

Font: `labelStyleR?.fontFamily ?? 'var(--relay-font-family)'`, size `labelStyleR?.fontSize ?? 11`.

## Loading State

When `deviceNames.length === 0` (empty data object):
- If `showLoading = true`: returns `<ResponsiveContainer>{({ width, height }) => <ChartSkeleton width={width} height={height} />}</ResponsiveContainer>`.
- If `showLoading = false`: returns `null`.

This check happens before any layout calculations.

## Validation

Data validation runs in a `useMemo` keyed on `[data, deviceNames, onError]`.

When `onError` is not provided, validation is skipped entirely -- data is passed through directly without per-point checks.

When `onError` is provided:

```typescript
for (const name of deviceNames) {
  result[name] = data[name].filter(point => {
    if (!isValidTimestamp(point.timestamp)) {
      onError({
        type: 'invalid_timestamp',
        message: `StateTimeline [${name}]: invalid timestamp, received ${point.timestamp}`,
        rawValue: point.timestamp,
        component: 'StateTimeline',
      });
      return false;
    }
    return true;
  });
}
```

`isValidTimestamp(ts)` returns `true` only when `typeof ts === 'number' && Number.isFinite(ts) && ts >= 0`.

## Edge Cases

| Scenario | Behavior |
|---|---|
| `chartWidth <= 0` (container too narrow for labels + margins) | Render callback returns `null` -- nothing is drawn |
| All data points have invalid timestamps | All devices become empty arrays after validation; `globalExtent` is null; no axis, no bands, no legend |
| Single data point per device | One state entry with `start === end`; bar renders with `width = max(1, 0) = 1px` minimum |
| `metricKey` not found in data points | `stateMapper` receives `undefined`; behavior depends on the user's mapper function |
| Same device name appears as multiple keys | Not possible -- `Record<string, DataPoint[]>` enforces unique keys |
| `stateMapper` returns different strings for same metric value across calls | Each call is independent; may produce fragmented state bands |
| Thousands of devices | Canvas height grows linearly: `totalHeight ~ rowCount * (BAR_HEIGHT + ROW_GAP)` |
| `rowHeight = 0` | Bars have zero height; labels overlap; technically renders but not useful |

## Dependencies

| Import | Source | Usage |
|---|---|---|
| `useMemo`, `useState`, `useRef`, `useEffect` | `react` | State, memoization, refs, and draw cycle |
| `scaleTime` | `d3` | Time scale |
| `DataPoint`, `FontStyle`, `BackgroundStyle` | `../utils/types` | Type definitions |
| `ResponsiveContainer` | `../charts/shared/ResponsiveContainer` | Width observation and resize handling |
| `resolveFont` | `../utils/useResolvedStyles` | Font style resolution |
| `ChartSkeleton` | `../charts/shared/Skeleton` | Loading skeleton |
| `isValidTimestamp`, `ComponentError` | `../utils/validation` | Timestamp validation |
| `getStateColor`, `groupStateEntries`, `StateEntry` | `./stateUtils` | State processing and color resolution |
