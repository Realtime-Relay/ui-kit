# StatCard — Component Specification

Source: `src/cards/StatCard.tsx`
Requirements: `requirements/StatCard.md`

## Component Signature

```typescript
interface StatCardStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

interface StatCardProps {
  value: any;
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
  lastUpdatedMargin?: number;
  showLoading?: boolean;
  onError?: (error: ComponentError) => void;
}
```

## Rendering

### Layout
- Vertical flex column, centered content
- Order: label → value → timestamp (top to bottom)
- Fills container (width/height: 100%) unless `styles.width` / `styles.height` set

### Value Display
| Input Type | No formatValue | With formatValue |
|---|---|---|
| number | `defaultFormatValue(value)` → "23.46" | `formatValue(value)` |
| string | `String(value)` → "Running" | `formatValue(value)` |
| boolean | `String(value)` → "true" | `formatValue(value)` |
| object | `JSON.stringify(value)` → '{"temp":23.5}' | `formatValue(value)` |
| null/undefined | Loading skeleton or last value | N/A |

### Alert Zone Coloring
- Zone evaluated against `numericValue` if provided, else `value` if numeric
- Zone color applied to: value text, label text, timestamp text
- `styles.*.color` overrides zone color per element
- If value is non-numeric and no `numericValue` → zones ignored

### Timestamp
- Default format: `dd MMM yyyy HH:MM:SS.sss +TZ` via `defaultFormatTimestamp`
- Custom format via `formatTimestamp` callback
- Hidden by default (`showLastUpdated=false`)

### Loading State
- When `showLoading=true` and value is null/undefined → shimmer skeleton
- Skeleton respects `styles.width`, `styles.height`, `borderRadius`

## Proportional Scaling
- Reference: 300px width
- Scaled properties: padding (16), value fontSize (32), label fontSize (13), timestamp fontSize (11), margins
- Uses ResizeObserver for container measurement

## Validation
- null/undefined → retain last value + fire onError
- Alert zones: throws on missing min/max, non-finite bounds, inverted, overlapping

## Font File Injection
- Any `FontStyle` with `fontFile` auto-injects `@font-face` via `resolveFont()`

## Accessibility
- Container is a `div` with centered text
- No special ARIA roles (it's a display card, not an interactive widget)
