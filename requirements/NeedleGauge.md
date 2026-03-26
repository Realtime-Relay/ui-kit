# NeedleGauge — Requirements

## Description
Semi-circular gauge with a rotating needle indicator. Value displayed below the arc. Used for single-metric readings like temperature, pressure, speed.

## Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| `value` | `number` | — | Yes | Current value to display |
| `min` | `number` | `0` | No | Minimum value of the gauge range |
| `max` | `number` | `100` | No | Maximum value of the gauge range |
| `formatValue` | `(value: number) => string` | `defaultFormatValue` | No | Formatter for the displayed value |
| `alertZones` | `AlertZone[]` | `[]` | No | Colored arc segments indicating ranges (warning, critical, etc.) |
| `label` | `string` | — | No | Metric label displayed below the value (e.g., "temperature") |
| `unit` | `string` | — | No | Unit suffix displayed next to value (e.g., "°C") |
| `styles` | `NeedleGaugeStyles` | — | No | Full style customization (see below) |
| `showLoading` | `boolean` | `true` | No | Show skeleton loader when value is undefined/null |

## Styles Object

```typescript
interface NeedleGaugeStyles {
  value?: FontStyle;        // Value text: fontFamily, fontSize, fontWeight, color, fontFile
  label?: FontStyle;        // Metric label text: fontFamily, fontSize, fontWeight, color, fontFile
  unit?: FontStyle;         // Unit text: fontFamily, fontSize, fontWeight, color, fontFile
  background?: { color?: string };
  arcThickness?: number;    // Arc stroke width in pixels (default: 14)
  needleThickness?: number; // Needle stroke width in pixels (default: 2)
  width?: number;           // Explicit width (default: fill container)
  height?: number;          // Explicit height (default: fill container)
}
```

## FontStyle (shared)

```typescript
interface FontStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  fontFile?: string;  // URL or path to .otf/.ttf file — auto-generates @font-face
}
```

## Behavior

### Value Clamping
- Values below `min` render as `min` on the gauge (needle at far left)
- Values above `max` render as `max` on the gauge (needle at far right)
- The displayed label always shows the actual value (not clamped), so users can see out-of-range values

### Alert Zones
- Rendered as colored arc segments overlaid on the background arc
- 50% opacity so background arc is visible through them
- Needle color matches the active alert zone (the zone the current value falls in)
- If no alert zone matches, needle uses default color (#374151)
- Zones can overlap — later zones render on top

### Font File Injection
- When `fontFile` is provided in any FontStyle, the component auto-generates a `@font-face` rule
- Uses a deterministic font family name based on the file URL
- The `@font-face` is injected into the document `<head>` once and reused
- Supports `.otf`, `.ttf`, `.woff`, `.woff2` files

### Sizing
- By default, fills parent container (responsive via ResizeObserver)
- If `styles.width` and/or `styles.height` are set, uses those as explicit dimensions
- When explicit dimensions are set, component is still responsive up to those maximums
- Minimum practical size: 100x80px

### Loading State
- When `showLoading` is true and value is undefined/null, shows a skeleton arc
- Skeleton uses shimmer animation matching the library's skeleton pattern

## Visual Layout

```
        ┌─── alert zone arcs (colored segments) ───┐
        │                                           │
     ╭──────────────────────────────────╮
    ╱    ●  zone1   ●  zone2   ●  zone3  ╲
   │                                       │
   │              ╱ (needle)               │
   │            ╱                           │
   ├──── ● ──╱─────────────────────────────┤
   min      pivot                         max

                  90.21 °C          ← value + unit
                 temperature        ← label
```

## Accessibility
- `role="meter"` on the root element
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- `aria-label` set to label prop if provided
