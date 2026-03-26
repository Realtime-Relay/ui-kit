# NeedleGauge — Spec

## Component Behavior

### Rendering
- Renders an SVG semi-circular arc gauge with a rotating needle
- Fills parent container by default (responsive via ResizeObserver)
- When `styles.width` / `styles.height` are set, uses explicit dimensions (still responsive, capped at those sizes)
- Minimum practical size: 100x80px

### Needle
- Extends from the center pivot point to just inside the arc edge
- Needle length = `radius - arcThickness - 8`
- Pivot circle radius = `max(4, needleThickness * 2)`
- Needle color matches the active alert zone; defaults to `#374151`
- Angle mapped linearly: `min` → far left (π radians), `max` → far right (0 radians)

### Arc
- Semi-circle (180°) drawn left-to-right
- Background arc in `#e5e7eb`
- `styles.arcThickness` controls stroke width (default: 14px)
- `strokeLinecap="butt"` for clean zone boundaries

### Alert Zones
- Each zone renders as a colored arc segment overlaid on background
- 50% opacity
- Zone boundaries calculated as proportional ratios of the min/max range
- Zones can overlap; later zones render on top
- Needle color adopts the zone the current value falls in

### Value Display
- Centered below the arc
- Shows formatted value + optional unit suffix (unit as `<tspan>`)
- `formatValue` callback applied; defaults to `defaultFormatValue`

### Min/Max Labels
- Positioned at the left and right endpoints of the arc baseline
- Font follows `styles.label.fontFamily`; defaults to CSS variable
- Color: `#9ca3af`

### Metric Label
- Optional text below the value
- Font customizable via `styles.label`

### Value Clamping
- Needle position clamps to `[min, max]`
- Displayed text shows actual unclamped value

### Font File Injection
- Any `FontStyle` with `fontFile` auto-injects `@font-face` via `resolveFont()`
- Deterministic font family name generated from URL

### Loading State
- When `showLoading=true` and `value == null`, renders `CardSkeleton`

### Accessibility
- SVG has `role="meter"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` set
- `aria-label` set to `label` prop or `"Gauge"`
