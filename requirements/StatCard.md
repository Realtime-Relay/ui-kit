# StatCard — Requirements

## Purpose
Display a single value prominently with optional label and timestamp. Used for showing the latest reading from a sensor, device status, or any single data point on an IoT dashboard.

## Core Behavior
- Displays a single value of any type (number, string, boolean, JSON object)
- Optional label above the value (e.g., metric name)
- Optional "last updated" timestamp below the value
- Optional alert zone coloring when value is numeric

## Props

### Data
| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `any` | required | The value to display. Numbers are formatted via `formatValue`, objects via `JSON.stringify`, primitives via `String()` |
| `numericValue` | `number?` | — | Numeric value for alert zone evaluation. Falls back to `value` if `value` is a number and `numericValue` is not provided |
| `label` | `string?` | — | Label text displayed above the value (e.g., metric name) |
| `formatValue` | `(value: any) => string` | auto | Custom formatter. Default: `String()` for primitives, `JSON.stringify()` for objects. If not provided, numbers use `defaultFormatValue` (2 decimal trim) |

### Timestamp
| Prop | Type | Default | Description |
|---|---|---|---|
| `lastUpdated` | `Date \| number?` | — | Timestamp of last data update |
| `showLastUpdated` | `boolean` | `false` | Show/hide the timestamp |
| `formatTimestamp` | `(ts: Date \| number) => string` | `defaultFormatTimestamp` | Custom timestamp formatter. Default: `dd MMM yyyy HH:MM:SS.sss +TZ` |
| `lastUpdatedMargin` | `number` | `8` | Margin above the timestamp (px, scaled proportionally) |

### Alert Zones
| Prop | Type | Default | Description |
|---|---|---|---|
| `alertZones` | `AlertZone[]` | `[]` | Alert zone definitions. Zone color is applied to value text, label, and timestamp |
| `onZoneChange` | `(transition: ZoneTransition) => void` | — | Callback when value crosses zone boundaries |

Zone color priority: `styles.*.color` (explicit) overrides zone color. Zones only color elements without an explicit color set.

### Styling
| Prop | Type | Default | Description |
|---|---|---|---|
| `styles.value` | `FontStyle` | — | Value text styling (fontFamily, fontSize, fontWeight, color, fontFile) |
| `styles.label` | `FontStyle` | — | Label text styling |
| `styles.lastUpdated` | `FontStyle` | — | Timestamp text styling |
| `styles.background` | `BackgroundStyle` | transparent | Background color |
| `styles.width` | `string \| number` | `'100%'` | Explicit width (px number or CSS string) |
| `styles.height` | `string \| number` | `'100%'` | Explicit height (px number or CSS string) |
| `borderRadius` | `number \| 'rounded' \| 'sharp'` | `'rounded'` | Corner radius |
| `borderColor` | `string?` | — | Border color |
| `borderThickness` | `number?` | — | Border width in px |

### Loading & Errors
| Prop | Type | Default | Description |
|---|---|---|---|
| `showLoading` | `boolean` | `true` | Show skeleton shimmer when value is null/undefined |
| `onError` | `(error: ComponentError) => void` | — | Called when value is null/undefined. Last valid value is retained. |

## Proportional Scaling
- Reference size: 300px width
- All pixel values (padding, font sizes, margins) scale proportionally with container width
- Uses `createScaler(width, height, 300, 'width')`

## Validation
- `null`/`undefined` value → show loading skeleton (if `showLoading=true`) or retain last value + fire `onError`
- Alert zones validated via `validateAlertZones()` (throws on missing bounds, inverted, overlapping)
- Alert zone evaluation only when `numericValue` (or numeric `value`) is available

## Default Display Logic
| Value Type | Display |
|---|---|
| `number` | `formatValue(value)` or `defaultFormatValue(value)` → "23.46" |
| `string` | `formatValue(value)` or `String(value)` → "Running" |
| `boolean` | `formatValue(value)` or `String(value)` → "true" |
| `object` | `formatValue(value)` or `JSON.stringify(value)` → '{"temp":23.5}' |
| `null`/`undefined` | Loading skeleton or last valid value |
