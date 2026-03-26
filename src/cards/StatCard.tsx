import type { FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';

export interface StatCardStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
}

export interface StatCardProps {
  value: string | number;
  label?: string;
  formatValue?: (value: number) => string;
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  lastUpdatedMargin?: number;
  showLoading?: boolean;
}

function resolveBorderRadius(value?: number | 'rounded' | 'sharp'): string {
  if (value === 'sharp') return '0';
  if (value === 'rounded') return 'var(--relay-border-radius, 8px)';
  if (typeof value === 'number') return `${value}px`;
  return 'var(--relay-border-radius, 8px)';
}

function formatTimestamp(ts: Date | number): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  return date.toLocaleString();
}

export function StatCard({
  value,
  label,
  formatValue = defaultFormatValue,
  borderRadius,
  borderColor,
  borderThickness,
  styles,
  lastUpdated,
  showLastUpdated = false,
  lastUpdatedMargin = 8,
  showLoading = true,
}: StatCardProps) {
  const displayValue = typeof value === 'number' ? formatValue(value) : value;

  if (showLoading && value == null) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: resolveBorderRadius(borderRadius),
          background: `linear-gradient(90deg,
            var(--relay-skeleton-base, #e5e7eb) 25%,
            var(--relay-skeleton-shine, #f3f4f6) 50%,
            var(--relay-skeleton-base, #e5e7eb) 75%)`,
          backgroundSize: '200% 100%',
          animation: 'relay-skeleton-shimmer 1.5s ease-in-out infinite',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: styles?.background?.color ?? 'transparent',
        borderRadius: resolveBorderRadius(borderRadius),
        border: borderColor || borderThickness
          ? `${borderThickness ?? 1}px solid ${borderColor ?? 'var(--relay-border-color, #e0e0e0)'}`
          : undefined,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: styles?.label?.fontFamily ?? 'var(--relay-font-family)',
            fontSize: styles?.label?.fontSize ?? 13,
            fontWeight: styles?.label?.fontWeight ?? 400,
            color: styles?.label?.color ?? '#6b7280',
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: styles?.value?.fontFamily ?? 'var(--relay-font-family)',
          fontSize: styles?.value?.fontSize ?? 32,
          fontWeight: styles?.value?.fontWeight ?? 700,
          color: styles?.value?.color ?? 'currentColor',
          lineHeight: 1.2,
        }}
      >
        {displayValue}
      </div>
      {showLastUpdated && lastUpdated != null && (
        <div
          style={{
            fontFamily: styles?.lastUpdated?.fontFamily ?? 'var(--relay-font-family)',
            fontSize: styles?.lastUpdated?.fontSize ?? 11,
            fontWeight: styles?.lastUpdated?.fontWeight ?? 400,
            color: styles?.lastUpdated?.color ?? '#9ca3af',
            marginTop: lastUpdatedMargin,
          }}
        >
          {formatTimestamp(lastUpdated)}
        </div>
      )}
    </div>
  );
}
