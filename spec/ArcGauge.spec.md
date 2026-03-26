# ArcGauge — Spec

## Component Behavior

### Rendering
- Renders an SVG semi-circular arc gauge with a filled progress arc
- Fills parent container by default (responsive via ResizeObserver)
- When `styles.width` / `styles.height` are set, uses explicit dimensions (still responsive, capped at those sizes)
- Minimum practical size: 100x80px

### Value Fill Arc
- Colored arc that fills from left (min) to the position representing current value
- Fill color determined by alert zone the value falls in; defaults to `#3b82f6`
- Same stroke width as the background arc (`styles.arcThickness`, default: 20px)
- `strokeLinecap="butt"` for clean boundaries

### Background Arc
- Semi-circle (180°) drawn left-to-right
- Color: `#e5e7eb`
- `styles.arcThickness` controls stroke width (default: 20px)

### Alert Zones
- Each zone renders as a colored arc segment overlaid on background
- 25% opacity (more subtle than NeedleGauge)
- Zone boundaries calculated as proportional ratios of the min/max range
- Fill arc color adopts the zone the current value falls in

### Value Display
- Centered at the arc center point (inside the arc)
- Large font, bold (default: 26px, weight 700)
- Color matches the fill arc color
- `formatValue` callback applied

### Unit
- Displayed below the value inside the arc
- Smaller font (default: 13px), color `#6b7280`

### Metric Label
- Optional text below the unit
- Font customizable via `styles.label`

### Min/Max Labels
- Positioned at the left and right endpoints of the arc baseline
- Color: `#9ca3af`

### Value Clamping
- Fill arc clamps to `[min, max]`
- Displayed text shows actual unclamped value

### Font File Injection
- Same behavior as NeedleGauge

### Loading State
- When `showLoading=true` and `value == null`, renders `CardSkeleton`

### Accessibility
- SVG has `role="meter"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` set
- `aria-label` set to `label` prop or `"Gauge"`
