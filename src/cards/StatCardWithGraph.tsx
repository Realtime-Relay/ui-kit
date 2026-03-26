import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleTime, scaleLinear, line, area, extent } from 'd3';
import type { DataPoint, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue } from '../utils/formatters';
import { resolveFont } from '../utils/useResolvedStyles';
import { createScaler, CHART_REFERENCE } from '../utils/scaler';
import { validateValue, type ComponentError } from '../utils/validation';

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
  onError,
}: StatCardWithGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidRef = useRef<number | null>(null);
  const [dims, setDims] = useState({ width: CHART_REFERENCE, height: CHART_REFERENCE });

  // Validate numeric values; strings pass through as-is
  const numValue = typeof value === 'number' ? validateValue(value, 'StatCardWithGraph', onError) : null;
  if (numValue !== null) lastValidRef.current = numValue;
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

    const w = Math.max(100, dims.width);
    const h = Math.max(40, Math.round(dims.height * 0.6));
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
  }, [sparklineData, metricKey, dims.width, dims.height]);

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

  const br = resolveBorderRadius(borderRadius);

  return (
    <div
      ref={containerRef}
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
          <path d={sparklinePath.line} fill="none" stroke={graphLineColor} strokeWidth={s(2)} opacity={0.5} />
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
    </div>
  );
}
