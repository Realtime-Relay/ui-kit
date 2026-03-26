import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { scaleTime, scaleLinear, line, area, extent, bisector, pointer, timeFormat } from 'd3';
import type { DataPoint, MetricConfig, AlertZone, FontStyle, BackgroundStyle, DownsampleConfig } from '../utils/types';
import { resolveMetrics } from '../utils/metrics';
import { useResolvedStyles } from '../utils/useResolvedStyles';
import { getMetricColor } from '../theme/palette';
import { applyDownsample } from '../utils/downsample';
import { defaultFormatValue } from '../utils/formatters';
import { createScaler, CHART_REFERENCE } from '../utils/scaler';
import { isValidTimestamp, validateAlertZones, type ComponentError } from '../utils/validation';
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipData,
  Legend,
  type LegendItem,
  Grid,
  AlertZonesOverlay,
  XAxis,
  YAxis,
  ChartSkeleton,
} from './shared';

export interface TimeSeriesStyles {
  title?: FontStyle;
  axis?: FontStyle;
  legend?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
}

export interface TimeSeriesProps {
  data: DataPoint[];
  metrics?: MetricConfig[];
  title?: string;
  formatValue?: (value: number) => string;
  renderTooltip?: (point: DataPoint) => React.ReactNode;
  onHover?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent
  ) => void;
  onRelease?: (
    point: { metric: string; value: number; timestamp: number } | null,
    event: MouseEvent
  ) => void;
  showGrid?: boolean;
  gridColor?: string;
  gridThickness?: number;
  styles?: TimeSeriesStyles;
  area?: boolean;
  areaColor?: string;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom';
  showLoading?: boolean;
  downsample?: DownsampleConfig;
  /** Time window in milliseconds. Only data within [now - timeWindow, now] is shown. Enables autoscroll. */
  timeWindow?: number;
  /** Enable autoscroll when timeWindow is set. Defaults to true if timeWindow is provided. */
  autoScroll?: boolean;
  onError?: (error: ComponentError) => void;
}

export function TimeSeries({
  data,
  metrics: metricsProp,
  title,
  formatValue = defaultFormatValue,
  renderTooltip,
  onHover,
  onRelease,
  showGrid = true,
  gridColor,
  gridThickness,
  styles,
  area: showArea = false,
  areaColor,
  alertZones = [],
  showLegend = true,
  legendPosition = 'bottom',
  showLoading = true,
  downsample,
  timeWindow,
  autoScroll,
  onError,
}: TimeSeriesProps) {
  validateAlertZones(alertZones, 'TimeSeries');

  const resolvedStyles = useResolvedStyles(styles);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string> | null>(null);
  const [now, setNow] = useState(Date.now());

  // Autoscroll: update `now` on animation frame when timeWindow is set
  const isAutoScroll = timeWindow != null && (autoScroll !== false);
  useEffect(() => {
    if (!isAutoScroll) return;
    let rafId: number;
    const tick = () => {
      setNow(Date.now());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isAutoScroll]);

  // Filter out data points with invalid timestamps
  const validData = useMemo(() => {
    return data.filter((point) => {
      if (!isValidTimestamp(point.timestamp)) {
        onError?.({ type: 'invalid_timestamp', message: `TimeSeries: invalid timestamp, received ${point.timestamp}`, rawValue: point.timestamp, component: 'TimeSeries' });
        return false;
      }
      return true;
    });
  }, [data, onError]);

  // Resolve metrics from data if not provided
  const resolvedMetrics = useMemo(() => resolveMetrics(validData, metricsProp), [validData, metricsProp]);

  // Track visibility — initialize from MetricConfig.visible, then user toggles override
  const metricVisibility = useMemo(() => {
    if (visibleMetrics) return visibleMetrics;
    const set = new Set<string>();
    for (const m of resolvedMetrics) {
      if (m.visible !== false) set.add(m.key);
    }
    return set;
  }, [resolvedMetrics, visibleMetrics]);

  const activeMetrics = useMemo(
    () => resolvedMetrics.filter((m) => metricVisibility.has(m.key)),
    [resolvedMetrics, metricVisibility]
  );

  // Downsample per metric
  const downsampledData = useMemo(() => {
    if (activeMetrics.length === 0) return validData;
    // Downsample using first active metric as reference
    return applyDownsample(validData, downsample, activeMetrics[0].key);
  }, [validData, downsample, activeMetrics]);

  const handleSelectMetric = useCallback((key: string) => {
    setVisibleMetrics((prev) => {
      const current = prev ?? new Set(resolvedMetrics.map((m) => m.key));
      // If this is the only visible metric, re-show all
      if (current.size === 1 && current.has(key)) {
        return new Set(resolvedMetrics.map((m) => m.key));
      }
      // Otherwise, select only this one
      return new Set([key]);
    });
  }, [resolvedMetrics]);

  // Loading state
  if (showLoading && (!validData || validData.length === 0)) {
    return (
      <ResponsiveContainer>
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

  // Legend items
  const legendItems: LegendItem[] = resolvedMetrics.map((m, i) => ({
    key: m.key,
    label: m.label ?? m.key,
    color: m.color ?? getMetricColor(i),
    visible: metricVisibility.has(m.key),
  }));

  return (
    <ResponsiveContainer
      style={{ backgroundColor: styles?.background?.color ?? 'var(--relay-bg-color, transparent)' }}
    >
      {({ width, height }) => {
        const s = createScaler(width, height, CHART_REFERENCE, 'width');
        const MARGIN = { top: s(20), right: s(20), bottom: s(30), left: s(50) };
        const chartWidth = width - MARGIN.left - MARGIN.right;
        const chartHeight = height - MARGIN.top - MARGIN.bottom - (showLegend ? s(30) : 0) - (title ? s(24) : 0);

        if (chartWidth <= 0 || chartHeight <= 0) return null;

        // Filter data by time window if set
        const visibleData = timeWindow
          ? downsampledData.filter((d) => d.timestamp >= now - timeWindow && d.timestamp <= now)
          : downsampledData;

        if (visibleData.length === 0 && downsampledData.length > 0 && timeWindow) {
          // No data in window yet — show empty chart with correct time range
        }

        // X-axis domain: fixed window if timeWindow set, otherwise fit to data
        const xDomainMin = timeWindow ? new Date(now - timeWindow) : new Date((extent(visibleData, (d) => d.timestamp) as [number, number])[0] ?? now);
        const xDomainMax = timeWindow ? new Date(now) : new Date((extent(visibleData, (d) => d.timestamp) as [number, number])[1] ?? now);
        const xScale = scaleTime().domain([xDomainMin, xDomainMax]).range([0, chartWidth]);

        // Custom tick format — always show HH:MM:SS
        const tickFormat = timeFormat('%H:%M:%S');

        let yMin = Infinity;
        let yMax = -Infinity;
        for (const d of visibleData) {
          for (const m of activeMetrics) {
            const v = Number(d[m.key]);
            if (!isNaN(v)) {
              if (v < yMin) yMin = v;
              if (v > yMax) yMax = v;
            }
          }
        }
        // Include alert zone bounds in y range
        for (const zone of alertZones) {
          if (zone.min < yMin) yMin = zone.min;
          if (zone.max > yMax) yMax = zone.max;
        }
        const yPadding = (yMax - yMin) * 0.05 || 1;
        const yScale = scaleLinear()
          .domain([yMin - yPadding, yMax + yPadding])
          .range([chartHeight, 0])
          .nice();

        // Line and area generators
        // Line and area generators are configured per-metric below
        // (each needs its own .defined() check for the specific metric key)

        // Mouse interaction
        const bisect = bisector<DataPoint, number>((d) => d.timestamp).left;

        const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
          const [mx] = pointer(event.nativeEvent, event.currentTarget);
          const x0 = xScale.invert(mx).getTime();
          const idx = bisect(visibleData, x0, 1);
          const d0 = visibleData[idx - 1];
          const d1 = visibleData[idx];

          if (!d0 && !d1) return;

          const closest = !d1
            ? d0
            : !d0
              ? d1
              : x0 - d0.timestamp > d1.timestamp - x0
                ? d1
                : d0;

          const metricValues = activeMetrics.map((m, i) => ({
            key: m.key,
            label: m.label ?? m.key,
            color: m.color ?? getMetricColor(i),
            value: Number(closest[m.key]) || 0,
          }));

          const px = xScale(new Date(closest.timestamp));
          const py = yScale(metricValues[0]?.value ?? 0);

          setTooltipData({
            point: closest,
            metrics: metricValues,
            x: px + MARGIN.left,
            y: py + MARGIN.top,
          });

          if (onHover && metricValues.length > 0) {
            onHover(
              {
                metric: metricValues[0].key,
                value: metricValues[0].value,
                timestamp: closest.timestamp,
              },
              event.nativeEvent
            );
          }
        };

        const handleMouseLeave = (event: React.MouseEvent<SVGRectElement>) => {
          setTooltipData(null);
          if (onRelease) {
            const last = tooltipData?.metrics[0];
            onRelease(
              last
                ? { metric: last.key, value: last.value, timestamp: tooltipData!.point.timestamp }
                : null,
              event.nativeEvent
            );
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            {title && (
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: resolvedStyles?.title?.fontFamily ?? 'var(--relay-font-family)',
                  fontSize: resolvedStyles?.title?.fontSize ?? s(14),
                  fontWeight: resolvedStyles?.title?.fontWeight ?? 600,
                  color: resolvedStyles?.title?.color,
                  padding: `${s(4)}px 0`,
                }}
              >
                {title}
              </div>
            )}
            {showLegend && legendPosition === 'top' && (
              <Legend items={legendItems} onSelect={handleSelectMetric} position="top" style={resolvedStyles?.legend} s={s} />
            )}
            <div style={{ flex: 1, position: 'relative' }}>
              <svg ref={svgRef} width={width} height={chartHeight + MARGIN.top + MARGIN.bottom}>
                <defs>
                  <clipPath id="chart-clip">
                    <rect x={0} y={0} width={chartWidth} height={chartHeight} />
                  </clipPath>
                </defs>
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  <Grid
                    xScale={xScale}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                    showGrid={showGrid}
                    gridColor={gridColor}
                    gridThickness={gridThickness}
                  />
                  <AlertZonesOverlay
                    zones={alertZones}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                    s={s}
                  />

                  {/* Render lines and optional areas — clipped to chart bounds */}
                  <g clipPath="url(#chart-clip)">
                  {activeMetrics.map((m, i) => {
                    const color = m.color ?? getMetricColor(i);
                    const metricLineGen = line<DataPoint>()
                      .defined((d) => d[m.key] !== undefined && d[m.key] !== null)
                      .x((d) => xScale(new Date(d.timestamp)))
                      .y((d) => yScale(Number(d[m.key]) || 0));

                    const metricAreaGen = area<DataPoint>()
                      .defined((d) => d[m.key] !== undefined && d[m.key] !== null)
                      .x((d) => xScale(new Date(d.timestamp)))
                      .y0(chartHeight)
                      .y1((d) => yScale(Number(d[m.key]) || 0));

                    return (
                      <g key={m.key}>
                        {showArea && (
                          <path
                            d={metricAreaGen(visibleData) ?? ''}
                            fill={areaColor ?? color}
                            opacity={0.15}
                          />
                        )}
                        <path
                          d={metricLineGen(visibleData) ?? ''}
                          fill="none"
                          stroke={color}
                          strokeWidth={s(2)}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                  </g>

                  {/* Hover crosshair */}
                  {tooltipData && (
                    <line
                      x1={tooltipData.x - MARGIN.left}
                      x2={tooltipData.x - MARGIN.left}
                      y1={0}
                      y2={chartHeight}
                      stroke="var(--relay-grid-color, #e0e0e0)"
                      strokeWidth={s(1)}
                      strokeDasharray="4,4"
                    />
                  )}

                  <XAxis xScale={xScale} height={chartHeight} style={resolvedStyles?.axis} tickFormat={tickFormat} s={s} />
                  <YAxis yScale={yScale} style={resolvedStyles?.axis} s={s} />

                  {/* Invisible overlay for mouse events */}
                  <rect
                    width={chartWidth}
                    height={chartHeight}
                    fill="transparent"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              </svg>
              <Tooltip
                data={tooltipData}
                containerWidth={width}
                containerHeight={height}
                formatValue={formatValue}
                renderTooltip={renderTooltip}
                style={resolvedStyles?.tooltip}
                s={s}
              />
            </div>
            {showLegend && legendPosition === 'bottom' && (
              <Legend items={legendItems} onSelect={handleSelectMetric} position="bottom" style={resolvedStyles?.legend} s={s} />
            )}
          </div>
        );
      }}
    </ResponsiveContainer>
  );
}
