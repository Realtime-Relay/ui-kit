import { useRef, useState, useEffect } from 'react';
import type { FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';
import { resolveFont } from '../utils/useResolvedStyles';
import { createScaler, CHART_REFERENCE } from '../utils/scaler';
import { validateValue, type ComponentError } from '../utils/validation';

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
  onError?: (error: ComponentError) => void;
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
  onError,
}: StatCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidRef = useRef<number | null>(null);
  const [dims, setDims] = useState({ width: CHART_REFERENCE, height: CHART_REFERENCE });

  // Validate numeric values; strings pass through as-is
  const numValue = typeof value === 'number' ? validateValue(value, 'StatCard', onError) : null;
  if (numValue !== null) lastValidRef.current = numValue;
  // For display: use original value if string, validated number if numeric
  const safeValue = typeof value === 'string' ? value : (lastValidRef.current ?? value);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = createScaler(dims.width, dims.height, CHART_REFERENCE, 'width');
  const valueStyleR = resolveFont(styles?.value);
  const labelStyleR = resolveFont(styles?.label);
  const lastUpdatedStyleR = resolveFont(styles?.lastUpdated);
  const displayValue = typeof safeValue === 'number' ? formatValue(safeValue) : safeValue;

  if (showLoading && value == null) {
    return (
      <div
        ref={containerRef}
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
      ref={containerRef}
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
        padding: s(16),
        boxSizing: 'border-box',
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: labelStyleR?.fontFamily ?? 'var(--relay-font-family)',
            fontSize: labelStyleR?.fontSize ?? s(13),
            fontWeight: labelStyleR?.fontWeight ?? 400,
            color: labelStyleR?.color ?? '#6b7280',
            marginBottom: s(4),
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: valueStyleR?.fontFamily ?? 'var(--relay-font-family)',
          fontSize: valueStyleR?.fontSize ?? s(32),
          fontWeight: valueStyleR?.fontWeight ?? 700,
          color: valueStyleR?.color ?? 'currentColor',
          lineHeight: 1.2,
        }}
      >
        {displayValue}
      </div>
      {showLastUpdated && lastUpdated != null && (
        <div
          style={{
            fontFamily: lastUpdatedStyleR?.fontFamily ?? 'var(--relay-font-family)',
            fontSize: lastUpdatedStyleR?.fontSize ?? s(11),
            fontWeight: lastUpdatedStyleR?.fontWeight ?? 400,
            color: lastUpdatedStyleR?.color ?? '#9ca3af',
            marginTop: s(lastUpdatedMargin),
          }}
        >
          {formatTimestamp(lastUpdated)}
        </div>
      )}
    </div>
  );
}
