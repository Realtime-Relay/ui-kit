import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleTime, scaleLinear, line, area, extent } from 'd3';
import type { AlertZone, FontStyle, BackgroundStyle } from '../utils/types';
import { defaultFormatValue, defaultFormatTimestamp } from '../utils/formatters';
import { resolveFont } from '../utils/useResolvedStyles';
import { createScaler } from '../utils/scaler';
import { validateAlertZones, type ComponentError } from '../utils/validation';
import { useZoneTransition, type ZoneTransition } from '../utils/useZoneTransition';

const STAT_REFERENCE = 300;

export interface StatCardWithGraphStyles {
  value?: FontStyle;
  label?: FontStyle;
  lastUpdated?: FontStyle;
  background?: BackgroundStyle;
  width?: string | number;
  height?: string | number;
}

export interface StatCardWithGraphProps {
  value: any;
  numericValue?: number;
  label?: string;
  formatValue?: (value: any) => string;
  sparklineData?: any[];
  sparklineExtractor?: (point: any) => number;
  sparklineWindow?: number;
  graphLineColor?: string;
  alertZones?: AlertZone[];
  onZoneChange?: (transition: ZoneTransition) => void;
  borderRadius?: number | 'rounded' | 'sharp';
  borderColor?: string;
  borderThickness?: number;
  styles?: StatCardWithGraphStyles;
  lastUpdated?: Date | number;
  showLastUpdated?: boolean;
  formatTimestamp?: (ts: Date | number) => string;
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

function defaultDisplayFormat(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return defaultFormatValue(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getZoneColor(value: number, zones: AlertZone[]): string | null {
  for (const zone of zones) {
    if (value >= zone.min && value <= zone.max) return zone.color;
  }
  return null;
}

function toCss(val: string | number | undefined): string | undefined {
  if (val === undefined) return undefined;
  return typeof val === 'number' ? `${val}px` : val;
}

export function StatCardWithGraph({
  value,
  numericValue,
  label,
  formatValue,
  sparklineData = [],
  sparklineExtractor,
  sparklineWindow = 30000,
  graphLineColor = '#3b82f6',
  alertZones = [],
  onZoneChange,
  borderRadius,
  borderColor,
  borderThickness,
  styles,
  lastUpdated,
  showLastUpdated = false,
  formatTimestamp = defaultFormatTimestamp,
  lastUpdatedMargin = 8,
  showLoading = true,
  onError,
}: StatCardWithGraphProps) {
  // Validate alert zones
  if (alertZones.length > 0) {
    validateAlertZones(alertZones, 'StatCardWithGraph');
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const lastValidRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: STAT_REFERENCE, height: STAT_REFERENCE });

  // Track last valid value
  if (value !== null && value !== undefined) {
    lastValidRef.current = value;
  } else {
    onError?.({
      type: 'invalid_value',
      message: `StatCardWithGraph: value is ${value === null ? 'null' : 'undefined'}.`,
      rawValue: value,
      component: 'StatCardWithGraph',
    });
  }

  const renderValue = value !== null && value !== undefined ? value : lastValidRef.current;

  // Numeric value for zones
  const zoneNumeric = numericValue ?? (typeof renderValue === 'number' ? renderValue : null);

  useZoneTransition(zoneNumeric ?? 0, alertZones, zoneNumeric !== null ? onZoneChange : undefined);

  // Warn if sparklineData without extractor
  useEffect(() => {
    if (sparklineData.length > 0 && !sparklineExtractor) {
      console.warn(
        'StatCardWithGraph: sparklineData provided without sparklineExtractor. ' +
        'Sparkline will not render. Provide sparklineExtractor={(point) => point.yourMetric}.'
      );
    }
  }, [sparklineData.length > 0, !sparklineExtractor]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        setDims((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = createScaler(dims.width, dims.height, STAT_REFERENCE, 'width');
  const valueStyleR = resolveFont(styles?.value);
  const labelStyleR = resolveFont(styles?.label);
  const lastUpdatedStyleR = resolveFont(styles?.lastUpdated);

  // Zone color
  const zoneColor = zoneNumeric !== null && alertZones.length > 0
    ? getZoneColor(zoneNumeric, alertZones)
    : null;

  // Determine sparkline color: explicit graphLineColor > zone color > default
  const isGraphColorExplicit = graphLineColor !== '#3b82f6';
  const sparkColor = isGraphColorExplicit ? graphLineColor : (zoneColor ?? graphLineColor);

  // Format display value
  const displayValue = renderValue !== null && renderValue !== undefined
    ? (formatValue ? formatValue(renderValue) : defaultDisplayFormat(renderValue))
    : '';

  // Build sparkline path
  const sparklinePath = useMemo(() => {
    if (!sparklineExtractor || sparklineData.length < 2) {
      return { line: '', area: '', viewBox: '0 0 100 40' };
    }

    // Extract numeric values and filter valid points
    const points: { timestamp: number; value: number }[] = [];
    for (const point of sparklineData) {
      const ts = point.timestamp;
      if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
      const val = sparklineExtractor(point);
      if (typeof val !== 'number' || !Number.isFinite(val)) continue;
      points.push({ timestamp: ts, value: val });
    }

    if (points.length < 2) return { line: '', area: '', viewBox: '0 0 100 40' };

    // Apply time window
    const latestTs = Math.max(...points.map(p => p.timestamp));
    const windowStart = latestTs - sparklineWindow;
    const windowed = points.filter(p => p.timestamp >= windowStart);

    if (windowed.length < 2) return { line: '', area: '', viewBox: '0 0 100 40' };

    const [tMin, tMax] = extent(windowed, (d) => d.timestamp) as [number, number];
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const d of windowed) {
      if (d.value < yMin) yMin = d.value;
      if (d.value > yMax) yMax = d.value;
    }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const w = Math.max(100, dims.width);
    const h = Math.max(40, Math.round(dims.height * 0.6));
    const xScale = scaleTime().domain([new Date(tMin), new Date(tMax)]).range([0, w]);
    const yScale = scaleLinear().domain([yMin, yMax]).range([h, 0]);

    type SparkPoint = { timestamp: number; value: number };
    const lineGen = line<SparkPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.value));

    const areaGen = area<SparkPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(h)
      .y1((d) => yScale(d.value));

    return {
      line: lineGen(windowed) ?? '',
      area: areaGen(windowed) ?? '',
      viewBox: `0 0 ${w} ${h}`,
    };
  }, [sparklineData, sparklineExtractor, sparklineWindow, dims.width, dims.height]);

  const widthCss = toCss(styles?.width) ?? '100%';
  const heightCss = toCss(styles?.height) ?? '100%';

  // Loading skeleton
  if (showLoading && renderValue === null) {
    return (
      <div
        ref={containerRef}
        style={{
          width: widthCss,
          height: heightCss,
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
        width: widthCss,
        height: heightCss,
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
          <path d={sparklinePath.area} fill={sparkColor} opacity={0.15} />
          <path d={sparklinePath.line} fill="none" stroke={sparkColor} strokeWidth={s(2)} opacity={0.5} />
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
              color: labelStyleR?.color ?? zoneColor ?? '#6b7280',
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
            color: valueStyleR?.color ?? zoneColor ?? 'currentColor',
            lineHeight: 1.2,
            textAlign: 'center',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            maxWidth: '100%',
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
              color: lastUpdatedStyleR?.color ?? zoneColor ?? '#9ca3af',
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
