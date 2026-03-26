# ProgressBar — Requirements

## Purpose
A horizontal or vertical progress bar that visualizes a numeric value within a range. Supports alert zone coloring, custom fonts (including .otf/.ttf file imports), responsive sizing, and real-time data integration.

## Functional Requirements

### FR-1: Value Display
- **FR-1.1**: Accept a numeric `value` prop (required)
- **FR-1.2**: Accept `min` and `max` props defining the range (default: 0–100)
- **FR-1.3**: Fill bar width/height represents `value` as a percentage of the range
- **FR-1.4**: Fill is clamped to [0%, 100%] when value exceeds the range
- **FR-1.5**: Label displays the **raw value** (unclamped) even when value exceeds min/max — the bar caps but the label shows the actual number

### FR-2: Label
- **FR-2.1**: Show a centered text label with the formatted value by default
- **FR-2.2**: Accept `showLabel` boolean to show/hide the label (default: true)
- **FR-2.3**: Accept `formatValue` callback `(value: number) => string` for custom formatting
- **FR-2.4**: Label text color automatically switches to white when fill exceeds 50%
- **FR-2.5**: Label has `pointerEvents: none` so it doesn't block tooltip hover

### FR-3: Orientation
- **FR-3.1**: Accept `orientation` prop: `'horizontal'` (default) or `'vertical'`
- **FR-3.2**: Horizontal: fill grows left-to-right, zones positioned left-to-right
- **FR-3.3**: Vertical: fill grows bottom-to-top, zones positioned bottom-to-top

### FR-4: Alert Zones
- **FR-4.1**: Accept `alertZones` array of `{ min: number, max: number, color: string, label?: string }`
- **FR-4.2**: When zones are provided, render transparent (15% opacity) colored bands in the background showing each zone's range
- **FR-4.3**: Fill bar color is determined by which zone the current value falls in
- **FR-4.4**: If value doesn't fall in any zone, fill uses default color (`--relay-progress-fill` or #3b82f6)
- **FR-4.5**: Zone bands are behind the fill bar (z-index layering: zones → fill → label → tooltip)
- **FR-4.6**: Fill bar is fully opaque — no color mixing with zone bands underneath
- **FR-4.7**: Accept `showAlertZones` boolean to show/hide zone bands (default: true when zones provided)
- **FR-4.8**: When `showAlertZones=false`, zones are hidden but fill color still uses zone-based coloring

### FR-5: Alert Zone Tooltips
- **FR-5.1**: Each alert zone has a native browser tooltip (HTML `title` attribute) on hover
- **FR-5.2**: Tooltip text format: `"Label: min – max"` if label exists, otherwise `"min – max"`
- **FR-5.3**: Tooltip hit areas are transparent overlays on top of all other layers (z-index: 4) so they work even over the fill bar

### FR-6: Styling
- **FR-6.1**: `styles.background.color` — custom background color for the track
- **FR-6.2**: `styles.width` — custom width (number for px, string for CSS units). Responsive: `maxWidth: 100%`
- **FR-6.3**: `styles.height` — custom height (number for px, string for CSS units)
- **FR-6.4**: `styles.label_font_file` — FontStyle object for the label text
  - `fontFamily`: CSS font-family string OR a font file path (.otf/.ttf/.woff/.woff2). File paths are auto-loaded via `@font-face` injection.
  - `fontSize`: number (pixels)
  - `fontWeight`: number or string
  - `color`: CSS color string

### FR-7: Font Auto-Loading
- **FR-7.1**: When `styles.label_font_file.fontFamily` is a path ending in `.otf`, `.ttf`, `.woff`, or `.woff2`, auto-generate a `@font-face` rule
- **FR-7.2**: Inject the `@font-face` into `document.head` as a `<style>` element
- **FR-7.3**: Cache loaded fonts — same URL is only injected once
- **FR-7.4**: Use `font-display: swap` for non-blocking font loading
- **FR-7.5**: If the value is not a font file path, treat it as a normal CSS font-family string

### FR-8: Loading State
- **FR-8.1**: Accept `showLoading` boolean (default: true)
- **FR-8.2**: When `showLoading=true` and `value` is null/undefined, render an animated skeleton shimmer
- **FR-8.3**: Skeleton respects custom width/height from styles

### FR-9: Animation
- **FR-9.1**: Fill bar transitions width/height changes over 300ms ease
- **FR-9.2**: Fill bar transitions background-color changes over 300ms ease (when crossing zone boundaries)
- **FR-9.3**: Label color transitions over 300ms ease (dark ↔ white)

## Non-Functional Requirements

### NFR-1: Theming (CSS Variables)
- `--relay-progress-height`: default bar height (default: 24px)
- `--relay-progress-bg`: track background color (default: #e5e7eb)
- `--relay-progress-fill`: default fill color when no zones (default: #3b82f6)
- `--relay-progress-border-radius`: border radius (default: 4px)
- `--relay-font-family`: default font family
- `--relay-skeleton-base` / `--relay-skeleton-shine`: skeleton animation colors

### NFR-2: Responsiveness
- Default width: 100% of parent container
- Custom widths via `styles.width` are capped at `maxWidth: 100%` to prevent overflow
- Works correctly in flex and grid layouts

### NFR-3: Z-Index Layering
Four explicit layers inside the component:
1. `z0`: Alert zone background bands (transparent)
2. `z1`: Solid fill bar (opaque)
3. `z3`: Label text
4. `z4`: Invisible tooltip hit areas

## RelayX SDK Integration

### SDK-1: useRelayLatest Hook
- Use `useRelayLatest(deviceIdent, metric)` to get the current value
- Returns `{ value: number | null, timestamp: number | null, isLoading, error }`
- Value updates in real-time as telemetry streams in

## Props Interface

```typescript
interface ProgressBarStyles {
  label_font_file?: FontStyle;     // font styling + auto-loading
  background?: BackgroundStyle;     // { color?: string }
  width?: string | number;          // custom width
  height?: string | number;         // custom height
}

interface ProgressBarProps {
  value: number;                    // required
  min?: number;                     // default: 0
  max?: number;                     // default: 100
  orientation?: 'horizontal' | 'vertical';  // default: 'horizontal'
  showLabel?: boolean;              // default: true
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  showAlertZones?: boolean;         // default: true when zones provided
  styles?: ProgressBarStyles;
  showLoading?: boolean;            // default: true
}
```
