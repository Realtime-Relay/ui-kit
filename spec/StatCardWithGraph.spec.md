# StatCardWithGraph — Component Specification

Source: `src/cards/StatCardWithGraph.tsx`
Requirements: `requirements/StatCardWithGraph.md`

## Component Signature

```typescript
interface StatCardWithGraphStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

interface StatCardWithGraphProps {
  // -- Display --
  value: any;
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;

  // -- Sparkline --
  sparklineData?: any[];
  sparklineExtractor?: (point: any) => number;
  sparklineWindow?: number;  // ms, default 30000
  graphLineColor?: string;   // default '#3b82f6'

  // -- Alert Zones --
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;

  // -- Timestamp --
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
  lastUpdatedMargin?: number;

  // -- Border --
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;

  // -- Styles --
  styles?: StatCardWithGraphStyles;

  // -- Loading / Errors --
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}
```

## Rendering

### Layout
- Relative positioned container with `overflow: hidden`
- Sparkline SVG positioned absolutely at bottom (60% height)
- Content overlay (label, value, timestamp) centered on top of sparkline (z-index: 1)

### Sparkline Rendering
- Only renders when `sparklineData` has 2+ points AND `sparklineExtractor` is provided
- If `sparklineData` provided without `sparklineExtractor` → console.warn, skip sparkline
- SVG with `preserveAspectRatio="none"` fills bottom 60% of card
- Line: stroke with opacity 0.5
- Area fill: opacity 0.15 below the line
- Stroke width scales proportionally with container

### Sparkline Time Window
- Default: 30000ms (30 seconds)
- Only points within `[latestTimestamp - sparklineWindow, latestTimestamp]` are rendered
- `latestTimestamp` = max timestamp in `sparklineData`
- Points outside window are excluded from the SVG path
- Window only advances when `sparklineData` prop changes (no continuous scroll)

### Sparkline Data Extraction
- `sparklineExtractor(point)` called for each data point
- Must return a finite number
- NaN or non-finite returns → that point is silently skipped
- Timestamps extracted from `point.timestamp` (must be a number, ms epoch)

### Alert Zone Coloring
- Same as StatCard: evaluated against `numericValue` (or numeric `value`)
- Zone color also applies to sparkline: replaces `graphLineColor` with zone color
- Exception: if developer explicitly set `graphLineColor`, it takes priority over zone color
- `styles.*.color` overrides zone color for text elements

### Value Display
- Same as StatCard — see StatCard.spec.md

### Timestamp
- Same as StatCard — `defaultFormatTimestamp` + `formatTimestamp` callback

### Loading State
- When `showLoading=true` and value is null/undefined → shimmer skeleton
- No sparkline shown during loading

## Proportional Scaling
- Reference: 300px width
- Scaled: padding (16), value fontSize (32), label fontSize (13), timestamp fontSize (11), sparkline strokeWidth (2), margins

## Validation
- Same as StatCard for value/numericValue/alertZones
- `sparklineData` without `sparklineExtractor` → console.warn
- Invalid extractor return values → silently skip point

## Zone Transition Callback
- `onZoneChange` fires when `numericValue` (or numeric `value`) crosses a zone boundary
- Same `ZoneTransition` type as gauges: `{ previousZone, currentZone, value }`
