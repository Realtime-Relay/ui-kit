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
| `MARGIN.top` | `8` | Top padding inside the SVG |
| `MARGIN.right` | `12` | Right padding inside the SVG |
| `MARGIN.bottom` | `8` | Bottom padding inside the SVG |
| `MARGIN.left` | `12` | Left padding inside the SVG |
| `LABEL_WIDTH` | `measuredLabelWidth ?? 120` | Width of the label column; 120px fallback before measurement |
| `CHART_REFERENCE` | `500` | Reference width for proportional scaler (imported from `utils/scaler`) |

## Scaler Setup

```
rawS = createScaler(width, 100, CHART_REFERENCE, 'width')
s = (px) => rawS(px) > px ? px : rawS(px)
```

The scaler produces a function where `factor = width / 500`. The `s` wrapper caps scaled values so they never exceed the raw input -- at widths >= 500 the scaler returns the raw pixel value unchanged. This prevents fonts and gaps from growing beyond their authored sizes.

## SVG Element Tree

```
<div style="position: relative; width: 100%">                   // wrapper
  <svg ref={svgRef} width={width} height={totalHeight}>          // main SVG
    {deviceNames.map((name, rowIdx) => (
      <g key={name}>                                             // row group
        <text data-label                                         // device label
          x={labelX}
          y={yOffset + BAR_HEIGHT / 2}
          dominantBaseline="central"
          textAnchor={labelsOnRight ? 'end' : 'start'}
          fontSize={rowLabelFontSize}
          fontFamily={rowLabelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
          fontWeight={rowLabelStyleR?.fontWeight ?? 500}
          fill={rowLabelStyleR?.color ?? '#374151'}
        />
        <g transform="translate({barsX},{yOffset})">             // bar container
          // empty row background (if entries.length === 0):
          <rect x=0 y=0 width={chartWidth} height={BAR_HEIGHT}
                fill={emptyRowColor} rx=2 />
          // state bands (if xScale exists):
          {entries.map((entry, i) => (
            <rect
              x={xScale(new Date(entry.start))}
              y=0
              width={max(1, xScale(new Date(entry.end)) - x)}
              height={BAR_HEIGHT}
              fill={getStateColor(entry.state, stateColors, uniqueStates.indexOf(entry.state))}
              rx=0
              opacity={hoveredEntry?.entry === entry ? 1 : 0.8}
              style="cursor: pointer; transition: opacity 100ms ease"
              // mouseEnter, mouseMove -> setHoveredEntry
              // mouseLeave -> setHoveredEntry(null)
            />
          ))}
        </g>
      </g>
    ))}
    // X-axis group (only when xScale exists):
    <g transform="translate({barsX},{MARGIN.top + rowCount*BAR_HEIGHT + (rowCount-1)*ROW_GAP + 4})">
      {xScale.ticks(tickCount).map((tick, i) => (
        <text
          x={xScale(tick)}
          y={axisLabelFontSize + 2}
          textAnchor="middle"
          fontSize={axisLabelFontSize}
          fontFamily={labelStyleR?.fontFamily ?? 'var(--relay-font-family)'}
          fill={labelStyleR?.color ?? '#9ca3af'}
        >
          {formatted tick label}
        </text>
      ))}
    </g>
    // Legend (only when uniqueStates.length > 0):
    <foreignObject x=0
                   y={MARGIN.top + rowCount*BAR_HEIGHT + (rowCount-1)*ROW_GAP + X_AXIS_HEIGHT}
                   width={width}
                   height={LEGEND_HEIGHT}>
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
    </foreignObject>
  </svg>
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

## Label Measurement via Callback Ref

The SVG element receives a callback ref `svgRef`, not a `useRef`. This is a `useCallback` with the following dependency array:

```typescript
[deviceNames, rowLabelStyleR?.fontSize, rowLabelStyleR?.fontFamily, rowLabelStyleR?.fontWeight]
```

When the callback fires:

1. If `svg` is null, return immediately (unmount case).
2. Query all `<text>` elements with `[data-label]` attribute: `svg.querySelectorAll<SVGTextElement>('[data-label]')`.
3. Iterate and call `getComputedTextLength()` on each, tracking the maximum.
4. Compute `newWidth = max > 0 ? Math.ceil(max) + 16 : null`.
5. Update state only if `newWidth !== prev` to avoid infinite re-render loops.

Initial state: `measuredLabelWidth = null`, which makes `LABEL_WIDTH` fall back to `120`.

## D3 scaleTime Configuration

```typescript
const globalExtent = extent(allTimestamps) as [number, number];  // [min, max] across all devices

const xScale = scaleTime()
  .domain([new Date(globalExtent[0]), new Date(globalExtent[1])])
  .range([0, chartWidth]);
```

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
2. **Sort**: `const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp)` -- shallow copy, ascending by timestamp.
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

```
<g transform="translate({barsX}, {MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + 4})">
```

Each tick label: `y = axisLabelFontSize + 2`, `textAnchor = "middle"`.

## Tooltip Positioning

The tooltip is a `<div>` rendered outside the SVG, inside the wrapper `<div>`.

```css
position: fixed;
left: {hoveredEntry.x + 12}px;
top: {hoveredEntry.y - 10}px;
pointerEvents: none;
zIndex: 1000;
whiteSpace: nowrap;
```

`hoveredEntry.x` and `hoveredEntry.y` are `e.clientX` and `e.clientY` from the mouse event. The tooltip floats 12px to the right and 10px above the cursor.

## Hover State Management

State: `hoveredEntry: { entry: StateEntry, deviceName: string, x: number, y: number } | null`

- `onMouseEnter` on a state band `<rect>`: sets `hoveredEntry` with the entry, device name, and client coordinates.
- `onMouseMove` on the same rect: updates `hoveredEntry` with new coordinates (tooltip follows cursor).
- `onMouseLeave`: sets `hoveredEntry` to `null`.

Visual feedback: hovered band gets `opacity: 1`, all others are `opacity: 0.8`. Transition: `opacity 100ms ease`.

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

## foreignObject Legend Rendering

Rendered only when `uniqueStates.length > 0`.

```html
<foreignObject x=0
               y={MARGIN.top + rowCount * BAR_HEIGHT + (rowCount - 1) * ROW_GAP + X_AXIS_HEIGHT}
               width={width}
               height={LEGEND_HEIGHT}>
```

Inside: a flex container with `gap: 12px`, `justifyContent: center`, `flexWrap: wrap`, `padding: 4px 0`.

Each state entry:
- Color swatch: `<span>` with `width: 10px`, `height: 10px`, `borderRadius: 2px`, `backgroundColor` from `getStateColor`.
- Label: `<span>` with `color` from `labelStyleR?.color ?? '#6b7280'`.

Font: `labelStyleR?.fontFamily ?? 'var(--relay-font-family)'`, size `labelStyleR?.fontSize ?? 11`.

## Proportional Scaling

```typescript
const rawS = createScaler(width, 100, CHART_REFERENCE, 'width');
const s = (px: number) => rawS(px) > px ? px : rawS(px);
```

`CHART_REFERENCE = 500`. In `'width'` mode, `factor = width / 500`. The `s` wrapper ensures values never exceed their raw pixel values (no upscaling past 1:1). The scaler is defined inside the render callback but is available for use by all layout calculations.

## Loading State

When `deviceNames.length === 0` (empty data object):
- If `showLoading = true`: returns `<ResponsiveContainer>{({ width, height }) => <ChartSkeleton width={width} height={height} />}</ResponsiveContainer>`.
- If `showLoading = false`: returns `null`.

This check happens before any layout calculations.

## Validation

Data validation runs in a `useMemo` keyed on `[data, deviceNames, onError]`:

```typescript
for (const name of deviceNames) {
  result[name] = data[name].filter(point => {
    if (!isValidTimestamp(point.timestamp)) {
      onError?.({
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
| Thousands of devices | SVG height grows linearly: `totalHeight ~ rowCount * (BAR_HEIGHT + ROW_GAP)` |
| `rowHeight = 0` | Bars have zero height; labels overlap; technically renders but not useful |

## Dependencies

| Import | Source | Usage |
|---|---|---|
| `useMemo`, `useState`, `useCallback` | `react` | State and memoization |
| `scaleTime`, `extent` | `d3` | Time scale and domain computation |
| `DataPoint`, `FontStyle`, `BackgroundStyle` | `../utils/types` | Type definitions |
| `ResponsiveContainer` | `../charts/shared/ResponsiveContainer` | Width observation and resize handling |
| `resolveFont` | `../utils/useResolvedStyles` | Font style resolution |
| `ChartSkeleton` | `../charts/shared/Skeleton` | Loading skeleton |
| `createScaler`, `CHART_REFERENCE` | `../utils/scaler` | Proportional scaling |
| `isValidTimestamp`, `ComponentError` | `../utils/validation` | Timestamp validation |
| `getStateColor`, `groupStateEntries`, `StateEntry` | `./stateUtils` | State processing and color resolution |
