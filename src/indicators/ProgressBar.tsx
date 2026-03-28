import { useRef } from 'react';
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue, defaultFormatTimestamp } from '../utils/formatters';
import { resolveFontFamily } from '../utils/fonts';
import { useZoneTransition, type ZoneTransition } from '../utils/useZoneTransition';
import { validateRange, validateAlertZones, validateValue, type ComponentError } from '../utils/validation';
import { getZoneBoundaries } from '../gauges/shared';

export interface ProgressBarStyles {
  /** Font file path/URL or CSS font-family for the label. Supports .otf/.ttf/.woff/.woff2 imports. */
  label_font_file?: FontStyle;
  /** Styling for the last updated timestamp text. */
  lastUpdated?: FontStyle;
  /** Styling for zone boundary and min/max labels. */
  zoneValue?: FontStyle;
  background?: BackgroundStyle;
  /** Width override. Accepts px number or CSS string. Responsive (maxWidth: 100%). */
  width?: string | number;
  /** Height override. Accepts px number or CSS string. Responsive (maxWidth: 100%). */
  height?: string | number;
}

export interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  orientation?: 'horizontal' | 'vertical';
  showLabel?: boolean;
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  /** Show/hide the transparent alert zone bands in the background. Default: true when alertZones are provided. */
  showAlertZones?: boolean;
  /** Show a legend of alert zones below the bar. Default: false. */
  showZoneLegend?: boolean;
  /** Show zone boundary values along the bar. Default: false. */
  showZoneValues?: boolean;
  /** Show min and max values at the ends of the bar. Default: false. */
  showMinMax?: boolean;
  styles?: ProgressBarStyles;
  /** Timestamp of the last data update. Displayed below the bar when showLastUpdated is true. */
  lastUpdated?: Date | number;
  /** Show/hide the last updated timestamp. Default: false. */
  showLastUpdated?: boolean;
  /** Custom formatter for the timestamp. Receives Date | number, must return string. Default: dd MMM yyyy HH:MM:SS.sss +TZ */
  formatTimestamp?: (ts: Date | number) => string;
  showLoading?: boolean;
  onZoneChange?: (transition: ZoneTransition) => void;
  onError?: (error: ComponentError) => void;
}

function getZoneColor(value: number, zones: AlertZone[], fallback: string): string {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return fallback;
}

function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === 'number' ? `${val}px` : val;
}

export function ProgressBar({
  value,
  min = 0,
  max = 100,
  orientation = 'horizontal',
  showLabel = true,
  formatValue = defaultFormatValue,
  alertZones = [],
  showAlertZones,
  showZoneLegend = false,
  showZoneValues = false,
  showMinMax = false,
  styles,
  lastUpdated,
  showLastUpdated = false,
  formatTimestamp = defaultFormatTimestamp,
  showLoading = true,
  onZoneChange,
  onError,
}: ProgressBarProps) {
  // Hard validation — throws on config errors
  validateRange(min, max, 'ProgressBar');
  validateAlertZones(alertZones, 'ProgressBar');

  // Soft validation — fires onError, falls back to last valid
  const lastValidRef = useRef<number | null>(null);
  const validatedValue = validateValue(value, 'ProgressBar', onError);
  if (validatedValue !== null) {
    lastValidRef.current = validatedValue;
  }
  const renderValue = lastValidRef.current;

  useZoneTransition(renderValue ?? min, alertZones, onZoneChange);

  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = orientation === 'horizontal';

  const labelFont = styles?.label_font_file;
  const resolvedFontFamily = labelFont?.fontFamily
    ? resolveFontFamily(labelFont.fontFamily)
    : undefined;

  const containerWidthCss = toCss(styles?.width) ?? '100%';
  const containerHeightCss = toCss(styles?.height) ?? (isHorizontal ? 'var(--relay-progress-height, 24px)' : '100%');

  if (showLoading && renderValue == null) {
    return (
      <div
        ref={containerRef}
        style={{
          width: containerWidthCss,
          maxWidth: '100%',
          height: containerHeightCss,
          background: `linear-gradient(90deg,
            var(--relay-skeleton-base, #e5e7eb) 25%,
            var(--relay-skeleton-shine, #f3f4f6) 50%,
            var(--relay-skeleton-base, #e5e7eb) 75%)`,
          backgroundSize: '200% 100%',
          animation: 'relay-skeleton-shimmer 1.5s ease-in-out infinite',
          borderRadius: 'var(--relay-progress-border-radius, 4px)',
        }}
      />
    );
  }

  // If renderValue is still null (showLoading=false + invalid value), fall back to min
  const safeValue = renderValue ?? min;
  const range = max - min;
  const clampedValue = Math.min(max, Math.max(min, safeValue));
  const ratio = range > 0 ? (clampedValue - min) / range : 0;
  const percentage = ratio * 100;
  const fillColor = getZoneColor(clampedValue, alertZones, 'var(--relay-progress-fill, #3b82f6)');
  const hasZones = alertZones.length > 0;
  const displayZones = hasZones && (showAlertZones !== false);

  const zvStyle = styles?.zoneValue;
  const zvFontSize = zvStyle?.fontSize ?? 10;
  const zvFontFamily = zvStyle?.fontFamily ?? 'var(--relay-font-family)';
  const zvFontWeight = zvStyle?.fontWeight ?? 400;
  const zvColor = zvStyle?.color ?? '#9ca3af';

  const zoneBoundaries = hasZones && showZoneValues ? getZoneBoundaries(alertZones, min, max) : [];

  // Find the zone color for a boundary value (use the zone that starts at this boundary)
  function getBoundaryColor(bv: number): string {
    for (const zone of alertZones) {
      if (zone.min === bv) return zone.color;
    }
    for (const zone of alertZones) {
      if (zone.max === bv) return zone.color;
    }
    return zvColor;
  }

  return (
    <>
    {/* Zone boundary values above/beside the bar */}
    {showZoneValues && zoneBoundaries.length > 0 && isHorizontal && (
      <div style={{ position: 'relative', width: containerWidthCss, maxWidth: '100%', height: zvFontSize + 4 }}>
        {zoneBoundaries.map((bv) => {
          const pos = range > 0 ? ((bv - min) / range) * 100 : 0;
          return (
            <span
              key={`zv-${bv}`}
              data-zone-value={bv}
              style={{
                position: 'absolute',
                left: `${pos}%`,
                transform: 'translateX(-50%)',
                fontSize: zvFontSize,
                fontFamily: zvFontFamily,
                fontWeight: zvFontWeight,
                color: zvStyle?.color ?? getBoundaryColor(bv),
                whiteSpace: 'nowrap',
              }}
            >
              {formatValue(bv)}
            </span>
          );
        })}
      </div>
    )}

    {/* Min/Max + bar layout */}
    <div style={{
      display: 'flex',
      alignItems: isHorizontal ? 'center' : 'flex-end',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap: showMinMax ? 6 : 0,
      width: isHorizontal ? containerWidthCss : undefined,
      maxWidth: isHorizontal ? '100%' : undefined,
      height: !isHorizontal ? containerHeightCss : undefined,
    }}>
      {/* Min label (left for horizontal, bottom for vertical — rendered at end for vertical) */}
      {showMinMax && isHorizontal && (
        <span data-minmax="min" style={{ fontSize: zvFontSize, fontFamily: zvFontFamily, fontWeight: zvFontWeight, color: zvColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatValue(min)}
        </span>
      )}
      {showMinMax && !isHorizontal && (
        <span data-minmax="max" style={{ fontSize: zvFontSize, fontFamily: zvFontFamily, fontWeight: zvFontWeight, color: zvColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatValue(max)}
        </span>
      )}

      {/* The bar container */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: isHorizontal ? 'row' : 'column', flex: 1, width: isHorizontal ? undefined : '100%' }}>
        {/* Zone values for vertical — positioned to the right */}
        {showZoneValues && zoneBoundaries.length > 0 && !isHorizontal && (
          <div style={{ position: 'absolute', left: '100%', top: 0, bottom: 0, marginLeft: 6 }}>
            {zoneBoundaries.map((bv) => {
              const pos = range > 0 ? ((bv - min) / range) * 100 : 0;
              return (
                <span
                  key={`zv-${bv}`}
                  data-zone-value={bv}
                  style={{
                    position: 'absolute',
                    bottom: `${pos}%`,
                    transform: 'translateY(50%)',
                    fontSize: zvFontSize,
                    fontFamily: zvFontFamily,
                    fontWeight: zvFontWeight,
                    color: zvStyle?.color ?? getBoundaryColor(bv),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatValue(bv)}
                </span>
              );
            })}
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            width: isHorizontal ? '100%' : undefined,
            maxWidth: '100%',
            height: isHorizontal ? containerHeightCss : '100%',
            backgroundColor: styles?.background?.color ?? 'var(--relay-progress-bg, #e5e7eb)',
            borderRadius: 'var(--relay-progress-border-radius, 4px)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Layer 0: Alert zone background bands (transparent, behind fill) */}
          {displayZones && alertZones.map((zone, i) => {
            const zoneStart = ((Math.max(zone.min, min) - min) / range) * 100;
            const zoneEnd = ((Math.min(zone.max, max) - min) / range) * 100;
            const zoneWidth = zoneEnd - zoneStart;

            return (
              <div
                key={`bg-${i}`}
                style={{
                  position: 'absolute',
                  ...(isHorizontal
                    ? { left: `${zoneStart}%`, top: 0, bottom: 0, width: `${zoneWidth}%` }
                    : { left: 0, right: 0, bottom: `${zoneStart}%`, height: `${zoneWidth}%` }),
                  backgroundColor: zone.color,
                  opacity: 0.15,
                  zIndex: 0,
                }}
              />
            );
          })}

          {/* Layer 1: Solid fill bar (fully opaque, covers zone bands underneath) */}
          <div
            style={{
              position: 'absolute',
              ...(isHorizontal
                ? { left: 0, top: 0, bottom: 0, width: `${percentage}%` }
                : { left: 0, right: 0, bottom: 0, height: `${percentage}%` }),
              backgroundColor: fillColor,
              borderRadius: 'inherit',
              transition: 'width 300ms ease, height 300ms ease, background-color 300ms ease',
              zIndex: 1,
            }}
          />

          {/* Layer 2: Label (above fill) */}
          {showLabel && (
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                width: '100%',
                textAlign: 'center',
                fontFamily: resolvedFontFamily ?? labelFont?.fontFamily ?? 'var(--relay-font-family)',
                fontSize: labelFont?.fontSize ?? 12,
                fontWeight: labelFont?.fontWeight ?? 600,
                color: labelFont?.color ?? (percentage > 50 ? '#fff' : 'currentColor'),
                transition: 'color 300ms ease',
                pointerEvents: 'none',
              }}
            >
              {formatValue(safeValue)}
            </span>
          )}

          {/* Layer 3: Invisible tooltip hit areas for alert zones (on top of everything) */}
          {displayZones && alertZones.map((zone, i) => {
            const zoneStart = ((Math.max(zone.min, min) - min) / range) * 100;
            const zoneEnd = ((Math.min(zone.max, max) - min) / range) * 100;
            const zoneWidth = zoneEnd - zoneStart;

            return (
              <div
                key={`tip-${i}`}
                title={`${zone.label ? zone.label + ': ' : ''}${zone.min} – ${zone.max}`}
                style={{
                  position: 'absolute',
                  ...(isHorizontal
                    ? { left: `${zoneStart}%`, top: 0, bottom: 0, width: `${zoneWidth}%` }
                    : { left: 0, right: 0, bottom: `${zoneStart}%`, height: `${zoneWidth}%` }),
                  zIndex: 4,
                  background: 'transparent',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Max label (right for horizontal, top for vertical — rendered at start for vertical) */}
      {showMinMax && isHorizontal && (
        <span data-minmax="max" style={{ fontSize: zvFontSize, fontFamily: zvFontFamily, fontWeight: zvFontWeight, color: zvColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatValue(max)}
        </span>
      )}
      {showMinMax && !isHorizontal && (
        <span data-minmax="min" style={{ fontSize: zvFontSize, fontFamily: zvFontFamily, fontWeight: zvFontWeight, color: zvColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatValue(min)}
        </span>
      )}
    </div>

    {/* Zone legend */}
    {showZoneLegend && hasZones && (
      <div
        data-testid="zone-legend"
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '4px 0',
          marginTop: 4,
          fontFamily: zvFontFamily,
          fontSize: zvFontSize,
        }}
      >
        {alertZones.filter((z) => z.label).map((zone, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: zone.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: zvColor }}>{zone.label}</span>
          </div>
        ))}
      </div>
    )}

    {showLastUpdated && lastUpdated != null && (() => {
      const tsStyle = styles?.lastUpdated;
      return (
        <div
          style={{
            marginTop: 4,
            fontSize: tsStyle?.fontSize ?? 11,
            fontFamily: tsStyle?.fontFamily ?? 'var(--relay-font-family)',
            fontWeight: tsStyle?.fontWeight ?? 400,
            color: tsStyle?.color ?? '#9ca3af',
            textAlign: 'center',
          }}
        >
          {formatTimestamp(lastUpdated)}
        </div>
      );
    })()}
    </>
  );
}
