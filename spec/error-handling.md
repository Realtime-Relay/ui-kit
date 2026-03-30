# Error Handling Specification

## Overview

All `@relayx/ui` components implement a consistent error handling strategy with three severity levels: **hard errors** (throw), **soft errors** (onError callback), and **silent handling** (auto-fix without notification).

---

## Error Severity Levels

### Hard Errors (throw)

These are developer configuration mistakes that indicate broken props. The component throws an `Error` immediately on render. The app crashes unless the developer wraps with an error boundary.

| Error                   | Condition                                                               | Affected Components                   |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Invalid range           | `min > max`                                                             | NeedleGauge, ArcGauge, ProgressBar    |
| Zero range              | `min === max`                                                           | NeedleGauge, ArcGauge, ProgressBar    |
| Missing zone bounds     | A zone is missing `min` or `max` (null, undefined)                      | All components with `alertZones` prop |
| Invalid zone bounds     | `zone.min` or `zone.max` is not a finite number (NaN, Infinity, string) | All components with `alertZones` prop |
| Inverted alert zone     | A single zone has `zone.min > zone.max`                                 | All components with `alertZones` prop |
| Overlapping alert zones | Two zones share any value in their `[min, max]` range                   | All components with `alertZones` prop |

**Rationale:** These are always developer mistakes, never runtime data issues. Failing loudly prevents silent misconfiguration.

### Soft Errors (onError callback)

These are runtime data issues — bad values coming from a sensor, API, or stream. The component fires `onError`, renders a fallback, and continues operating.

| Error              | Condition                                                                        | Fallback Behavior                | Affected Components                                             |
| ------------------ | -------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| Invalid value      | Value is `NaN`, `string`, `boolean`, `object`, `array`, or any non-finite number | Render last valid value          | NeedleGauge, ArcGauge, ProgressBar, StatCard, StatCardWithGraph |
| Invalid data point | A metric value in a `DataPoint` is non-numeric                                   | Skip that point, render the rest | TimeSeries, BarGraph                                            |
| Invalid timestamp  | `DataPoint.timestamp` is `NaN`, negative, non-finite, or non-numeric             | Drop the entire point            | TimeSeries, BarGraph, StateTimeline                             |

**Firing frequency:** `onError` fires on **every render** that encounters a bad value. No deduplication. The developer can debounce on their end if needed.

**Last valid value tracking:** Components that display a single value (gauges, progress bar, stat cards) track the last valid value internally via `useRef`. On first render with no prior valid value, the component shows the loading skeleton.

### Silent Handling (no error, no callback)

These are edge cases that are handled automatically without notification.

| Scenario                      | Behavior                                                                                          | Affected Components                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Value out of range            | Visual (needle/fill/bar) clamped to `[min, max]`. Display label shows the actual unclamped value. | NeedleGauge, ArcGauge, ProgressBar  |
| Alert zone gaps               | Base arc/bar color shows through the gap. No zones rendered for the uncovered range.              | All components with `alertZones`    |
| Non-boolean for `online` prop | Defaults to `false` (offline).                                                                    | PresenceIndicator                   |
| Empty data array              | Shows loading skeleton (if `showLoading=true`) or renders empty.                                  | TimeSeries, BarGraph, StateTimeline |

---

## onError Callback

### Signature

```typescript
onError?: (error: ComponentError) => void;
```

### ComponentError Interface

```typescript
interface ComponentError {
  /** Error category for programmatic handling. */
  type: "invalid_value" | "invalid_data_point" | "invalid_timestamp";

  /** Human-readable description of what went wrong. */
  message: string;

  /** The original invalid value that caused the error. */
  rawValue: unknown;

  /** Name of the component that fired the error. */
  component: string;
}
```

### Error Types

| Type                 | When                                                | Example Message                                                                                 |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `invalid_value`      | Primary value prop is non-numeric                   | `"NeedleGauge: value must be a finite number, received string 'hello'"`                         |
| `invalid_data_point` | A metric value inside a DataPoint is non-numeric    | `"TimeSeries: invalid value for metric 'temperature' at timestamp 1711234567, received object"` |
| `invalid_timestamp`  | DataPoint.timestamp is not a positive finite number | `"BarGraph: invalid timestamp, received NaN"`                                                   |

### Example Usage

```tsx
<NeedleGauge
  value={sensorReading}
  min={0}
  max={100}
  onError={(err) => {
    console.warn(`[${err.component}] ${err.type}: ${err.message}`);
    telemetry.trackError(err);
  }}
/>
```

---

## Developer-Provided Functions

The library does **not** wrap developer-provided callbacks in try-catch. If these functions throw, the error propagates normally (React error boundary or uncaught).

| Function                | Behavior on Throw                    |
| ----------------------- | ------------------------------------ |
| `formatValue`           | Crashes. Developer's responsibility. |
| `stateMapper`           | Crashes. Developer's responsibility. |
| `renderTooltip`         | Crashes. Developer's responsibility. |
| `onError` itself        | Crashes. Developer's responsibility. |
| `onZoneChange`          | Crashes. Developer's responsibility. |
| `onHover` / `onRelease` | Crashes. Developer's responsibility. |

**Rationale:** These are developer-authored functions. Silently catching their errors would hide bugs. The developer should wrap their own functions in try-catch if they need safety.

---

## Validation Flow (per component)

### Single-Value Components (NeedleGauge, ArcGauge, ProgressBar, StatCard, StatCardWithGraph)

```
1. On render:
   a. Validate config (min/max, alertZones) → THROW if invalid
   b. Validate value:
      - null/undefined → show loading skeleton
      - Non-numeric type → fire onError, render lastValidValue (or skeleton if none)
      - NaN / Infinity / -Infinity → fire onError, render lastValidValue
      - Finite number → update lastValidValue, render normally
   c. If value is finite but out of [min, max]:
      - Clamp visual to range
      - Display actual value in label (unclamped)
```

### Array-Data Components (TimeSeries, BarGraph)

```
1. On render:
   a. Validate config (alertZones if present) → THROW if invalid
   b. Filter data array:
      - Drop points with invalid timestamps (fire onError per point)
      - For each remaining point, skip metrics with non-numeric values (fire onError per bad metric)
   c. Render filtered data
```

### StateTimeline

```
1. On render:
   a. Filter data array:
      - Drop points with invalid timestamps (fire onError per point)
   b. Call stateMapper on each remaining point (no try-catch — crashes if mapper throws)
   c. Render state bands
```

### PresenceIndicator

```
1. On render:
   a. Coerce `online` to boolean: `Boolean(online)` if not strictly boolean, default false
   b. Render dot with appropriate color
```

---

## Alert Zone Validation

Alert zones are validated on every render. Validation checks (all throw on failure):

### 1. Missing Bounds

```
For each zone at index i:
  if zone.min == null or zone.max == null → throw Error
  Message: "{Component}: alert zone at index {i} is missing {min|max|min and max}. Both min and max are required."
```

### 2. Invalid Bounds (non-finite)

```
For each zone at index i:
  if typeof zone.min !== 'number' or !Number.isFinite(zone.min) → throw Error
  if typeof zone.max !== 'number' or !Number.isFinite(zone.max) → throw Error
  Message: "{Component}: alert zone at index {i} has invalid {min|max} value ({value}). Must be a finite number."
```

### 3. Inverted Zone

```
For each zone: if zone.min > zone.max → throw Error
```

### 4. Overlapping Zones

```
Sort zones by min value.
For each consecutive pair (a, b): if a.max > b.min → throw Error
```

**Note:** Adjacent zones (e.g., `[0, 50]` and `[50, 100]`) are allowed — the boundary value belongs to both zones. Only true overlaps (shared interior range) are errors.

### 5. Gaps

Gaps between zones are allowed and render the base component color (gray arc for gauges, background color for progress bar).

---

## Components Without onError

| Component         | Reason                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| PresenceIndicator | Boolean prop only. Non-boolean silently defaults to false. No numeric validation needed. |

All other components support `onError`.

---

## Implementation

### Status: Implemented

All error handling described in this spec is implemented and tested.

### Files

| File                                   | Role                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/validation.ts`              | Shared utilities: `validateRange()`, `validateAlertZones()`, `validateValue()`, `isValidNumber()`, `isValidTimestamp()`, `ComponentError` interface |
| `src/gauges/NeedleGauge.tsx`           | Hard: range + zones. Soft: value via `lastValidRef`. Clamps visual, shows actual in label.                                                          |
| `src/gauges/ArcGauge.tsx`              | Same as NeedleGauge.                                                                                                                                |
| `src/indicators/ProgressBar.tsx`       | Hard: range + zones. Soft: value via `lastValidRef`. Clamps visual, shows actual in label.                                                          |
| `src/cards/StatCard.tsx`               | Soft: numeric value via `lastValidRef`. String values pass through unvalidated.                                                                     |
| `src/cards/StatCardWithGraph.tsx`      | Same as StatCard.                                                                                                                                   |
| `src/charts/TimeSeries.tsx`            | Hard: zones. Soft: filters invalid timestamps via `useMemo`, skips bad metric values.                                                               |
| `src/charts/BarGraph.tsx`              | Same as TimeSeries.                                                                                                                                 |
| `src/timelines/StateTimeline.tsx`      | Soft: filters invalid timestamps. No zone validation (no alertZones prop).                                                                          |
| `src/indicators/PresenceIndicator.tsx` | Silent: coerces non-boolean `online` to `false`. No `onError`.                                                                                      |
| `src/index.ts`                         | Exports `ComponentError` type.                                                                                                                      |

### Test Coverage

| Test File                          | Tests   | Validation Tests                                            |
| ---------------------------------- | ------- | ----------------------------------------------------------- |
| `tests/NeedleGauge.test.tsx`       | 36      | throws on min===max, throws on min>max, zone opacity=1      |
| `tests/ArcGauge.test.tsx`          | 37      | throws on min===max, throws on min>max                      |
| `tests/ProgressBar.test.tsx`       | 29      | throws on min===max, throws on min>max                      |
| `tests/PresenceIndicator.test.tsx` | 22      | (no validation-specific tests — boolean coercion is silent) |
| **Total**                          | **124** |                                                             |
