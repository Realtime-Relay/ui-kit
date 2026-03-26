import { useRef } from 'react';
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue, defaultFormatTimestamp } from '../utils/formatters';
import { resolveFontFamily } from '../utils/fonts';
import { useZoneTransition, type ZoneTransition } from '../utils/useZoneTransition';
import { validateRange, validateAlertZones, validateValue, type ComponentError } from '../utils/validation';

export interface ProgressBarStyles {
  /** Font file path/URL or CSS font-family for the label. Supports .otf/.ttf/.woff/.woff2 imports. */
  label_font_file?: FontStyle;
  /** Styling for the last updated timestamp text. */
  lastUpdated?: FontStyle;
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

  return (
    <>
    <div
      ref={containerRef}
      style={{
        width: containerWidthCss,
        maxWidth: '100%',
        height: containerHeightCss,
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
