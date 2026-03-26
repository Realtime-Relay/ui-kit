import { useState, useCallback, useMemo, useRef } from 'react';
import { scaleTime, scaleLinear, line, area, extent, bisector, pointer } from 'd3';
import type { DataPoint, MetricConfig, AlertZone, FontStyle, BackgroundStyle, DownsampleConfig } from '../utils/types';
import { resolveMetrics } from '../utils/metrics';
import { getMetricColor } from '../theme/palette';
import { applyDownsample } from '../utils/downsample';
import { defaultFormatValue } from '../utils/formatters';
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
}

const MARGIN = { top: 20, right: 20, bottom: 30, left: 50 };

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
}: TimeSeriesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string> | null>(null);

  // Resolve metrics from data if not provided
  const resolvedMetrics = useMemo(() => resolveMetrics(data, metricsProp), [data, metricsProp]);

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
    if (activeMetrics.length === 0) return data;
    // Downsample using first active metric as reference
    return applyDownsample(data, downsample, activeMetrics[0].key);
  }, [data, downsample, activeMetrics]);

  const handleToggleMetric = useCallback((key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev ?? Array.from(metricVisibility));
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [metricVisibility]);

  // Loading state
  if (showLoading && (!data || data.length === 0)) {
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
        const chartWidth = width - MARGIN.left - MARGIN.right;
        const chartHeight = height - MARGIN.top - MARGIN.bottom - (showLegend ? 30 : 0) - (title ? 24 : 0);

        if (chartWidth <= 0 || chartHeight <= 0) return null;

        // Scales — convert unix ms timestamps to Date objects for proper axis formatting
        const [tMin, tMax] = extent(downsampledData, (d) => d.timestamp) as [number, number];
        const xScale = scaleTime().domain([new Date(tMin), new Date(tMax)]).range([0, chartWidth]);

        let yMin = Infinity;
        let yMax = -Infinity;
        for (const d of downsampledData) {
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
          const idx = bisect(downsampledData, x0, 1);
          const d0 = downsampledData[idx - 1];
          const d1 = downsampledData[idx];

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
                  fontFamily: styles?.title?.fontFamily ?? 'var(--relay-font-family)',
                  fontSize: styles?.title?.fontSize ?? 14,
                  fontWeight: styles?.title?.fontWeight ?? 600,
                  color: styles?.title?.color,
                  padding: '4px 0',
                }}
              >
                {title}
              </div>
            )}
            {showLegend && legendPosition === 'top' && (
              <Legend items={legendItems} onToggle={handleToggleMetric} position="top" style={styles?.legend} />
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
                            d={metricAreaGen(downsampledData) ?? ''}
                            fill={areaColor ?? color}
                            opacity={0.15}
                          />
                        )}
                        <path
                          d={metricLineGen(downsampledData) ?? ''}
                          fill="none"
                          stroke={color}
                          strokeWidth={2}
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
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                  )}

                  <XAxis xScale={xScale} height={chartHeight} style={styles?.axis} />
                  <YAxis yScale={yScale} style={styles?.axis} />

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
                style={styles?.tooltip}
              />
            </div>
            {showLegend && legendPosition === 'bottom' && (
              <Legend items={legendItems} onToggle={handleToggleMetric} position="bottom" style={styles?.legend} />
            )}
          </div>
        );
      }}
    </ResponsiveContainer>
  );
}
