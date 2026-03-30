# ProgressBar -- Requirements

## Purpose

A horizontal or vertical progress bar that visualizes a numeric value within a configurable range. Designed for IoT dashboards where operators monitor sensor values, tank fill levels, or process completion. Supports alert zone coloring with transparent background bands, custom fonts (including .otf/.ttf file imports), responsive sizing, animated transitions, zone change callbacks, last-updated timestamps, and real-time data integration via the RelayX App SDK.

## Props

### Value Props

| Prop   | Type             | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ---------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data` | `RelayDataPoint` | Yes      | --      | The result from `useRelayLatest()`. `data.value` provides the current numeric value to display. Subject to soft validation: if not a finite number, `onError` fires and the component falls back to the last valid value. If no valid value has ever been received and `showLoading` is true, a skeleton shimmer is rendered. The raw value (unclamped) is passed to `formatValue` for the label. The fill bar uses the clamped value. `data.timestamp` provides the last updated timestamp. |
| `min`  | `number`         | No       | `0`     | Lower bound of the range. Must be strictly less than `max` (hard validation -- throws on violation).                                                                                                                                                                                                                                                                                                                                                                                         |
| `max`  | `number`         | No       | `100`   | Upper bound of the range. Must be strictly greater than `min`. `min === max` also throws.                                                                                                                                                                                                                                                                                                                                                                                                    |

### Label Props

| Prop          | Type                        | Required | Default              | Description                                                                                                                                                                                                       |
| ------------- | --------------------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showLabel`   | `boolean`                   | No       | `true`               | Whether to render the centered value label over the bar.                                                                                                                                                          |
| `formatValue` | `(value: number) => string` | No       | `defaultFormatValue` | Custom value formatter. Receives the **unclamped** `safeValue` (which is `renderValue ?? min`). Default implementation: integers display as-is, decimals show up to 2 decimal places with trailing zeros trimmed. |

### Orientation Props

| Prop          | Type                         | Required | Default        | Description                                                 |
| ------------- | ---------------------------- | -------- | -------------- | ----------------------------------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'` | No       | `'horizontal'` | Controls the direction of fill growth and zone positioning. |

#### Orientation Modes

**Horizontal (`orientation = 'horizontal'`):**

- Fill bar grows left to right. `width` is set to `{percentage}%`, with `left: 0, top: 0, bottom: 0`.
- Alert zone bands are positioned with `left: {zoneStart}%` and `width: {zoneWidth}%`.
- Default height: `var(--relay-progress-height, 24px)`.

**Vertical (`orientation = 'vertical'`):**

- Fill bar grows bottom to top. `height` is set to `{percentage}%`, with `left: 0, right: 0, bottom: 0`.
- Alert zone bands are positioned with `bottom: {zoneStart}%` and `height: {zoneWidth}%`.
- Default height: `100%` (fills parent).

### Alert Zone Props

| Prop             | Type          | Required | Default                      | Description                                                                                                                                                                                                                                                           |
| ---------------- | ------------- | -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alertZones`     | `AlertZone[]` | No       | `[]`                         | Array of `{ min: number, max: number, color: string, label?: string }`. Defines colored regions on the bar. Subject to hard validation: each zone must have finite `min` and `max` with `min <= max`, and zones must not overlap (touching at boundaries is allowed). |
| `showAlertZones` | `boolean`     | No       | `true` (when zones provided) | Controls visibility of the transparent background bands. When `false`, zone bands are hidden but the fill bar still uses zone-based coloring. Effective default: `showAlertZones !== false` when `alertZones.length > 0`.                                             |

#### Alert Zone Visualization

When `displayZones` is true (zones exist and `showAlertZones !== false`):

- Each zone renders a transparent background band at **15% opacity** (`opacity: 0.15`) behind the fill bar.
- The fill bar is fully opaque and sits on top, so there is no color mixing where the fill overlaps a zone band.
- Zone positions are calculated as percentages of the full range:
  - `zoneStart = ((max(zone.min, min) - min) / range) * 100`
  - `zoneEnd = ((min(zone.max, max) - min) / range) * 100`
  - `zoneWidth = zoneEnd - zoneStart`

#### Alert Zone Tooltips

Each zone also renders an invisible tooltip hit area on top of all other layers (z-index 4). These use the native browser `title` attribute:

- Format with label: `"{label}: {zone.min} -- {zone.max}"`
- Format without label: `"{zone.min} -- {zone.max}"`

The hit areas are transparent `<div>` elements positioned identically to their corresponding background bands but at the highest z-index, ensuring tooltips work even over the fill bar.

### Zone Legend, Zone Values & Min/Max

| Prop               | Type        | Required | Default | Description                                                                                                                                                                                                                                            |
| ------------------ | ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `showZoneLegend`   | `boolean`   | No       | `false` | Show a legend of alert zones below the bar. Each zone with a `label` renders a colored swatch + label text. Zones without labels are omitted.                                                                                                          |
| `showZoneValues`   | `boolean`   | No       | `false` | Show zone boundary values along the bar. Uses `getZoneBoundaries()` from `src/gauges/shared.ts` to extract unique boundary values between adjacent zones (excluding min/max). Horizontal: positioned above the bar. Vertical: positioned to the right. |
| `showMinMax`       | `boolean`   | No       | `false` | Show min and max values at the ends of the bar. Horizontal: min on left, max on right. Vertical: max on top, min on bottom.                                                                                                                            |
| `styles.zoneValue` | `FontStyle` | No       | --      | Font styling for zone boundary values and min/max labels. Default: fontSize 10, fontWeight 400, fontFamily `var(--relay-font-family)`.                                                                                                                 |

Zone boundary values are colored to match their zone color by default (the color of the zone whose `min` equals the boundary value). When `styles.zoneValue.color` is explicitly set, it overrides the per-zone coloring for all boundary labels.

#### Fill Color from Zones

The fill bar color is determined by `getZoneColor(clampedValue, alertZones, fallback)`:

- Iterates through `alertZones` in order.
- Returns the `color` of the first zone where `value >= zone.min && value <= zone.max`.
- If no zone matches, returns the fallback: `var(--relay-progress-fill, #3b82f6)`.

### Style Props

| Prop                     | Type               | Required | Default                                     | Description                                                                                                                                                                                                                        |
| ------------------------ | ------------------ | -------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles.label_font_file` | `FontStyle`        | No       | --                                          | Font styling for the value label. `fontFamily` can be a CSS string or a file path (.otf/.ttf/.woff/.woff2) which triggers auto `@font-face` injection. Defaults: fontSize 12, fontWeight 600, color determined by fill percentage. |
| `styles.lastUpdated`     | `FontStyle`        | No       | --                                          | Font styling for the last-updated timestamp text. Defaults: fontSize 11, fontWeight 400, color `#9ca3af`.                                                                                                                          |
| `styles.zoneValue`       | `FontStyle`        | No       | --                                          | Font styling for zone boundary values and min/max labels. Defaults: fontSize 10, fontWeight 400, color matches zone color (or `#9ca3af` fallback). Explicit `color` overrides per-zone coloring.                                   |
| `styles.background`      | `BackgroundStyle`  | No       | --                                          | `color` property sets the track background. Default: `var(--relay-progress-bg, #e5e7eb)`.                                                                                                                                          |
| `styles.width`           | `string \| number` | No       | `'100%'`                                    | Custom width. Numbers are treated as pixels. Strings are used as CSS values. The container always has `maxWidth: 100%` to prevent overflow.                                                                                        |
| `styles.height`          | `string \| number` | No       | `'24px'` (horizontal) / `'100%'` (vertical) | Custom height. Same type handling as width. For horizontal, defaults to `var(--relay-progress-height, 24px)`. For vertical, defaults to `100%`.                                                                                    |

### Font Auto-Loading

When `styles.label_font_file.fontFamily` is a path ending in `.otf`, `.ttf`, `.woff`, or `.woff2` (or starts with `data:font/`):

1. A unique family name is generated: `relay-custom-font-{counter}`.
2. A `<style>` element with an `@font-face` rule is injected into `document.head`.
3. The rule uses `font-display: swap` for non-blocking loading.
4. Loaded fonts are cached in a module-level `Map` -- same URL is only injected once.
5. The generated family name is used as the label's `fontFamily`.

If the value does not match a font file extension, it is treated as a normal CSS `font-family` string.

### Last Updated Props

| Prop              | Type                             | Required | Default                  | Description                                                                                                               |
| ----------------- | -------------------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `showLastUpdated` | `boolean`                        | No       | `false`                  | Whether to show the formatted timestamp below the bar. The timestamp comes from `data.timestamp`.                         |
| `formatTimestamp` | `(ts: Date \| number) => string` | No       | `defaultFormatTimestamp` | Custom timestamp formatter. Default format: `"dd MMM yyyy HH:MM:SS.sss +TZ"` (e.g., `"26 Mar 2026 22:39:40.123 +05:30"`). |

The `data` prop is the required prop providing value and timestamp. `data.value` is used as the component value and `data.timestamp` as the last updated timestamp. Recommended pattern: `<ProgressBar data={useRelayLatest({...})} showLastUpdated />`

### Callback Props

| Prop           | Type                                   | Required | Default | Description                                                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onZoneChange` | `(transition: ZoneTransition) => void` | No       | --      | Fired when the value crosses from one alert zone to another (or enters/leaves a zone). The `ZoneTransition` contains `previousZone`, `currentZone`, and `value`. Not fired on the initial render (first value sets the baseline). Zone identity is compared by `min`/`max`/`color`, not by reference. |
| `onError`      | `(error: ComponentError) => void`      | No       | --      | Fired when `value` is not a finite number. Error has `type: 'invalid_value'`. The component falls back to the last valid value (or renders skeleton/uses min if no valid value has ever been set).                                                                                                    |

### Loading Props

| Prop          | Type      | Required | Default | Description                                                                                                                                                                                     |
| ------------- | --------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showLoading` | `boolean` | No       | `true`  | When true and no valid value has ever been received (`renderValue == null`), render an animated skeleton shimmer instead of the bar. The skeleton respects custom width and height from styles. |

## Fill Bar Animation

All fill bar property changes are animated with CSS transitions:

- `width` (horizontal) / `height` (vertical): `300ms ease`
- `background-color`: `300ms ease` (smooth transition when crossing zone boundaries)

Combined transition string: `transition: width 300ms ease, height 300ms ease, background-color 300ms ease`.

## Label Text Color Logic

The label color is determined in this priority:

1. If `styles.label_font_file.color` is set, use it (user override).
2. If the fill percentage exceeds 50% (`percentage > 50`), use `#fff` (white).
3. Otherwise, use `currentColor` (inherits from parent).

The color transitions smoothly: `transition: color 300ms ease`.

## Value Clamping and Ratio Calculation

```
range = max - min
clampedValue = min(max, max(min, safeValue))
ratio = range > 0 ? (clampedValue - min) / range : 0
percentage = ratio * 100
```

- `safeValue` is `renderValue ?? min` -- when no valid value exists and loading is not shown, the bar defaults to the minimum.
- The label displays the unclamped `safeValue` via `formatValue(safeValue)`.
- The fill bar width/height uses `percentage`, which is clamped to [0, 100].
- When `range === 0` (caught by hard validation, but if reached), `ratio = 0`.

## Loading Skeleton

When `showLoading = true` and `renderValue == null`:

```html
<div
  style="
  width: {containerWidthCss};
  maxWidth: 100%;
  height: {containerHeightCss};
  background: linear-gradient(90deg,
    var(--relay-skeleton-base, #e5e7eb) 25%,
    var(--relay-skeleton-shine, #f3f4f6) 50%,
    var(--relay-skeleton-base, #e5e7eb) 75%);
  backgroundSize: 200% 100%;
  animation: relay-skeleton-shimmer 1.5s ease-in-out infinite;
  borderRadius: var(--relay-progress-border-radius, 4px);
"
/>
```

The shimmer animation (`relay-skeleton-shimmer`) must be defined in a global stylesheet or injected separately.

## Last Updated Display

When `showLastUpdated = true` and `data.timestamp` is not null/undefined, a `<div>` is rendered below the bar container:

```
marginTop: 4px
fontSize: styles.lastUpdated?.fontSize ?? 11
fontFamily: styles.lastUpdated?.fontFamily ?? 'var(--relay-font-family)'
fontWeight: styles.lastUpdated?.fontWeight ?? 400
color: styles.lastUpdated?.color ?? '#9ca3af'
textAlign: center
```

Content: `formatTimestamp(data.timestamp)`.

## Validation and Error Handling

### Hard Validation (throws)

These run synchronously at the top of the component and throw on failure:

- **`validateRange(min, max, 'ProgressBar')`**: Throws if `min > max` or `min === max`.
- **`validateAlertZones(alertZones, 'ProgressBar')`**: Throws if any zone has missing/non-finite min/max, inverted min/max, or if zones overlap (sorted by min, checks `a.max > b.min` for consecutive pairs; touching at boundary is allowed).

### Soft Validation (fires onError, falls back)

- **`validateValue(value, 'ProgressBar', onError)`**: Returns the value if it is a finite number, or `null` if invalid. On invalid, fires `onError` with `type: 'invalid_value'`.
- The component maintains `lastValidRef` (a ref): when a valid value arrives, it is stored. When invalid, the last valid value is used. If no valid value has ever been received, `renderValue` is null (triggers skeleton or falls back to min).

## CSS Variable Theming

| Variable                         | Default   | Description                                              |
| -------------------------------- | --------- | -------------------------------------------------------- |
| `--relay-progress-height`        | `24px`    | Default bar height (horizontal)                          |
| `--relay-progress-bg`            | `#e5e7eb` | Track background color                                   |
| `--relay-progress-fill`          | `#3b82f6` | Default fill color (no zones or value outside all zones) |
| `--relay-progress-border-radius` | `4px`     | Border radius for track and fill                         |
| `--relay-font-family`            | --        | Global font family fallback                              |
| `--relay-skeleton-base`          | `#e5e7eb` | Skeleton gradient base color                             |
| `--relay-skeleton-shine`         | `#f3f4f6` | Skeleton gradient shine color                            |
| `--relay-tooltip-bg`             | --        | Not used directly by ProgressBar (native tooltips only)  |

## Z-Index Layering

Four explicit layers inside the bar container (`position: relative; overflow: hidden`):

| Layer             | z-index | Content                          | Description                                                            |
| ----------------- | ------- | -------------------------------- | ---------------------------------------------------------------------- |
| Zone bands        | `0`     | Alert zone background divs       | Transparent colored bands at 15% opacity                               |
| Fill bar          | `1`     | Solid fill div                   | Fully opaque, covers zones underneath                                  |
| Label             | `3`     | Value text span                  | `position: relative` (creates stacking context), `pointerEvents: none` |
| Tooltip hit areas | `4`     | Invisible zone divs with `title` | `background: transparent`, positioned identically to zone bands        |

Note: z-index 2 is intentionally skipped in the current implementation.
