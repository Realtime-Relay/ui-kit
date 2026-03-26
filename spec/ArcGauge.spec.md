# ArcGauge — Spec

Source: `src/gauges/ArcGauge.tsx`
Requirements: `requirements/ArcGauge.md` (not yet created)

## Component Signature

```typescript
interface ArcGaugeStyles {
  value?: FontStyle;
  label?: FontStyle;
  unit?: FontStyle;
  minMax?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  arcThickness?: number;    // default: 20
  arcAngle?: number;        // 30–300, default: 180
  width?: number;
  height?: number;
}

interface ArcGaugeProps {
  value: number;
  min?: number;              // default: 0
  max?: number;              // default: 100
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  label?: string;
  unit?: string;
  styles?: ArcGaugeStyles;
  showZoneValues?: boolean;  // default: false
  lastUpdated?: Date | number;
  showLastUpdated?: boolean; // default: false
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean;     // default: true
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}
```

## Differences from NeedleGauge

| Feature | NeedleGauge | ArcGauge |
|---|---|---|
| Visual indicator | Rotating needle line | Filled arc sweep from min to value |
| No `needleThickness` | Has it | N/A |
| Default `arcThickness` | 14 | 20 |
| Alert zone opacity | **1.0 (full)** | **0.25 (subtle)** |
| Value fill arc | None | Colored arc from start to current value |
| Value/label position | Below arc (≤180°) or below bottom (>180°) | Always centered inside the arc |

## Rendering

### Arc
- Same configurable sweep angle as NeedleGauge (30°–300°, default 180°)
- Background arc in `#e5e7eb`
- `styles.arcThickness` controls stroke width (default: 20px)
- `strokeLinecap="butt"` for clean zone boundaries

### Value Fill Arc
- A colored arc from start angle to the angle representing current value
- Uses `strokeDasharray` / `strokeDashoffset` to render partial fill
- Default color: `#3b82f6` (blue)
- When alert zones are present: fill color adopts the zone the current value falls in
- Falls back to `#3b82f6` when value doesn't fall in any zone

### Alert Zones
- Each zone renders as a colored arc segment overlaid on background
- **0.25 opacity (25%)** — more subtle than NeedleGauge since the fill arc overlays on top
- Same zone boundary calculation as NeedleGauge

### showZoneValues
- Same behavior as NeedleGauge — renders boundary values at zone transition points

### Value Display
- Always centered inside the arc (regardless of sweep angle)
- Shows formatted value + optional unit suffix
- Font styled via `styles.value`, unit via `styles.unit`

### Min/Max Labels
- Same as NeedleGauge — positioned at arc endpoints
- Font styled via `styles.minMax`

### All Other Behaviors
Same as NeedleGauge:
- Metric label (`label` prop, `styles.label`)
- Unit suffix (`unit` prop, `styles.unit`)
- Value clamping (visual clamp, text shows actual)
- Last updated timestamp (`lastUpdated`, `showLastUpdated`, `formatTimestamp`, `styles.lastUpdated`)
- Zone transition callback (`onZoneChange`)
- Font file injection (`fontFile` on any FontStyle)
- Proportional scaling (reference: 200px, `createScaler()`)
- Loading state (skeleton when value null)
- Validation (same hard/soft error handling)
- Accessibility (`role="meter"`, ARIA attributes)
