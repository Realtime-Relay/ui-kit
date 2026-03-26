import { useMemo } from 'react';
import { scaleTime, scaleLinear, line, area, extent } from 'd3';
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';

export interface StatCardWithGraphStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
}

export interface StatCardWithGraphProps {
  value: string | number;
  label?: string;
  formatValue?: (value: number) => string;
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardWithGraphStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  lastUpdatedMargin?: number;
  showLoading?: boolean;
  sparklineData?: DataPoint[];
  sparklineMetric?: string;
  graphLineColor?: string;
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

export function StatCardWithGraph({
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
  sparklineData = [],
  sparklineMetric,
  graphLineColor = '#3b82f6',
}: StatCardWithGraphProps) {
  const displayValue = typeof value === 'number' ? formatValue(value) : value;

  // Resolve which metric key to use for the sparkline
  const metricKey = useMemo(() => {
    if (sparklineMetric) return sparklineMetric;
    if (sparklineData.length === 0) return '';
    const firstPoint = sparklineData[0];
    const keys = Object.keys(firstPoint).filter(
      (k) => k !== 'timestamp' && typeof firstPoint[k] === 'number'
    );
    return keys[0] ?? '';
  }, [sparklineData, sparklineMetric]);

  // Build sparkline SVG path
  const sparklinePath = useMemo(() => {
    if (!metricKey || sparklineData.length < 2) return { line: '', area: '' };

    const [tMin, tMax] = extent(sparklineData, (d) => d.timestamp) as [number, number];
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const d of sparklineData) {
      const v = Number(d[metricKey]);
      if (!isNaN(v)) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const w = 300;
    const h = 80;
    const xScale = scaleTime().domain([new Date(tMin), new Date(tMax)]).range([0, w]);
    const yScale = scaleLinear().domain([yMin, yMax]).range([h, 0]);

    const lineGen = line<DataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(Number(d[metricKey]) || 0));

    const areaGen = area<DataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(h)
      .y1((d) => yScale(Number(d[metricKey]) || 0));

    return {
      line: lineGen(sparklineData) ?? '',
      area: areaGen(sparklineData) ?? '',
      viewBox: `0 0 ${w} ${h}`,
    };
  }, [sparklineData, metricKey]);

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

  const br = resolveBorderRadius(borderRadius);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: styles?.background?.color ?? 'transparent',
        borderRadius: br,
        border: borderColor || borderThickness
          ? `${borderThickness ?? 1}px solid ${borderColor ?? 'var(--relay-border-color, #e0e0e0)'}`
          : undefined,
        boxSizing: 'border-box',
      }}
    >
      {/* Background sparkline */}
      {sparklinePath.line && (
        <svg
          viewBox={sparklinePath.viewBox}
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '60%',
            pointerEvents: 'none',
          }}
        >
          <path d={sparklinePath.area} fill={graphLineColor} opacity={0.15} />
          <path d={sparklinePath.line} fill="none" stroke={graphLineColor} strokeWidth={2} opacity={0.5} />
        </svg>
      )}

      {/* Content overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
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
    </div>
  );
}
