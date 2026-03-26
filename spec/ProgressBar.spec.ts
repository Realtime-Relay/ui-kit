/**
 * ProgressBar — Component Specification
 * =======================================
 *
 * Source: src/indicators/ProgressBar.tsx
 * Requirements: requirements/ProgressBar.md
 * Tests: tests/ProgressBar.test.tsx (unit), e2e/progress-bar.spec.ts (Playwright)
 *
 * ## Component Signature
 *
 * ```tsx
 * <ProgressBar
 *   value={number}
 *   min?: number                    // default: 0
 *   max?: number                    // default: 100
 *   orientation?: 'horizontal' | 'vertical'  // default: 'horizontal'
 *   showLabel?: boolean             // default: true
 *   formatValue?: (v: number) => string
 *   alertZones?: AlertZone[]
 *   showAlertZones?: boolean        // default: true when zones provided
 *   styles?: ProgressBarStyles
 *   lastUpdated?: Date | number
 *   showLastUpdated?: boolean       // default: false
 *   formatTimestamp?: (ts: Date | number) => string
 *   showLoading?: boolean           // default: true
 *   onZoneChange?: (transition: ZoneTransition) => void
 *   onError?: (error: ComponentError) => void
 * />
 * ```
 *
 * ## Internal DOM Structure (4-layer z-index system)
 *
 * ```
 * <div>  ← container (track)
 *   <div z0 />  ← alert zone bands (transparent, 15% opacity)
 *   <div z1 />  ← fill bar (fully opaque, solid color)
 *   <span z3 /> ← label text
 *   <div z4 />  ← invisible tooltip hit areas
 * </div>
 * ```
 *
 * ### Why 4 layers?
 * - Zone bands must be visible in the unfilled area but NOT mix colors with the fill
 * - Fill bar is fully opaque and covers zone bands underneath
 * - Label must be above the fill bar
 * - Tooltip hit areas must be on top of everything including the fill bar
 *
 * ## Value Clamping vs Label Display
 *
 * | value | min | max | fill width | label text (default) |
 * |-------|-----|-----|------------|---------------------|
 * | 50    | 0   | 100 | 50%        | "50"                |
 * | 150   | 0   | 100 | 100%       | "150" (raw value)   |
 * | -10   | 0   | 100 | 0%         | "-10" (raw value)   |
 * | 500   | 0   | 1000| 50%        | "500"               |
 *
 * Fill clamps to range. Label always shows raw value via formatValue(value).
 *
 * ## Alert Zone Color Resolution
 *
 * ```
 * for each zone in alertZones:
 *   if value >= zone.min && value <= zone.max:
 *     return zone.color
 * return fallback ('--relay-progress-fill' or #3b82f6)
 * ```
 *
 * First matching zone wins. Zones should not overlap.
 *
 * ## Alert Zone Background Bands
 *
 * When alertZones provided and showAlertZones !== false:
 * - Each zone renders a transparent band at 15% opacity
 * - Band position: zone.min to zone.max mapped to 0-100% of track
 * - Horizontal: positioned left-to-right via left% + width%
 * - Vertical: positioned bottom-to-top via bottom% + height%
 *
 * ## Alert Zone Tooltips
 *
 * Invisible divs overlaid on top (z4) with native HTML `title` attribute:
 * - With label: "Normal: 0 – 40"
 * - Without label: "0 – 40"
 *
 * ## Font Auto-Loading
 *
 * `styles.label_font_file.fontFamily` resolution:
 * 1. Check if value ends with .otf, .ttf, .woff, .woff2
 * 2. If font file: generate unique family name, inject @font-face, cache, return name
 * 3. If not font file: pass through as CSS font-family string
 *
 * Cache is global (module-level Map). Same URL is only loaded once.
 *
 * ## Styles Object
 *
 * ```typescript
 * interface ProgressBarStyles {
 *   label_font_file?: FontStyle; // font styling for label (supports fontFile for .otf/.ttf)
 *   lastUpdated?: FontStyle;    // font styling for timestamp text
 *   background?: BackgroundStyle; // track background color
 *   width?: string | number;    // container width (px or CSS)
 *   height?: string | number;   // container height (px or CSS)
 * }
 * ```
 *
 * Width/height: number → px, string → raw CSS. Always has maxWidth: 100% for responsiveness.
 *
 * ## CSS Variables
 *
 * | Variable                        | Default  | Purpose               |
 * |---------------------------------|----------|-----------------------|
 * | --relay-progress-height         | 24px     | Default bar height    |
 * | --relay-progress-bg             | #e5e7eb  | Track background      |
 * | --relay-progress-fill           | #3b82f6  | Default fill color    |
 * | --relay-progress-border-radius  | 4px      | Corner radius         |
 * | --relay-font-family             | system-ui| Default font          |
 * | --relay-skeleton-base           | #e5e7eb  | Skeleton base color   |
 * | --relay-skeleton-shine          | #f3f4f6  | Skeleton shine color  |
 *
 * ## Last Updated Timestamp
 *
 * - `lastUpdated?: Date | number` — timestamp of last data update
 * - `showLastUpdated?: boolean` — toggle display, default `false`
 * - `formatTimestamp?: (ts: Date | number) => string` — custom formatter
 * - Default format: `dd MMM yyyy HH:MM:SS.sss +TZ` (e.g., "26 Mar 2026 22:39:40.123 +05:30")
 * - Rendered as HTML div below the progress bar
 * - `styles.lastUpdated?: FontStyle` — font customization for timestamp text (fontSize, color, fontWeight, fontFamily)
 * - When `showLastUpdated=false` (default), timestamp is not rendered even if `lastUpdated` is provided
 * - When `showLastUpdated=true` and `lastUpdated` is null/undefined, timestamp is not rendered
 *
 * ## Loading State
 *
 * When showLoading=true and value==null:
 * - Renders animated shimmer skeleton
 * - Skeleton respects styles.width, styles.height
 * - Uses CSS animation: relay-skeleton-shimmer
 *
 * ## Animations
 *
 * | Property         | Duration | Easing |
 * |------------------|----------|--------|
 * | fill width/height| 300ms    | ease   |
 * | fill color       | 300ms    | ease   |
 * | label color      | 300ms    | ease   |
 *
 * ## SDK Integration
 *
 * ```tsx
 * const { value } = useRelayLatest(deviceIdent, metric);
 * <ProgressBar value={value ?? 0} alertZones={[...]} />
 * ```
 *
 * ## Validation
 *
 * - Hard errors (throw): min > max, min === max, invalid alert zones (missing min/max, non-finite, inverted, overlapping)
 * - Soft errors (onError): null/undefined value — falls back to last valid value via useRef
 * - null/undefined with showLoading=false → renders at min value
 *
 * ## Zone Transition Callback
 *
 * - `onZoneChange` fires when value crosses a zone boundary
 * - Returns { previousZone, currentZone, value }
 *
 * ## Test Coverage
 *
 * Unit tests (29): tests/ProgressBar.test.tsx
 * - rendering: default, label display, label hidden, loading skeleton
 * - formatValue: custom format, value exceeds max, value below min
 * - fill percentage: clamp to 0%, clamp to 100%, custom range
 * - alert zones: renders bands, title tooltips, unlabeled zones, zone color for fill
 * - showAlertZones: default visible, hidden, fill color still active when hidden
 * - orientation: horizontal default, vertical
 * - styles: background color, custom width (px), custom height (px), CSS string units, maxWidth responsiveness, label font
 * - edge cases: min===max, value===0, very large values
 *
 * Playwright e2e tests (33): e2e/progress-bar.spec.ts
 * - page load, basic rendering, fill behavior, alert zones, styling, orientation, loading, last updated timestamp, resizable
 */
