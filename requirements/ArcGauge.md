# ArcGauge — Requirements

## Description
Grafana-style filled arc gauge with value displayed at the center. The arc fills from left to right proportional to the current value. Used for progress-style readings, percentages, and single-metric displays.

## Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `value` | `number` | — | Yes | Current value to display |
| `min` | `number` | `0` | No | Minimum value of the gauge range |
| `max` | `number` | `100` | No | Maximum value of the gauge range |
| `formatValue` | `(value: number) => string` | `defaultFormatValue` | No | Formatter for the displayed value |
| `alertZones` | `AlertZone[]` | `[]` | No | Colored arc segments indicating ranges |
| `label` | `string` | — | No | Metric label displayed below the unit |
| `unit` | `string` | — | No | Unit suffix displayed below value |
| `styles` | `ArcGaugeStyles` | — | No | Full style customization (see below) |
| `showLoading` | `boolean` | `true` | No | Show skeleton loader when value is undefined/null |

## Styles Object

```typescript
interface ArcGaugeStyles {
  value?: FontStyle;        // Value text: fontFamily, fontSize, fontWeight, color, fontFile
  label?: FontStyle;        // Metric label text: fontFamily, fontSize, fontWeight, color, fontFile
  unit?: FontStyle;         // Unit text: fontFamily, fontSize, fontWeight, color, fontFile
  background?: { color?: string };
  arcThickness?: number;    // Arc stroke width in pixels (default: 20)
  width?: number;           // Explicit width (default: fill container)
  height?: number;          // Explicit height (default: fill container)
}
```

## Behavior

### Value Clamping
- Values below `min` render as `min` on the gauge (no fill)
- Values above `max` render as `max` on the gauge (full fill)
- The displayed label always shows the actual value (not clamped)

### Value Fill Arc
- Colored arc that fills from left (min) to the position representing current value
- Fill color determined by which alert zone the value falls in
- If no alert zone matches, fill uses default blue (#3b82f6)

### Alert Zones
- Rendered as colored arc segments overlaid on the background arc
- 25% opacity so background and fill arc are visible
- Fill arc color automatically matches the active zone
- Zones can overlap — later zones render on top

### Font File Injection
- Same behavior as NeedleGauge — auto-generates @font-face from fontFile URLs

### Sizing
- By default, fills parent container (responsive via ResizeObserver)
- If `styles.width` and/or `styles.height` are set, uses those as explicit dimensions
- Minimum practical size: 100x80px

### Loading State
- Same skeleton behavior as NeedleGauge

## Visual Layout

```
        ┌─── alert zone arcs (colored segments) ───┐
        │                                           │
     ╭══════════════════────────────────╮
    ║    ●  zone1   ●  zone2   ●  zone3  ╲
   ║                                       │
   ║          90.21                         │  ← value centered at arc center
   ║            °C                          │  ← unit below value
   ╠═══════════════════════════════════════╡
   min           temperature              max  ← label below unit
```

═ = filled arc portion
─ = unfilled background arc

## Accessibility
- `role="meter"` on the root element
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- `aria-label` set to label prop if provided
