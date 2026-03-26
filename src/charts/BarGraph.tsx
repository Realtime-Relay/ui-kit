import { useState, useCallback, useMemo, useRef } from 'react';
import { scaleBand, scaleLinear, pointer } from 'd3';
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
  AlertZonesOverlay,
  XAxis,
  YAxis,
  ChartSkeleton,
} from './shared';

export interface BarGraphStyles {
  title?: FontStyle;
  axis?: FontStyle;
  legend?: FontStyle;
  tooltip?: FontStyle;
  background?: BackgroundStyle;
}

export interface BarGraphProps {
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
  styles?: BarGraphStyles;
  barWidth?: number;
  alertZones?: AlertZone[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom';
  showLoading?: boolean;
  downsample?: DownsampleConfig;
}

const MARGIN = { top: 20, right: 20, bottom: 30, left: 50 };

export function BarGraph({
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
  barWidth: barWidthProp,
  alertZones = [],
  showLegend = true,
  legendPosition = 'bottom',
  showLoading = true,
  downsample,
}: BarGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string> | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const resolvedMetrics = useMemo(() => resolveMetrics(data, metricsProp), [data, metricsProp]);

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

  const downsampledData = useMemo(() => {
    if (activeMetrics.length === 0) return data;
    return applyDownsample(data, downsample, activeMetrics[0].key);
  }, [data, downsample, activeMetrics]);

  const handleToggleMetric = useCallback((key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev ?? Array.from(metricVisibility));
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [metricVisibility]);

  if (showLoading && (!data || data.length === 0)) {
    return (
      <ResponsiveContainer>
        {({ width, height }) => <ChartSkeleton width={width} height={height} />}
      </ResponsiveContainer>
    );
  }

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

        // Band scale for x-axis (each data point gets a group of bars)
        const xScale = scaleBand<number>()
          .domain(downsampledData.map((_, i) => i))
          .range([0, chartWidth])
          .padding(0.2);

        // Metric sub-band within each group
        const metricScale = scaleBand<string>()
          .domain(activeMetrics.map((m) => m.key))
          .range([0, xScale.bandwidth()])
          .padding(0.05);

        // Y scale
        let yMin = 0;
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
        for (const zone of alertZones) {
          if (zone.min < yMin) yMin = zone.min;
          if (zone.max > yMax) yMax = zone.max;
        }
        const yPadding = (yMax - yMin) * 0.05 || 1;
        const yScale = scaleLinear()
          .domain([Math.min(0, yMin - yPadding), yMax + yPadding])
          .range([chartHeight, 0])
          .nice();

        // For the linear y-axis grid we can reuse Grid, but x-axis is band-based
        // so we draw grid lines manually for y only
        const yTicks = yScale.ticks();
        const gColor = gridColor ?? 'var(--relay-grid-color, #e0e0e0)';
        const gThick = gridThickness ?? 1;

        const computedBarWidth = barWidthProp
          ? Math.min(barWidthProp, metricScale.bandwidth())
          : metricScale.bandwidth();

        const handleBarHover = (
          dataIndex: number,
          metricKey: string,
          event: React.MouseEvent
        ) => {
          const d = downsampledData[dataIndex];
          const value = Number(d[metricKey]) || 0;
          const metricValues = activeMetrics.map((m, i) => ({
            key: m.key,
            label: m.label ?? m.key,
            color: m.color ?? getMetricColor(i),
            value: Number(d[m.key]) || 0,
          }));

          const [mx, my] = pointer(event.nativeEvent, svgRef.current!);
          setTooltipData({
            point: d,
            metrics: metricValues,
            x: mx,
            y: my,
          });
          setHoveredIndex(dataIndex);

          onHover?.(
            { metric: metricKey, value, timestamp: d.timestamp },
            event.nativeEvent
          );
        };

        const handleMouseLeave = (event: React.MouseEvent) => {
          const last = tooltipData?.metrics[0];
          setTooltipData(null);
          setHoveredIndex(null);
          onRelease?.(
            last
              ? { metric: last.key, value: last.value, timestamp: tooltipData!.point.timestamp }
              : null,
            event.nativeEvent
          );
        };

        // Format x tick labels as timestamps
        const formatXTick = (i: number) => {
          const d = downsampledData[i];
          if (!d) return '';
          return new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {/* Y grid lines */}
                  {showGrid && yTicks.map((tick) => (
                    <line
                      key={`yg-${tick}`}
                      x1={0} x2={chartWidth}
                      y1={yScale(tick)} y2={yScale(tick)}
                      stroke={gColor}
                      strokeWidth={gThick}
                      strokeDasharray="2,2"
                    />
                  ))}

                  <AlertZonesOverlay
                    zones={alertZones}
                    yScale={yScale}
                    width={chartWidth}
                    height={chartHeight}
                  />

                  {/* Bars */}
                  {downsampledData.map((d, dataIdx) =>
                    activeMetrics.map((m, metricIdx) => {
                      const color = m.color ?? getMetricColor(metricIdx);
                      const value = Number(d[m.key]) || 0;
                      const barX = (xScale(dataIdx) ?? 0) + (metricScale(m.key) ?? 0) +
                        (metricScale.bandwidth() - computedBarWidth) / 2;
                      const barY = value >= 0 ? yScale(value) : yScale(0);
                      const barHeight = Math.abs(yScale(value) - yScale(0));

                      return (
                        <rect
                          key={`${dataIdx}-${m.key}`}
                          x={barX}
                          y={barY}
                          width={computedBarWidth}
                          height={barHeight}
                          fill={color}
                          opacity={hoveredIndex === dataIdx ? 1 : 0.85}
                          rx={2}
                          onMouseMove={(e) => handleBarHover(dataIdx, m.key, e)}
                          onMouseLeave={handleMouseLeave}
                          style={{ cursor: 'pointer', transition: 'opacity 100ms ease' }}
                        />
                      );
                    })
                  )}

                  {/* X axis */}
                  <g transform={`translate(0,${chartHeight})`}>
                    <line x1={0} x2={chartWidth} stroke="var(--relay-grid-color, #e0e0e0)" />
                    {downsampledData.map((_, i) => {
                      const x = (xScale(i) ?? 0) + xScale.bandwidth() / 2;
                      // Show a subset of ticks to avoid crowding
                      const step = Math.max(1, Math.floor(downsampledData.length / 8));
                      if (i % step !== 0 && i !== downsampledData.length - 1) return null;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={20}
                          textAnchor="middle"
                          style={{
                            fontFamily: styles?.axis?.fontFamily ?? 'var(--relay-font-family)',
                            fontSize: styles?.axis?.fontSize ?? 11,
                            fill: styles?.axis?.color ?? 'currentColor',
                          }}
                        >
                          {formatXTick(i)}
                        </text>
                      );
                    })}
                  </g>
                  <YAxis yScale={yScale} style={styles?.axis} />
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
