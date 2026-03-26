import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';

export interface ProgressBarStyles {
  label?: FontStyle;
  background?: BackgroundStyle;
}

export interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  orientation?: 'horizontal' | 'vertical';
  showLabel?: boolean;
  formatValue?: (value: number) => string;
  alertZones?: AlertZone[];
  styles?: ProgressBarStyles;
  showLoading?: boolean;
}

function getZoneColor(value: number, zones: AlertZone[], fallback: string): string {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return fallback;
}

export function ProgressBar({
  value,
  min = 0,
  max = 100,
  orientation = 'horizontal',
  showLabel = true,
  formatValue = defaultFormatValue,
  alertZones = [],
  styles,
  showLoading = true,
}: ProgressBarProps) {
  if (showLoading && value == null) {
    return (
      <div
        style={{
          width: '100%',
          height: orientation === 'horizontal' ? 'var(--relay-progress-height, 24px)' : '100%',
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

  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const percentage = ratio * 100;
  const fillColor = getZoneColor(value, alertZones, 'var(--relay-progress-fill, #3b82f6)');
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      style={{
        width: '100%',
        height: isHorizontal ? 'var(--relay-progress-height, 24px)' : '100%',
        backgroundColor: styles?.background?.color ?? 'var(--relay-progress-bg, #e5e7eb)',
        borderRadius: 'var(--relay-progress-border-radius, 4px)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Fill bar */}
      <div
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? { left: 0, top: 0, bottom: 0, width: `${percentage}%` }
            : { left: 0, right: 0, bottom: 0, height: `${percentage}%` }),
          backgroundColor: fillColor,
          borderRadius: 'inherit',
          transition: 'width 300ms ease, height 300ms ease, background-color 300ms ease',
        }}
      />

      {/* Label */}
      {showLabel && (
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            textAlign: 'center',
            fontFamily: styles?.label?.fontFamily ?? 'var(--relay-font-family)',
            fontSize: styles?.label?.fontSize ?? 12,
            fontWeight: styles?.label?.fontWeight ?? 600,
            color: styles?.label?.color ?? (percentage > 50 ? '#fff' : 'currentColor'),
            transition: 'color 300ms ease',
          }}
        >
          {formatValue(value)}
        </span>
      )}
    </div>
  );
}
