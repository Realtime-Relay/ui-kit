# StatCardWithGraph — Requirements

## Purpose
Display a single value with a decorative sparkline graph behind it. Extends StatCard with a time-series sparkline that shows recent data trend. Used for IoT dashboard widgets that need both current value and visual trend at a glance.

## Inherits from StatCard
All StatCard requirements apply. Additional props below.

## Additional Props

### Sparkline Data
| Prop | Type | Default | Description |
|---|---|---|---|
| `sparklineData` | `any[]` | `[]` | Array of data points for the sparkline. Each point must have a `timestamp` field (or extractable timestamp). |
| `sparklineExtractor` | `(point: any) => number` | required when sparklineData provided | Extracts the y-axis numeric value from each data point |
| `sparklineWindow` | `number` | `30000` (30s) | Time window in milliseconds. Only data within `[latest - window, latest]` is shown. |
| `graphLineColor` | `string` | `'#3b82f6'` | Sparkline stroke and fill color. Overridden by alert zone color when zones are active (unless explicitly set). |

### Zone Change
| Prop | Type | Default | Description |
|---|---|---|---|
| `onZoneChange` | `(transition: ZoneTransition) => void` | — | Callback when numericValue crosses zone boundaries |

## Sparkline Behavior
- Renders as SVG behind the text content
- Covers bottom 60% of the card height (fixed, not configurable)
- Line stroke with area fill (opacity 0.15) below the line
- No axes, no labels, no tooltips — purely decorative
- Sparkline only renders when `sparklineData` has 2+ points and `sparklineExtractor` is provided
- Time window: displays data from `[latestTimestamp - sparklineWindow, latestTimestamp]`
- Updates when `sparklineData` prop changes (no continuous scrolling)
- Old points outside the window are excluded from rendering

## Sparkline + Alert Zones
- When alert zones are active and `numericValue` falls in a zone:
  - The zone color replaces `graphLineColor` (unless `graphLineColor` is explicitly set by developer)
  - Value text, label, and timestamp also adopt the zone color (unless `styles.*.color` overrides)

## Sparkline Data Extraction
The `sparklineExtractor` callback receives each raw data point and must return a number:

```tsx
// Flat data: { timestamp: 123, temperature: 23.5 }
sparklineExtractor={(point) => point.temperature}

// Nested data: { timestamp: 123, payload: { temp: 23.5 } }
sparklineExtractor={(point) => point.payload.temp}

// Computed: { timestamp: 123, readings: [1, 2, 3] }
sparklineExtractor={(point) => point.readings.reduce((a, b) => a + b, 0) / point.readings.length}
```

Timestamp extraction: the component expects each data point to have a `timestamp` property (number, ms epoch). If the data uses a different field name, the developer should normalize before passing.

## Proportional Scaling
- Same as StatCard (reference: 300px)
- Sparkline stroke width also scales proportionally

## Validation
- Same as StatCard for value/numericValue
- If `sparklineData` is provided without `sparklineExtractor`, log a console warning and skip sparkline rendering
- Invalid values returned by `sparklineExtractor` (NaN, non-finite) → skip that point silently
