# StateTimeline — Requirements

## Purpose
Visualize device state over time as horizontal color-coded bars. Supports single or multiple devices in a stacked layout with shared time axis, automatic label sizing, and configurable appearance.

## Core Behavior
- Renders one row per device, each showing consecutive state bands as colored rectangles
- States are derived from metric values via a user-supplied `stateMapper` function
- Shared X-axis across all devices with adaptive tick counts
- State legend showing all unique states with color swatches
- Hover tooltips displaying device name, state, and time range
- Responsive to container width via `ResponsiveContainer`

## Props

### Data
| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `Record<string, DataPoint[]>` | required | Device names mapped to arrays of data points. Pass a single key for one device. Empty arrays render an empty row background. |
| `stateMapper` | `(value: any) => string` | required | Maps a metric value to a state name (e.g., `v => v > 70 ? 'critical' : 'normal'`) |
| `metricKey` | `string?` | auto-detected | Key in `DataPoint` to read values from. Auto-detects the first non-`timestamp` key if omitted. |

### Colors
| Prop | Type | Default | Description |
|---|---|---|---|
| `stateColors` | `Record<string, string>?` | built-in defaults | Override colors per state name. Falls back to `DEFAULT_STATE_COLORS`, then `FALLBACK_COLORS` palette. |

### Tooltips
| Prop | Type | Default | Description |
|---|---|---|---|
| `formatTooltip` | `(entry: StateEntry, deviceName: string) => string` | — | Custom string tooltip formatter |
| `renderTooltip` | `(entry: StateEntry, deviceName: string) => ReactNode` | — | Custom JSX tooltip renderer. Takes precedence over `formatTooltip`. |

Default tooltip shows: device name, state name, and start–end time range.

### Layout
| Prop | Type | Default | Description |
|---|---|---|---|
| `rowHeight` | `number?` | `28` | Height of each device row in pixels |
| `labelAlign` | `'left' \| 'right'` | `'left'` | Position of device name labels relative to the bars |

### Styling
| Prop | Type | Default | Description |
|---|---|---|---|
| `styles.label` | `FontStyle?` | — | X-axis tick labels and legend text |
| `styles.rowLabel` | `FontStyle?` | — | Device name labels (font size, family, weight, color) |
| `styles.tooltip` | `FontStyle?` | — | Tooltip text styling |
| `styles.background` | `BackgroundStyle?` | transparent | Container background color |
| `styles.emptyRowColor` | `string?` | `'#f3f4f6'` | Background color for rows with no data points |

### Loading & Errors
| Prop | Type | Default | Description |
|---|---|---|---|
| `showLoading` | `boolean` | `true` | Show skeleton when `data` is `{}` (no device keys). Devices with empty arrays render empty rows instead of skeleton. |
| `onError` | `(error: ComponentError) => void` | — | Called for each data point with an invalid timestamp |

## Label Auto-Sizing
- Device name labels are auto-measured using SVG `getComputedTextLength()` after mount
- The label column width adapts to the widest label with 16px padding
- Falls back to 120px on first render before measurement completes

## Time Axis
- Shared across all devices using the global min/max timestamps
- Tick count adapts to available chart width (max 6 ticks)
- Shows date + time (`"Mar 27 14:30"`) when data spans multiple calendar days
- Shows time only (`"14:30"`) when all data is within a single day

## State Grouping
- Consecutive data points with the same mapped state are collapsed into a single band
- Data is sorted by timestamp before grouping
- Each band has a start and end time derived from the first and last point in the group

## Empty Data Handling
| Scenario | Behavior |
|---|---|
| `data = {}` | Loading skeleton (if `showLoading=true`) or nothing |
| `data = { 'device': [] }` | Renders row with label and empty background bar |
| Mix of empty and populated | Populated devices show state bars, empty ones show background |

## Validation
- Invalid timestamps (NaN, negative, non-finite) are filtered out with `onError` callback
- Component renders remaining valid data points
