# StatCard — Requirements

## Purpose and Use Case

StatCard displays a single value prominently with an optional label and timestamp. It is the primary widget for showing the latest reading from a sensor, current device status, a computed metric, or any single data point on an IoT dashboard. The card accepts values of any JavaScript type (number, string, boolean, object, null) and applies type-aware formatting before display.

StatCard is designed to be embedded in dashboard grid layouts where each cell represents one metric. It scales all visual elements proportionally to fit any container size, from a small 80px-wide mobile tile to a large desktop widget.

---

## Props

### Data Props

| Prop           | Type                     | Default | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------ | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`        | `any`                    | —       | Yes      | The value to display. Accepts any JavaScript type. When `null` or `undefined`, the component enters its null-value handling flow (loading skeleton or last-valid retention). See **Value Handling** below for the full formatting chain per type.                                                                                                                                                                                                                          |
| `numericValue` | `number`                 | —       | No       | Explicit numeric value used for alert zone evaluation. When provided, this value is checked against `alertZones` instead of `value`. This allows displaying a formatted string as `value` (e.g., `"23.5 C"`) while still triggering zone-based coloring from the raw number. If omitted, the component falls back to `value` itself only when `value` is of type `number`. If `value` is non-numeric and `numericValue` is not provided, alert zones are ignored entirely. |
| `label`        | `string`                 | —       | No       | Label text rendered above the value. Typically the metric name (e.g., "Temperature", "CPU Usage"). Omit to hide the label row.                                                                                                                                                                                                                                                                                                                                             |
| `formatValue`  | `(value: any) => string` | —       | No       | Custom formatter callback. Receives the current `renderValue` (never null/undefined) and must return a display string. When provided, it completely replaces the default formatting chain. When omitted, the component uses `defaultDisplayFormat` (see **Value Handling**).                                                                                                                                                                                               |

### Timestamp Props

| Prop                | Type                             | Default                  | Description                                                                                                                                                                                                                                 |
| ------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lastUpdated`       | `Date \| number`                 | —                        | Timestamp of the most recent data update. Accepts a `Date` object or a Unix epoch number (milliseconds).                                                                                                                                    |
| `showLastUpdated`   | `boolean`                        | `false`                  | Controls visibility of the timestamp row. When `false` (default), the timestamp is not rendered even if `lastUpdated` is provided. Both `showLastUpdated === true` AND `lastUpdated != null` must be satisfied for the timestamp to appear. |
| `formatTimestamp`   | `(ts: Date \| number) => string` | `defaultFormatTimestamp` | Custom timestamp formatter. Default output format: `dd MMM yyyy HH:MM:SS.sss +TZ` (e.g., `"26 Mar 2026 22:39:40.123 +05:30"`). The default converts epoch numbers to `Date` internally before formatting.                                   |
| `lastUpdatedMargin` | `number`                         | `8`                      | Margin above the timestamp row in reference pixels. This value is scaled proportionally with the container (e.g., at 150px container width, `8` becomes `4`).                                                                               |

### Alert Zone Props

| Prop           | Type                                   | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | -------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alertZones`   | `AlertZone[]`                          | `[]`    | Array of alert zone definitions. Each zone has `min` (number), `max` (number), `color` (string), and optional `label` (string). Zones are validated on every render: missing `min`/`max`, non-finite bounds, inverted ranges (`min > max`), and overlapping zones all throw hard errors. Touching zones (where `a.max === b.min`) are allowed.                                                                                                                                                                                                                                          |
| `onZoneChange` | `(transition: ZoneTransition) => void` | —       | Callback fired when the evaluated numeric value crosses from one zone to another (or enters/exits a zone). The `ZoneTransition` object contains `{ previousZone: AlertZone \| null, currentZone: AlertZone \| null, value: number }`. On first render, the zone is initialized silently without firing the callback. Subsequent zone changes fire the callback. Zone identity is compared by `min`, `max`, and `color` fields (not by reference). Only fires when `zoneNumeric` is non-null; if `onZoneChange` is provided but no numeric value is available, the callback is disabled. |

**Zone color propagation:** When the evaluated numeric value falls within a zone, `zone.color` is applied to:

- Value text color
- Label text color
- Timestamp text color

**Zone color override:** If `styles.value.color`, `styles.label.color`, or `styles.lastUpdated.color` is explicitly set, the explicit color takes priority over the zone color for that specific element. Zone color only applies to elements that have no explicit color.

### Styling Props

| Prop                 | Type               | Default  | Description                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles.value`       | `FontStyle`        | —        | Styling for the value text. `FontStyle` includes `fontFamily`, `fontSize` (number, px), `fontWeight` (number or string), `color` (CSS color string), and `fontFile` (URL to .otf/.ttf/.woff/.woff2 for auto `@font-face` injection). When `fontSize` is provided, it is used as-is (not scaled). When omitted, the default `s(32)` (32px at reference) is used and scales proportionally. |
| `styles.label`       | `FontStyle`        | —        | Styling for the label text. Same `FontStyle` fields. Default font size when omitted: `s(13)`. Default font weight: `400`. Default color: `#6b7280` (gray).                                                                                                                                                                                                                                |
| `styles.lastUpdated` | `FontStyle`        | —        | Styling for the timestamp text. Default font size when omitted: `s(11)`. Default font weight: `400`. Default color: `#9ca3af` (light gray).                                                                                                                                                                                                                                               |
| `styles.background`  | `BackgroundStyle`  | —        | Background styling. `BackgroundStyle` has a single `color` field. Default: `transparent`.                                                                                                                                                                                                                                                                                                 |
| `styles.width`       | `string \| number` | `'100%'` | Explicit width. Numbers are converted to `px` strings (e.g., `300` becomes `"300px"`). Strings are passed through as-is (e.g., `"50%"`, `"20rem"`). Default: `'100%'` (fills parent).                                                                                                                                                                                                     |
| `styles.height`      | `string \| number` | `'100%'` | Explicit height. Same conversion rules as `width`. Default: `'100%'`.                                                                                                                                                                                                                                                                                                                     |

### Border Props

| Prop              | Type                             | Default     | Description                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `borderRadius`    | `number \| 'rounded' \| 'sharp'` | `'rounded'` | Corner radius mode. `'rounded'`: uses CSS variable `var(--relay-border-radius, 8px)`. `'sharp'`: `0` (no rounding). `number`: explicit pixel value (e.g., `12` becomes `"12px"`). When omitted/undefined, defaults to `'rounded'` behavior. |
| `borderColor`     | `string`                         | —           | Border color. When provided (alone or with `borderThickness`), a CSS border is rendered. Default border color when `borderThickness` is set but `borderColor` is omitted: `var(--relay-border-color, #e0e0e0)`.                             |
| `borderThickness` | `number`                         | —           | Border width in pixels. Default when `borderColor` is set but `borderThickness` is omitted: `1`. The border is only rendered when at least one of `borderColor` or `borderThickness` is provided.                                           |

### Loading and Error Props

| Prop          | Type                              | Default | Description                                                                                                                                                                                                                                                                                                                            |
| ------------- | --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showLoading` | `boolean`                         | `true`  | When `true` and the resolved `renderValue` is `null` (i.e., no value has ever been provided), a skeleton shimmer placeholder is rendered. When `false`, null values are silently handled (last valid value retained, `onError` still fires).                                                                                           |
| `onError`     | `(error: ComponentError) => void` | —       | Called whenever `value` is `null` or `undefined`. The `ComponentError` object has `{ type: 'invalid_value', message: string, rawValue: unknown, component: 'StatCard' }`. The last valid value is retained in a ref and continues to display. `onError` fires on every render where value is null/undefined (not just the first time). |

---

## Value Handling

### Any-Type Support

StatCard accepts `value` of any JavaScript type. The value passes through a formatting chain to produce the final display string.

### Null/Undefined Detection

Before formatting, the component checks if `value` is `null` or `undefined`:

1. If non-null/non-undefined, store in `lastValidRef.current` (the "last valid value").
2. If null/undefined, fire `onError` with the appropriate message, and set `renderValue` to `lastValidRef.current`.
3. `renderValue` is used for all subsequent formatting and display.

### Formatting Chain

The display string is produced as follows:

```
renderValue → formatValue(renderValue)           [if formatValue prop provided]
renderValue → defaultDisplayFormat(renderValue)   [if formatValue prop NOT provided]
```

`defaultDisplayFormat` applies type-specific logic:
| Type | Logic | Example Output |
|---|---|---|
| `null` / `undefined` | Returns `''` (empty string) | `""` |
| `number` | Calls `defaultFormatValue(value)` which shows up to 2 decimal places with trailing zero trimming. Integers display without decimals. | `23`, `23.46`, `0.1` |
| `object` (including arrays) | `JSON.stringify(value)` | `'{"temp":23.5}'` |
| `string`, `boolean`, other primitives | `String(value)` | `"Running"`, `"true"` |

### Numeric Detection for Zones

The component determines the numeric value for zone evaluation:

```
zoneNumeric = numericValue ?? (typeof renderValue === 'number' ? renderValue : null)
```

If `zoneNumeric` is `null`, all zone evaluation is skipped.

---

## Alert Zone Evaluation

1. `validateAlertZones(alertZones, 'StatCard')` runs on every render when `alertZones.length > 0`. Throws on: missing `min`/`max`, non-finite bounds, inverted ranges, overlapping zones.
2. `zoneNumeric` is computed (see above). If null, no zone color is applied.
3. `getZoneColor(zoneNumeric, alertZones)` iterates zones in array order and returns the `color` of the first zone where `value >= zone.min && value <= zone.max`. Returns `null` if no zone matches.
4. The resulting `zoneColor` is applied to value, label, and timestamp text as a fallback color (only when the element's explicit `styles.*.color` is not set).
5. `useZoneTransition` hook tracks zone changes between renders and fires `onZoneChange` when the zone identity (compared by `min`, `max`, `color`) changes.

---

## Border Configuration

The `resolveBorderRadius` function converts the `borderRadius` prop to a CSS string:

- `'sharp'` returns `'0'`
- `'rounded'` (or `undefined`) returns `'var(--relay-border-radius, 8px)'`
- A number `n` returns `'${n}px'`

The border itself (outline) is only rendered when `borderColor` or `borderThickness` is truthy. The CSS `border` shorthand is constructed as:

```
`${borderThickness ?? 1}px solid ${borderColor ?? 'var(--relay-border-color, #e0e0e0)'}`
```

---

## Loading Skeleton Behavior and Animation

When `showLoading === true` AND `renderValue === null` (no value has ever been provided):

- The entire card is replaced by a skeleton shimmer div.
- The skeleton div respects `styles.width`, `styles.height`, and `borderRadius`.
- Background: a horizontal linear gradient using CSS variables:
  - `var(--relay-skeleton-base, #e5e7eb)` at 25% and 75%
  - `var(--relay-skeleton-shine, #f3f4f6)` at 50%
- `backgroundSize: '200% 100%'` enables the shimmer sweep.
- Animation: `relay-skeleton-shimmer 1.5s ease-in-out infinite` (a `@keyframes` that translates `background-position` from `200% 0` to `-200% 0`).
- The skeleton div still has `ref={containerRef}` attached so that ResizeObserver can start measuring immediately.

Once a valid value arrives, the skeleton is replaced by the normal card content (no crossfade animation).

---

## Proportional Scaling (Responsive Behavior)

- **Reference size:** `STAT_REFERENCE = 300` (px width).
- A `ResizeObserver` is attached to the container div on mount. It measures `contentRect.width` and `contentRect.height`, rounds both to integers, and updates state only when the rounded values differ from the previous state (dedup to prevent render loops).
- `createScaler(dims.width, dims.height, 300, 'width')` creates a scaler function `s(px)` that multiplies any pixel value by `dims.width / 300`.
- Scaled properties and their reference values:
  - Container padding: `s(16)` (16px at 300px)
  - Value font size: `s(32)` (32px at 300px)
  - Label font size: `s(13)` (13px at 300px)
  - Label bottom margin: `s(4)` (4px at 300px)
  - Timestamp font size: `s(11)` (11px at 300px)
  - Timestamp top margin: `s(lastUpdatedMargin)` (default 8px at 300px)

---

## Last Updated Display Rules

The timestamp row renders only when ALL of these conditions are true:

1. `showLastUpdated === true`
2. `lastUpdated != null` (not null and not undefined; uses loose equality `!=` so both are excluded)

When rendered, the display string is `formatTimestamp(lastUpdated)`. The default `defaultFormatTimestamp` converts epoch numbers to `Date` objects, then formats as `dd MMM yyyy HH:MM:SS.sss +TZ`.

---

## Error Handling

### Null/Undefined Values

- `onError` fires on every render where `value` is `null` or `undefined`.
- The error object: `{ type: 'invalid_value', message: 'StatCard: value is null.' | 'StatCard: value is undefined.', rawValue: null | undefined, component: 'StatCard' }`.
- The last valid value (stored in `lastValidRef`) continues to display.
- If no valid value has ever been received, `renderValue` remains `null`, which triggers the loading skeleton (if `showLoading` is true) or displays an empty string.

### Alert Zone Validation Errors

- `validateAlertZones` throws a descriptive `Error` on invalid zone configuration. This is a hard error (not caught internally) and will propagate to the nearest React error boundary.
- Validation checks: missing `min`/`max`, non-finite bounds, inverted ranges (`min > max`), overlapping zones (sorted by `min`, checked pairwise where `a.max > b.min`).

### Font File Resolution

- If `fontFile` is an invalid URL or the file fails to load, the `@font-face` declaration is injected but the browser falls back to the next font in the stack. No error is surfaced to the component.

---

## Font File Injection

Any `FontStyle` with a `fontFile` property triggers automatic `@font-face` injection via `resolveFont()`. The function calls `resolveFontFamily(fontFile)` which generates a deterministic family name from the URL, injects a `<style>` element into the document head (idempotent — only once per URL), and returns the generated family name. The resolved family name replaces `fontFamily` in the style object.
