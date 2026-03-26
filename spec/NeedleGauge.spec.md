# NeedleGauge — Spec

Source: `src/gauges/NeedleGauge.tsx`
Requirements: `requirements/NeedleGauge.md` (not yet created)

## Component Signature

```typescript
interface NeedleGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number;    // default: 14
  needleThickness?: number; // default: 2.5
  arcAngle?: number;        // 30–300, default: 180
  width?: number;
  height?: number;
}

interface NeedleGaugeProps {
  value: number;
  min?: number;              // default: 0
  max?: number;              // default: 100
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: NeedleGaugeStyles;
  showZoneValues?: boolean;  // default: false
  lastUpdated?: Date | number;
  showLastUpdated?: boolean; // default: false
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean;     // default: true
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}
```

## Rendering

### Arc
- Configurable sweep angle via `styles.arcAngle` (30°–300°, default 180°)
- Background arc in `#e5e7eb`
- `styles.arcThickness` controls stroke width (default: 14px)
- `strokeLinecap="butt"` for clean zone boundaries
- For arcs ≤180°: semi-circle drawn left-to-right
- For arcs >180°: arc extends below center, text positioned below arc bottom

### Needle
- Extends from center pivot to just inside the arc edge
- Needle length = `radius - arcThickness - 8` (scaled)
- Pivot circle radius = `max(4, needleThickness * 2)` (scaled)
- Needle color matches the active alert zone; defaults to `#374151`
- Angle mapped linearly within sweep range
- `styles.needleThickness` controls stroke width (default: 2.5px)

### Alert Zones
- Each zone renders as a colored arc segment overlaid on background
- **Full opacity (1.0)** — zones are fully opaque on needle gauges
- Zone boundaries calculated as proportional ratios of the min/max range
- Uses `strokeDasharray` / `strokeDashoffset` for per-zone arc rendering
- Needle and value text color adopt the zone the current value falls in

### showZoneValues
- When `true`, renders boundary values at zone transition points on the arc
- E.g., zones [0-30, 30-70, 70-100] → shows "30" and "70" at the arc
- Positioned at the arc edge, using `getValuePosition()` + `getZoneBoundaries()`
- Font styled via `styles.minMax`
- Extra top padding added when enabled to prevent clipping

### Value Display
- Centered below the arc (≤180°) or below arc bottom (>180°)
- Shows formatted value + optional unit suffix (unit as `<tspan>`)
- `formatValue` callback applied; defaults to `defaultFormatValue` (2 decimal trim)
- Font styled via `styles.value`, unit via `styles.unit`

### Min/Max Labels
- Positioned at the left and right endpoints of the arc
- Font styled via `styles.minMax` (fontFamily, fontSize, fontWeight, color)
- Falls back to `styles.label.fontFamily`, then CSS variable
- Default color: `#9ca3af`

### Metric Label
- Optional text below the value (prop: `label`)
- Font styled via `styles.label`

### Unit Suffix
- Optional text next to the value (prop: `unit`)
- Rendered as `<tspan>` inside the value `<text>` element
- Font styled via `styles.unit`

### Value Clamping
- Needle position clamps to `[min, max]`
- Displayed text shows actual unclamped value

### Last Updated Timestamp
- `lastUpdated?: Date | number` — timestamp of last data update
- `showLastUpdated?: boolean` — toggle display, default `false`
- `formatTimestamp?: (ts: Date | number) => string` — custom formatter
- Default format: `dd MMM yyyy HH:MM:SS.sss +TZ` (e.g., "26 Mar 2026 22:39:40.123 +05:30")
- Rendered as scaled SVG text below label (or below value if no label)
- `styles.lastUpdated?: FontStyle` — font customization for timestamp text
- When `showLastUpdated=false` (default), timestamp is not rendered even if `lastUpdated` is provided

### Zone Transition Callback
- `onZoneChange` fires when value crosses a zone boundary
- Returns `{ previousZone: AlertZone | null, currentZone: AlertZone | null, value: number }`

### Font File Injection
- Any `FontStyle` with `fontFile` auto-injects `@font-face` via `resolveFont()`
- Deterministic font family name generated from URL

### Proportional Scaling
- Reference size: 200px (GAUGE_REFERENCE)
- All pixel values (padding, arc thickness, needle thickness, font sizes, gaps) scale with `Math.min(width, height) / 200`
- Uses `createScaler()` from `src/utils/scaler.ts`

### Loading State
- When `showLoading=true` and `value == null`, renders `CardSkeleton`

### Validation
- Hard errors (throw): `min > max`, `min === max`, invalid alert zones (missing min/max, non-finite, inverted, overlapping)
- Soft errors (onError): null/undefined value, non-finite number, NaN — falls back to last valid value via `useRef`
- Uses `validateRange()`, `validateAlertZones()`, `validateValue()` from `src/utils/validation.ts`

### Accessibility
- SVG has `role="meter"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` set
- `aria-label` set to `label` prop or `"Gauge"`
