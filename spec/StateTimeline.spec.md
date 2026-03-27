# StateTimeline — Component Specification

Source: `src/timelines/StateTimeline.tsx`
Requirements: `requirements/StateTimeline.md`

## Component Signature

```typescript
interface StateTimelineStyles {
  label?: FontStyle;
  rowLabel?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
  emptyRowColor?: string;
}

interface StateTimelineProps {
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

## Rendering

### Layout Structure
- Outer: `ResponsiveContainer` (width: 100%, observes resize)
- Inner: `<svg>` containing rows, axis, and legend
- Each device gets one row: label text + state bar group
- Legend rendered inside SVG via `<foreignObject>`
- Tooltip rendered as a fixed-position `<div>` outside the SVG

### Row Composition
```
[MARGIN.left] [LABEL_WIDTH] [LABEL_GAP] [--- chart area ---] [MARGIN.right]
```
When `labelAlign='right'`:
```
[MARGIN.left] [--- chart area ---] [LABEL_GAP] [LABEL_WIDTH] [MARGIN.right]
```

### Constants
| Name | Value | Description |
|---|---|---|
| `BAR_HEIGHT` | `rowHeight ?? 28` | Row height |
| `ROW_GAP` | `6` | Vertical gap between rows |
| `LABEL_GAP` | `8` | Gap between labels and bars |
| `X_AXIS_HEIGHT` | `20` | Space for time axis ticks |
| `LEGEND_HEIGHT` | `24` | Space for state legend |
| `MARGIN` | `{ top: 8, right: 12, bottom: 8, left: 12 }` | SVG margins |

### SVG Height Calculation
```
totalHeight = MARGIN.top
  + rowCount * BAR_HEIGHT
  + (rowCount - 1) * ROW_GAP
  + X_AXIS_HEIGHT
  + (hasData ? LEGEND_HEIGHT : 0)
  + MARGIN.bottom
```

### Label Auto-Measurement
1. First render uses fallback `LABEL_WIDTH = 120`
2. SVG `ref` callback fires on mount
3. Queries all `[data-label]` text elements
4. Computes `getComputedTextLength()` for each
5. Sets `measuredLabelWidth = ceil(max) + 16`
6. Re-render uses measured width
7. Callback ref recreated when `deviceNames` or row label font props change

### Label Alignment
| `labelAlign` | Label `x` | `textAnchor` | Bars `x` |
|---|---|---|---|
| `'left'` (default) | `MARGIN.left` | `start` | `MARGIN.left + LABEL_WIDTH + LABEL_GAP` |
| `'right'` | `width - MARGIN.right` | `end` | `MARGIN.left` |

## State Processing

### State Grouping (`groupStateEntries`)
1. Sort data points by timestamp
2. Iterate: map each point's metric value through `stateMapper`
3. Collapse consecutive identical states into `StateEntry { state, start, end }`
4. Return array of entries per device

### Color Resolution (`getStateColor`)
Priority order:
1. `stateColors[state]` — user-provided override
2. `DEFAULT_STATE_COLORS[state]` — built-in map (normal, warning, critical, error, offline, online)
3. `FALLBACK_COLORS[index % 6]` — cyclic palette for unmapped states

### Time Scale
- D3 `scaleTime` from global min to global max timestamp across all devices
- Range: `[0, chartWidth]`
- Null when no valid timestamps exist (all devices empty)

## Empty Data Behavior

| `data` value | Renders |
|---|---|
| `{}` | Skeleton (showLoading=true) or null |
| `{ 'a': [] }` | Row with label + `emptyRowColor` background rect |
| `{ 'a': [...], 'b': [] }` | Row A with state bars, Row B with empty background. X-axis from A's data. |

Empty row rect: `<rect x=0 y=0 width={chartWidth} height={BAR_HEIGHT} fill={emptyRowColor} rx=2 />`

## X-Axis

- Positioned below all rows
- Tick count: `min(floor(chartWidth / (labelWidth + fontSize*2)), 6)`, minimum 2
- Format: time-only (`HH:MM`) when same-day, date+time (`MMM DD HH:MM`) when multi-day
- Uses `Date.toLocaleTimeString` / `Date.toLocaleDateString`

## Tooltip

- Fixed position (`position: fixed`) following mouse cursor
- Shows on `mouseEnter`/`mouseMove`, hides on `mouseLeave`
- Z-index: 1000, `pointerEvents: none`
- Default content: device name + state name (bold), time range (dimmed)
- `renderTooltip` overrides with custom JSX
- `formatTooltip` overrides with custom string
- Priority: `renderTooltip` > `formatTooltip` > default

## Legend

- Rendered inside `<foreignObject>` within the SVG
- Flex row, centered, wrapping
- One swatch (10x10 rounded rect) + label per unique state
- Only shown when `uniqueStates.length > 0`

## Validation

- Each data point's `timestamp` checked via `isValidTimestamp()`
- Invalid points filtered out, `onError` called per invalid point with:
  ```typescript
  { type: 'invalid_timestamp', message: string, rawValue: any, component: 'StateTimeline' }
  ```

## Proportional Scaling
- Reference: 100px width (CHART_REFERENCE)
- `createScaler(width, 100, CHART_REFERENCE, 'width')` — capped so scaled values never exceed raw values

## Dependencies
- `d3`: `scaleTime`, `extent`
- `ResponsiveContainer` for resize observation
- `stateUtils`: `getStateColor`, `groupStateEntries`, `StateEntry`
- `resolveFont` for font style resolution
- `createScaler` / `CHART_REFERENCE` for proportional scaling
- `isValidTimestamp` / `ComponentError` for validation
