# StatCardWithGraph — Requirements

## Purpose and Use Case

StatCardWithGraph extends StatCard with a decorative sparkline graph rendered behind the text content. It displays a single value prominently while providing a visual trend of recent data. The sparkline shows a time-windowed subset of historical data points as a line with an area fill beneath it.

Primary use case: IoT dashboard widgets where the operator needs to see both the current value (e.g., latest temperature reading) and the recent trend (e.g., last 30 seconds of readings) at a glance. The sparkline is purely decorative -- no axes, labels, tooltips, or interactivity.

---

## Inherits from StatCard

All StatCard requirements apply identically: value handling (any type support, null/undefined retention, formatting chain), alert zones, border configuration, loading skeleton, proportional scaling, timestamp display, error handling, and font file injection. See `requirements/StatCard.md` for those details.

This document covers only the additional sparkline-specific behavior and how sparkline interacts with inherited features.

---

## Additional Props

### Sparkline Data Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `sparklineData` | `any[]` | `[]` | No | Array of raw data points for the sparkline. Each point must have a `timestamp` property (number, milliseconds epoch). The y-axis value is extracted via `sparklineExtractor`. Points with non-numeric or non-finite timestamps are silently skipped. The array does not need to be sorted; the D3 scales handle arbitrary ordering. |
| `sparklineExtractor` | `(point: any) => number` | — | Conditionally | Callback that extracts the numeric y-axis value from each raw data point. Required when `sparklineData` is provided and non-empty; if omitted while `sparklineData` has data, a console warning is logged and the sparkline is not rendered. Must return a finite number. Points where the extractor returns `NaN`, `Infinity`, `-Infinity`, or a non-number type are silently skipped. |
| `sparklineWindow` | `number` | `30000` | No | Time window in milliseconds. Only data points within `[latestTimestamp - sparklineWindow, latestTimestamp]` are rendered, where `latestTimestamp` is the maximum timestamp in the dataset. Default: 30 seconds (30000ms). Points outside this window are excluded from the SVG path. |
| `graphLineColor` | `string` | `'#3b82f6'` | No | Stroke and fill color for the sparkline. The default is Tailwind blue-500 (`#3b82f6`). This color is subject to zone color override logic (see **Sparkline + Alert Zones**). |

### Zone Change Callback

| Prop | Type | Default | Description |
|---|---|---|---|
| `onZoneChange` | `(transition: ZoneTransition) => void` | — | Same as StatCard. Callback when the evaluated numeric value crosses zone boundaries. |

---

## Sparkline Behavior

### Rendering Rules
- The sparkline renders as an SVG element positioned behind the text content.
- The sparkline only renders when ALL of these conditions are met:
  1. `sparklineExtractor` is provided (function exists).
  2. After extraction and validation, at least 2 valid points remain within the time window.
- When these conditions are not met, no SVG element is rendered and the card displays only text content (identical to StatCard).

### SVG Positioning
- The SVG is positioned absolutely within the card container.
- Position: `bottom: 0, left: 0`
- Size: `width: '100%', height: '60%'` (covers the bottom 60% of the card height, fixed and not configurable).
- `preserveAspectRatio="none"` — the sparkline stretches to fill the allocated space without maintaining its natural aspect ratio.
- `pointerEvents: 'none'` — the SVG does not intercept mouse/touch events.

### Line and Area
- **Line:** A `<path>` element with `fill="none"`, colored by `sparkColor`, `strokeWidth` scaled via `s(2)`, and `opacity: 0.5`.
- **Area fill:** A `<path>` element filled with `sparkColor`, `opacity: 0.15`, covering the area below the line down to the bottom of the SVG viewport.

### Time Window
- `latestTimestamp` = `Math.max(...points.map(p => p.timestamp))` across all valid extracted points.
- `windowStart` = `latestTimestamp - sparklineWindow`.
- Only points with `timestamp >= windowStart` are included in the rendered paths.
- The window only advances when the `sparklineData` prop changes (there is no continuous scrolling or animation).

### No Interaction
- No axes, grid lines, labels, or tooltips.
- No hover effects or click handlers on the sparkline.
- The sparkline is purely decorative background visualization.

---

## Sparkline + Alert Zones

When alert zones are active and the evaluated `zoneNumeric` falls within a zone, the zone color affects the sparkline:

### Color Priority for Sparkline
```
1. Explicit graphLineColor (developer set a non-default value)  →  use graphLineColor
2. Zone color (zoneNumeric falls in a zone)                      →  use zoneColor
3. Default graphLineColor ('#3b82f6')                            →  use '#3b82f6'
```

The component detects whether `graphLineColor` was explicitly set by checking if it differs from the default `'#3b82f6'`. If the developer passes `graphLineColor="#3b82f6"` explicitly, this is indistinguishable from the default and zone color will override it.

### Color Priority for Text Elements
Same as StatCard: `styles.*.color` (explicit) > `zoneColor` > default color.

Zone color propagates to:
- Value text
- Label text
- Timestamp text
- Sparkline stroke and fill (unless `graphLineColor` is explicitly non-default)

---

## Sparkline Data Extraction

The `sparklineExtractor` callback is called once per data point during the `useMemo` computation:

```tsx
// Flat data
sparklineExtractor={(point) => point.temperature}

// Nested data
sparklineExtractor={(point) => point.payload.temp}

// Computed value
sparklineExtractor={(point) => point.readings.reduce((a, b) => a + b, 0) / point.readings.length}
```

### Timestamp Extraction
The component reads `point.timestamp` directly (not via the extractor). The `timestamp` field must be a finite number (milliseconds epoch). Points where `typeof point.timestamp !== 'number'` or `!Number.isFinite(point.timestamp)` are silently skipped.

### Validation Per Point
For each point in `sparklineData`:
1. Check `point.timestamp`: must be a finite number. Skip if not.
2. Call `sparklineExtractor(point)`: must return a finite number. Skip if NaN, non-finite, or non-number.
3. If both pass, the point `{ timestamp, value }` is included in the working set.

---

## Proportional Scaling

Same as StatCard with one addition:
- **Sparkline stroke width:** `s(2)` — 2px at 300px reference, scales proportionally.
- All other scaled values are identical: padding `s(16)`, value font `s(32)`, label font `s(13)`, timestamp font `s(11)`, label margin `s(4)`, timestamp margin `s(lastUpdatedMargin)`.

---

## Loading Skeleton Behavior

Identical to StatCard:
- When `showLoading === true` and `renderValue === null`, the skeleton shimmer is shown.
- No sparkline is rendered during the loading state (the skeleton replaces the entire card).
- The skeleton div has the same gradient, animation, and border radius behavior as StatCard.

---

## Last Updated Display Rules

Identical to StatCard:
- Renders only when `showLastUpdated === true` AND `lastUpdated != null`.
- Default format: `dd MMM yyyy HH:MM:SS.sss +TZ`.
- Custom format via `formatTimestamp` callback.

---

## Error Handling

### Null/Undefined Values
Identical to StatCard: `onError` fires, last valid value retained, loading skeleton shown if no previous value exists.

### Missing Sparkline Extractor
- If `sparklineData.length > 0` and `sparklineExtractor` is falsy, a `console.warn` is emitted (once, via `useEffect` with dedup dependencies).
- The sparkline is not rendered; the card behaves identically to StatCard.
- This is a warning, not an error. No `onError` callback is fired.

### Invalid Extractor Return Values
- Points where `sparklineExtractor` returns `NaN`, `Infinity`, `-Infinity`, or a non-number are silently skipped.
- If all points are invalid, fewer than 2 valid points remain, and the sparkline is not rendered.

### Fewer Than 2 Valid Points
- The sparkline requires at least 2 valid data points within the time window to render a line.
- With 0 or 1 valid points, the sparkline SVG is omitted entirely.

### Identical Y Values
- When all y-values in the windowed dataset are identical (e.g., all readings are `23.5`), `yMin === yMax`.
- The component handles this by adjusting: `yMin -= 1; yMax += 1`, creating a 2-unit range centered on the value.
- This renders the sparkline as a flat horizontal line at the vertical center of the SVG.

---

## Alert Zone Validation

Identical to StatCard: `validateAlertZones` runs on every render when `alertZones.length > 0`. Same hard error behavior.

---

## Responsive Behavior

- The card fills its container by default (`width: '100%'`, `height: '100%'`).
- All text sizes, padding, margins, and the sparkline stroke width scale proportionally based on container width.
- The sparkline SVG always occupies the bottom 60% of the card height, regardless of container dimensions.
- `preserveAspectRatio="none"` on the SVG means the sparkline stretches horizontally and vertically to fill its allocation.
- The content overlay (label, value, timestamp) is centered vertically and horizontally within the full card area, overlapping the sparkline.
